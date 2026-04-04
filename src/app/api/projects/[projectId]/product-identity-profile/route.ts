import { NextResponse } from "next/server";
import OpenAI from "openai";

import {
  buildReferenceImageSignature,
  generateProductIdentityProfile,
  type ProductIdentityProfileShape,
} from "@/lib/product-identity-profile";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function sanitizeProfilePayload(value: unknown): ProductIdentityProfileShape {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const toString = (input: unknown) => (typeof input === "string" ? input.trim() : "");
  const toStringArray = (input: unknown) =>
    Array.isArray(input)
      ? input
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  return {
    product_type: toString(record.product_type),
    category: toString(record.category),
    primary_color: toString(record.primary_color),
    materials: toStringArray(record.materials),
    signature_features: toStringArray(record.signature_features),
    must_keep: toStringArray(record.must_keep),
    can_change: toStringArray(record.can_change),
    must_not_change: toStringArray(record.must_not_change),
    identity_summary: toString(record.identity_summary),
  };
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId } = await context.params;

    const [
      { data: targetProduct, error: targetProductError },
      { data: referenceImages, error: referenceImagesError },
      { data: allReferenceImages, error: allReferenceImagesError },
    ] = await Promise.all([
      supabase
        .from("project_products")
        .select("id, name")
        .eq("project_id", projectId)
        .eq("role", "target")
        .maybeSingle(),
      supabase
        .from("product_reference_images")
        .select("file_name, image_url")
        .eq("project_id", projectId)
        .eq("role", "target")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("product_reference_images")
        .select("project_product_id, role, file_hash")
        .eq("project_id", projectId),
    ]);

    if (targetProductError) {
      throw new Error(targetProductError.message);
    }

    if (!targetProduct) {
      return NextResponse.json({ error: "当前项目没有我的商品。" }, { status: 400 });
    }

    if (referenceImagesError) {
      if (referenceImagesError.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "数据库结构尚未更新，请先执行 `supabase db push`（缺少 product_reference_images）。",
          },
          { status: 500 },
        );
      }

      throw new Error(referenceImagesError.message);
    }

    if (allReferenceImagesError) {
      if (allReferenceImagesError.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "数据库结构尚未更新，请先执行 `supabase db push`（缺少 product_reference_images）。",
          },
          { status: 500 },
        );
      }

      throw new Error(allReferenceImagesError.message);
    }

    const usableImages = (referenceImages ?? []).filter(
      (image): image is { file_name: string; image_url: string } =>
        typeof image.image_url === "string" && image.image_url.length > 0,
    );

    if (usableImages.length === 0) {
      return NextResponse.json(
        { error: "请先上传至少 1 张我的商品图片，再识别商品身份。" },
        { status: 400 },
      );
    }

    const client = new OpenAI({
      apiKey: requireEnv("OPENAI_API_KEY"),
    });
    const model = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini";
    const profile = await generateProductIdentityProfile({
      client,
      model,
      targetName: targetProduct.name ?? "未命名我的商品",
      referenceImages: usableImages.map((image) => ({
        fileName: image.file_name,
        imageUrl: image.image_url,
      })),
    });
    const referenceSignature = buildReferenceImageSignature(
      (allReferenceImages ?? []).filter(
        (
          image,
        ): image is { project_product_id: string; role: string; file_hash: string } =>
          typeof image.project_product_id === "string" &&
          typeof image.role === "string" &&
          typeof image.file_hash === "string",
      ),
    );

    const { data, error } = await supabase
      .from("product_identity_profiles")
      .upsert(
        {
          project_id: projectId,
          project_product_id: targetProduct.id,
          status: "draft",
          reference_signature: referenceSignature,
          source_image_count: usableImages.length,
          product_type: profile.product_type,
          category: profile.category,
          primary_color: profile.primary_color,
          materials: profile.materials,
          signature_features: profile.signature_features,
          must_keep: profile.must_keep,
          can_change: profile.can_change,
          must_not_change: profile.must_not_change,
          identity_summary: profile.identity_summary,
        },
        {
          onConflict: "project_id,project_product_id",
        },
      )
      .select(
        "id, project_id, project_product_id, status, reference_signature, source_image_count, product_type, category, primary_color, materials, signature_features, must_keep, can_change, must_not_change, identity_summary, created_at, updated_at",
      )
      .single();

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "数据库结构尚未更新，请先执行 `supabase db push`（缺少 product_identity_profiles）。",
          },
          { status: 500 },
        );
      }

      throw new Error(error.message);
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "识别商品身份失败。",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | { status?: "draft" | "confirmed"; profile?: Partial<ProductIdentityProfileShape> }
      | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("product_identity_profiles")
      .select(
        "id, project_id, project_product_id, status, reference_signature, source_image_count, product_type, category, primary_color, materials, signature_features, must_keep, can_change, must_not_change, identity_summary, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .maybeSingle();

    if (existingProfileError) {
      if (existingProfileError.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "数据库结构尚未更新，请先执行 `supabase db push`（缺少 product_identity_profiles）。",
          },
          { status: 500 },
        );
      }

      throw new Error(existingProfileError.message);
    }

    if (!existingProfile) {
      return NextResponse.json({ error: "请先识别商品身份。" }, { status: 400 });
    }

    const profilePatch = body.profile ? sanitizeProfilePayload(body.profile) : null;
    const nextStatus = body.status ?? existingProfile.status;

    const { data, error } = await supabase
      .from("product_identity_profiles")
      .update({
        status: nextStatus,
        ...(profilePatch
          ? {
              product_type: profilePatch.product_type,
              category: profilePatch.category,
              primary_color: profilePatch.primary_color,
              materials: profilePatch.materials,
              signature_features: profilePatch.signature_features,
              must_keep: profilePatch.must_keep,
              can_change: profilePatch.can_change,
              must_not_change: profilePatch.must_not_change,
              identity_summary: profilePatch.identity_summary,
            }
          : {}),
      })
      .eq("id", existingProfile.id)
      .select(
        "id, project_id, project_product_id, status, reference_signature, source_image_count, product_type, category, primary_color, materials, signature_features, must_keep, can_change, must_not_change, identity_summary, created_at, updated_at",
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "更新商品身份失败。",
      },
      { status: 500 },
    );
  }
}
