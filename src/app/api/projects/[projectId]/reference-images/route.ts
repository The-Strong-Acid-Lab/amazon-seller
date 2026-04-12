import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import OpenAI from "openai";

import { getConfiguredVisionModelName } from "@/lib/image-generation-provider";
import { classifyReferenceImage } from "@/lib/reference-image-classification";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

class ReferenceImageInputError extends Error {}

function inferExtension(fileName: string, mimeType: string) {
  const extensionMatch = fileName.toLowerCase().match(/\.[a-z0-9]+$/);

  if (extensionMatch?.[0]) {
    return extensionMatch[0];
  }

  if (mimeType.includes("png")) {
    return ".png";
  }

  if (mimeType.includes("webp")) {
    return ".webp";
  }

  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return ".jpg";
  }

  return ".bin";
}

function normalizeMimeType(mimeType: string | null | undefined) {
  return (mimeType || "").toLowerCase().split(";")[0]?.trim() || "";
}

function isSupportedImageMimeType(mimeType: string) {
  const normalized = normalizeMimeType(mimeType);

  return (
    normalized === "image/png" ||
    normalized === "image/jpeg" ||
    normalized === "image/jpg" ||
    normalized === "image/webp"
  );
}

function inferFileNameFromUrl(imageUrl: string, mimeType: string) {
  try {
    const parsedUrl = new URL(imageUrl);
    const pathname = parsedUrl.pathname.split("/").filter(Boolean).at(-1) || "reference-image";

    if (/\.[a-z0-9]+$/i.test(pathname)) {
      return pathname;
    }

    return `${pathname}${inferExtension(pathname, mimeType)}`;
  } catch {
    return `reference-image${inferExtension("reference-image", mimeType)}`;
  }
}

