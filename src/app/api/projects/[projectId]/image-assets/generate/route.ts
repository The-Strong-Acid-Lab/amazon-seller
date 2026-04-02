import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import OpenAI from "openai";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type GenerateImagePayload = {
  slot?: string;
  goal?: string;
  message?: string;
  supportingProof?: string;
  visualDirection?: string;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function sanitizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function toSafePathSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "slot";
}

function buildPrompts({
  slot,
  goal,
  message,
  supportingProof,
  visualDirection,
}: {
  slot: string;
  goal: string;
  message: string;
  supportingProof: string;
  visualDirection: string;
}) {
  const promptZh = [
    `你是亚马逊电商视觉设计助手。请为 ${slot} 生成一张可用于商品图方案评估的草图。`,
    "风格要求：写实产品摄影风格，构图清晰，突出产品主体和卖点，不做夸张特效。",
    "目标：",
    goal || "突出该槽位核心卖点。",
    "核心信息：",
    message || "体现产品价值点。",
    "支撑证据：",
    supportingProof || "基于评论中的高频诉求。",
    "视觉方向：",
    visualDirection || "简洁、可信、易读。",
    "限制：不要出现品牌 Logo、商标、夸大医疗承诺、误导性对比文案。",
    "输出：一张高质量商品图草稿。",
  ].join("\n");

  const promptEn = [
    `Create one Amazon listing image draft for slot "${slot}".`,
    "Style: realistic product photography, clean composition, strong subject focus.",
    "Identity lock: keep the exact same product identity as the reference image (shape, structure, and color family).",
    "If textual instructions conflict with the reference image, prioritize the reference product identity.",
    "No text, no letters, no logos, and no watermark.",
    "Goal:",
    goal || "Highlight the key value proposition for this slot.",
    "Core message:",
    message || "Communicate product value clearly.",
    "Supporting proof:",
    supportingProof || "Ground in recurring customer feedback.",
    "Visual direction:",
    visualDirection || "Clean, credible, and easy to scan.",
    "Constraints: no logos, no trademark text, no exaggerated medical claims, no misleading comparisons.",
    "Output one high-quality draft image.",
  ].join("\n");

  return {
    promptZh,
    promptEn,
  };
}

type ImageGenerationResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

async function responseToImageBuffer(response: ImageGenerationResponse) {
  const generated = response.data?.[0];

  if (!generated) {
    throw new Error("Image model returned empty result.");
  }

  if (generated.b64_json) {
    return Buffer.from(generated.b64_json, "base64");
  }

  if (generated.url) {
    const imageResponse = await fetch(generated.url);

    if (!imageResponse.ok) {
      throw new Error("Failed to fetch generated image URL.");
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("Image model response does not contain image data.");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => null)) as GenerateImagePayload | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const slot = sanitizeText(body.slot);
    const goal = sanitizeText(body.goal);
    const message = sanitizeText(body.message);
    const supportingProof = sanitizeText(body.supportingProof);
    const visualDirection = sanitizeText(body.visualDirection);

    if (!slot) {
      return NextResponse.json({ error: "Slot is required." }, { status: 400 });
    }

    const [
      { data: project, error: projectError },
      { data: latestReport, error: reportError },
      { data: latestTargetReferenceImage, error: targetReferenceError },
    ] =
      await Promise.all([
        supabase.from("projects").select("id").eq("id", projectId).maybeSingle(),
        supabase
          .from("analysis_reports")
          .select("id")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("product_reference_images")
          .select("id, file_name")
          .eq("project_id", projectId)
          .eq("role", "target")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (projectError || !project) {
      return NextResponse.json(
        { error: projectError?.message ?? "Project not found." },
        { status: 404 },
      );
    }

    if (reportError) {
      throw new Error(reportError.message);
    }

    if (targetReferenceError) {
      if (targetReferenceError.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "数据库结构尚未更新，请先执行 `supabase db push`（缺少 product_reference_images）。",
          },
          { status: 500 },
        );
      }
      throw new Error(targetReferenceError.message);
    }

    if (!latestTargetReferenceImage) {
      return NextResponse.json(
        { error: "请先上传至少 1 张我的商品图片，再生成草图。" },
        { status: 400 },
      );
    }

    const { data: latestVersionRow, error: latestVersionError } = await supabase
      .from("image_assets")
      .select("version")
      .eq("project_id", projectId)
      .eq("slot", slot)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestVersionError) {
      if (latestVersionError.code === "42P01") {
        return NextResponse.json(
          {
            error: "数据库结构尚未更新，请先执行 `supabase db push`（缺少 image_assets）。",
          },
          { status: 500 },
        );
      }
      throw new Error(latestVersionError.message);
    }

    const version = (latestVersionRow?.version ?? 0) + 1;
    const { promptZh, promptEn } = buildPrompts({
      slot,
      goal,
      message,
      supportingProof,
      visualDirection,
    });

    const openai = new OpenAI({
      apiKey: requireEnv("OPENAI_API_KEY"),
    });
    const modelName = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
    const generation = (await openai.images.generate({
      model: modelName,
      prompt: [
        promptEn,
        "",
        "Reference constraints:",
        `The product identity should remain close to the uploaded reference image: ${latestTargetReferenceImage.file_name}.`,
        "Do not change product category or core structure.",
        "No text, no letters, no logo, no watermark.",
      ].join("\n"),
      size: "1024x1024",
    })) as ImageGenerationResponse;

    const imageBuffer = await responseToImageBuffer(generation);
    const bucket = "listing-images";
    const slotKey = toSafePathSegment(slot);
    const imageHash = createHash("sha256").update(imageBuffer).digest("hex").slice(0, 16);
    const storagePath = `projects/${projectId}/${slotKey}/v${version}-${imageHash}.png`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload generated image.");
    }

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;

    const { data: insertedAsset, error: insertError } = await supabase
      .from("image_assets")
      .insert({
        project_id: projectId,
        analysis_report_id: latestReport?.id ?? null,
        slot,
        goal,
        message,
        supporting_proof: supportingProof,
        visual_direction: visualDirection,
        prompt_zh: promptZh,
        prompt_en: promptEn,
        model_name: modelName,
        status: "generated",
        storage_bucket: bucket,
        storage_path: storagePath,
        image_url: publicUrl,
        width: 1024,
        height: 1024,
        is_kept: false,
        version,
      })
      .select(
        "id, project_id, slot, goal, message, supporting_proof, visual_direction, prompt_zh, prompt_en, model_name, status, storage_bucket, storage_path, image_url, width, height, error_message, is_kept, version, created_at, updated_at",
      )
      .single();

    if (insertError || !insertedAsset) {
      if (insertError?.code === "42P01") {
        return NextResponse.json(
          {
            error: "数据库结构尚未更新，请先执行 `supabase db push`（缺少 image_assets）。",
          },
          { status: 500 },
        );
      }
      throw new Error(insertError?.message ?? "Failed to insert generated asset.");
    }

    return NextResponse.json({ asset: insertedAsset });
  } catch (error) {
    console.error("Image generation failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate image.",
      },
      { status: 500 },
    );
  }
}
