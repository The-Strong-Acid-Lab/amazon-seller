import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId } = await context.params;
    const formData = await request.formData();
    const projectProductId = String(formData.get("projectProductId") ?? "").trim();
    const imageFile = formData.get("file");

    if (!projectProductId) {
      return NextResponse.json({ error: "projectProductId is required." }, { status: 400 });
    }

    if (!(imageFile instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are supported." }, { status: 400 });
    }

    const { data: projectProduct, error: projectProductError } = await supabase
      .from("project_products")
      .select("id, project_id, role")
      .eq("id", projectProductId)
      .eq("project_id", projectId)
      .single();

    if (projectProductError || !projectProduct) {
      return NextResponse.json(
        { error: projectProductError?.message ?? "Project product not found." },
        { status: 404 },
      );
    }

    if (projectProduct.role === "target" && imageFile.type !== "image/png") {
      return NextResponse.json(
        { error: "我的商品参考图当前仅支持 PNG 格式。请上传 PNG 文件。" },
        { status: 400 },
      );
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const fileHash = createHash("sha256").update(imageBuffer).digest("hex");

    const { data: existingImage, error: existingImageError } = await supabase
      .from("product_reference_images")
      .select(
        "id, project_id, project_product_id, role, file_name, file_hash, storage_bucket, storage_path, image_url, mime_type, size_bytes, created_at",
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
    const extension = inferExtension(imageFile.name, imageFile.type);
    const storagePath = `projects/${projectId}/${projectProductId}/${fileHash}${extension}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, imageBuffer, {
      contentType: imageFile.type || undefined,
      upsert: true,
    });

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload reference image.");
    }

    const imageUrl = supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;

    const { data: insertedImage, error: insertError } = await supabase
      .from("product_reference_images")
      .insert({
        project_id: projectId,
        project_product_id: projectProductId,
        role: projectProduct.role,
        file_name: imageFile.name,
        file_hash: fileHash,
        storage_bucket: bucket,
        storage_path: storagePath,
        image_url: imageUrl,
        mime_type: imageFile.type || null,
        size_bytes: imageBuffer.length,
      })
      .select(
        "id, project_id, project_product_id, role, file_name, file_hash, storage_bucket, storage_path, image_url, mime_type, size_bytes, created_at",
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
      { status: 500 },
    );
  }
}