async function parseReferenceImageInput(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | { projectProductId?: string; imageUrl?: string }
      | null;
    const projectProductId = String(body?.projectProductId ?? "").trim();
    const imageUrl = String(body?.imageUrl ?? "").trim();

    if (!projectProductId) {
      throw new ReferenceImageInputError("projectProductId is required.");
    }

    if (!imageUrl) {
      throw new ReferenceImageInputError("imageUrl is required.");
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      throw new ReferenceImageInputError("图片 URL 无效。");
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new ReferenceImageInputError("图片 URL 仅支持 http 或 https。");
    }

    const response = await fetch(parsedUrl, {
      headers: {
        "User-Agent": "amazon-seller-reference-import/1.0",
      },
    });

    if (!response.ok) {
      throw new ReferenceImageInputError("无法下载这张图片 URL。");
    }

    const mimeType = normalizeMimeType(response.headers.get("content-type"));

    if (!mimeType.startsWith("image/")) {
      throw new ReferenceImageInputError("提供的 URL 不是图片资源。");
    }

    if (!isSupportedImageMimeType(mimeType)) {
      throw new ReferenceImageInputError("当前仅支持 PNG、JPG/JPEG、WEBP 图片 URL。");
    }

    return {
      projectProductId,
      fileName: inferFileNameFromUrl(imageUrl, mimeType),
      mimeType,
      imageBuffer: Buffer.from(await response.arrayBuffer()),
    };
  }

  const formData = await request.formData();
  const projectProductId = String(formData.get("projectProductId") ?? "").trim();
  const imageFile = formData.get("file");

  if (!projectProductId) {
    throw new ReferenceImageInputError("projectProductId is required.");
  }

  if (!(imageFile instanceof File)) {
    throw new ReferenceImageInputError("Image file is required.");
  }

  const mimeType = normalizeMimeType(imageFile.type);

  if (!mimeType.startsWith("image/")) {
    throw new ReferenceImageInputError("Only image files are supported.");
  }

  if (!isSupportedImageMimeType(mimeType)) {
    throw new ReferenceImageInputError("当前仅支持 PNG、JPG/JPEG、WEBP 图片上传。");
  }

  return {
    projectProductId,
    fileName: imageFile.name,
    mimeType,
    imageBuffer: Buffer.from(await imageFile.arrayBuffer()),
  };
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId } = await context.params;
    const { projectProductId, fileName, mimeType, imageBuffer } =
      await parseReferenceImageInput(request);

    const { data: projectProduct, error: projectProductError } = await supabase
      .from("project_products")
      .select("id, project_id, role, name")
      .eq("id", projectProductId)
      .eq("project_id", projectId)
      .single();

    if (projectProductError || !projectProduct) {
      return NextResponse.json(
        { error: projectProductError?.message ?? "Project product not found." },
        { status: 404 },
      );
    }

    const { data: pinnedMainImage, error: pinnedMainImageError } = await supabase
      .from("product_reference_images")
      .select("id")
      .eq("project_id", projectId)
      .eq("project_product_id", projectProductId)
      .eq("pinned_for_main", true)
      .maybeSingle();

    if (pinnedMainImageError) {
      throw new Error(pinnedMainImageError.message);
    }

    const fileHash = createHash("sha256").update(imageBuffer).digest("hex");

    const { data: existingImage, error: existingImageError } = await supabase
      .from("product_reference_images")
      .select(
        "id, project_id, project_product_id, role, file_name, file_hash, storage_bucket, storage_path, image_url, mime_type, size_bytes, reference_kind, pinned_for_main, created_at",
      )
      .eq("project_id", projectId)
      .eq("project_product_id", projectProductId)
      .eq("file_hash", fileHash)
      .limit(1)
      .maybeSingle();

    if (existingImageError) {
      throw new Error(existingImageError.message);
    }

    if (existingImage) {
      return NextResponse.json({
        image: existingImage,
        deduplicated: true,
      });
    }

    const bucket = "product-reference-images";
    const extension = inferExtension(fileName, mimeType);
    const storagePath = `projects/${projectId}/${projectProductId}/${fileHash}${extension}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, imageBuffer, {
      contentType: mimeType || undefined,
      upsert: true,
    });

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload reference image.");
    }

    const imageUrl = supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
    let referenceKind: Awaited<ReturnType<typeof classifyReferenceImage>>["reference_kind"] =
      projectProduct.role === "competitor" ? "competitor_inspiration" : "untyped";
    let pinnedForMain = false;

    try {
      const openai = new OpenAI({
        apiKey: requireEnv("OPENAI_API_KEY"),
      });
      const classification = await classifyReferenceImage({
        client: openai,
        model: getConfiguredVisionModelName(),
        role: projectProduct.role,
        productName: projectProduct.name ?? "未命名商品",
        fileName,
        imageUrl,
      });

      referenceKind = classification.reference_kind;
      pinnedForMain =
        projectProduct.role === "target" &&
        !pinnedMainImage &&
        classification.should_pin_for_main;
    } catch {
      referenceKind = projectProduct.role === "competitor" ? "competitor_inspiration" : "untyped";
      pinnedForMain = false;
    }

    const { data: insertedImage, error: insertError } = await supabase
      .from("product_reference_images")
      .insert({
        project_id: projectId,
        project_product_id: projectProductId,
        role: projectProduct.role,
        file_name: fileName,
        file_hash: fileHash,
        storage_bucket: bucket,
        storage_path: storagePath,
        image_url: imageUrl,
        mime_type: mimeType || null,
        size_bytes: imageBuffer.length,
        reference_kind: referenceKind,
        pinned_for_main: pinnedForMain,
      })
      .select(
        "id, project_id, project_product_id, role, file_name, file_hash, storage_bucket, storage_path, image_url, mime_type, size_bytes, reference_kind, pinned_for_main, created_at",
      )
      .single();

    if (insertError || !insertedImage) {
      throw new Error(insertError?.message ?? "Failed to save reference image.");
    }

    await supabase
      .from("product_identity_profiles")
      .update({
        status: "draft",
        reference_signature: "",
      })
      .eq("project_id", projectId);

    return NextResponse.json({
      image: insertedImage,
      deduplicated: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload reference image.",
      },
      { status: error instanceof ReferenceImageInputError ? 400 : 500 },
    );
  }
}
