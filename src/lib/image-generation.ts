import { createHash } from "node:crypto";

import {
  createPartFromBase64,
  GoogleGenAI,
  Modality,
} from "@google/genai";
import OpenAI, { toFile } from "openai";

import {
  getConfiguredImageModelName,
  getImageGenerationProvider,
} from "@/lib/image-generation-provider";
import { reviewGeneratedImageIdentity } from "@/lib/image-identity-review";
import { localizeImagePromptToEnglish } from "@/lib/image-prompt-localization";
import {
  buildReferenceImageSignature,
  generateProductIdentityProfile,
} from "@/lib/product-identity-profile";
import { selectReferenceImagesForEdit } from "@/lib/reference-image-selection";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type ImageGenerationPayload = {
  slot?: string;
  goal?: string;
  message?: string;
  supportingProof?: string;
  recommendedOverlayCopy?: string;
  visualDirection?: string;
  complianceNotes?: string;
  promptOverride?: string;
  imageProvider?: "openai" | "gemini";
  imageModel?: string;
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
  recommendedOverlayCopy,
  visualDirection,
  complianceNotes,
}: {
  slot: string;
  goal: string;
  message: string;
  supportingProof: string;
  recommendedOverlayCopy: string;
  visualDirection: string;
  complianceNotes: string;
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
    "建议图上文案（仅供后续排版参考，不要直接在图里渲染文字）：",
    recommendedOverlayCopy || "不强制叠字。",
    "视觉方向：",
    visualDirection || "简洁、可信、易读。",
    "合规限制：",
    complianceNotes || "不要出现品牌 Logo、商标、夸大医疗承诺、误导性对比文案。",
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
    "Recommended on-image copy (for later layout guidance only; do not render text in the image):",
    recommendedOverlayCopy || "No required overlay copy.",
    "Visual direction:",
    visualDirection || "Clean, credible, and easy to scan.",
    "Compliance notes:",
    complianceNotes || "No logos, no trademark text, no exaggerated medical claims, no misleading comparisons.",
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

async function urlToUploadableFile(imageUrl: string, fileName: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch reference image: ${fileName}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/png";

  return toFile(Buffer.from(arrayBuffer), fileName, {
    type: contentType,
  });
}

async function urlToInlineImageData(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("Failed to fetch reference image.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/png";

  return {
    mimeType: contentType,
    data: Buffer.from(arrayBuffer).toString("base64"),
  };
}

async function generateImageWithGemini({
  modelName,
  prompt,
  referenceImages,
}: {
  modelName: string;
  prompt: string;
  referenceImages: Array<{ imageUrl: string }>;
}) {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY (or GOOGLE_GENAI_API_KEY) for Gemini image generation.",
    );
  }

  const imageParts = await Promise.all(
    referenceImages.map(async (image) => {
      const inlineData = await urlToInlineImageData(image.imageUrl);

      return createPartFromBase64(inlineData.data, inlineData.mimeType);
    }),
  );

  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: modelName,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, ...imageParts],
      },
    ],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find((part) => {
    const mimeType = part.inlineData?.mimeType || "";

    return mimeType.startsWith("image/");
  });

  const base64Image = imagePart?.inlineData?.data || null;

  if (!base64Image) {
    throw new Error("Gemini did not return an image.");
  }

  return Buffer.from(base64Image, "base64");
}

async function updateImageGenerationRun(runId: string, values: Record<string, unknown>) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("image_generation_runs")
    .update(values)
    .eq("id", runId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function executeImageGenerationForSlot({
  projectId,
  runId,
  payload,
}: {
  projectId: string;
  runId: string;
  payload: ImageGenerationPayload;
}) {
  const supabase = createAdminSupabaseClient();

  const slot = sanitizeText(payload.slot);
  const goal = sanitizeText(payload.goal);
  const message = sanitizeText(payload.message);
  const supportingProof = sanitizeText(payload.supportingProof);
  const recommendedOverlayCopy = sanitizeText(payload.recommendedOverlayCopy);
  const visualDirection = sanitizeText(payload.visualDirection);
  const complianceNotes = sanitizeText(payload.complianceNotes);
  const promptOverride = sanitizeText(payload.promptOverride);

  if (!slot) {
    throw new Error("Slot is required.");
  }

  await updateImageGenerationRun(runId, {
    status: "running",
    stage: "preparing_assets",
    progress: 10,
    started_at: new Date().toISOString(),
    completed_at: null,
    error_message: null,
  });

  const [
    { data: project, error: projectError },
    { data: latestReport, error: reportError },
    { data: targetReferenceImages, error: targetReferenceError },
    { data: allReferenceImages, error: allReferenceImagesError },
    { data: identityProfile, error: identityProfileError },
    { data: targetProduct, error: targetProductError },
  ] = await Promise.all([
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
      .select("id, file_name, image_url")
      .eq("project_id", projectId)
      .eq("role", "target")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("product_reference_images")
      .select("project_product_id, role, file_hash")
      .eq("project_id", projectId),
    supabase
      .from("product_identity_profiles")
      .select(
        "status, reference_signature, product_type, category, primary_color, materials, signature_features, must_keep, must_not_change, identity_summary",
      )
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("project_products")
      .select("id, name")
      .eq("project_id", projectId)
      .eq("role", "target")
      .maybeSingle(),
  ]);

  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Project not found.");
  }

  if (reportError) {
    throw new Error(reportError.message);
  }

  if (targetProductError) {
    throw new Error(targetProductError.message);
  }

  if (targetReferenceError) {
    if (targetReferenceError.code === "42P01") {
      throw new Error(
        "数据库结构尚未更新，请先执行 `supabase db push`（缺少 product_reference_images）。",
      );
    }

    throw new Error(targetReferenceError.message);
  }

  if (allReferenceImagesError) {
    if (allReferenceImagesError.code === "42P01") {
      throw new Error(
        "数据库结构尚未更新，请先执行 `supabase db push`（缺少 product_reference_images）。",
      );
    }

    throw new Error(allReferenceImagesError.message);
  }

  if (identityProfileError) {
    if (identityProfileError.code === "42P01") {
      throw new Error(
        "数据库结构尚未更新，请先执行 `supabase db push`（缺少 product_identity_profiles）。",
      );
    }

    throw new Error(identityProfileError.message);
  }

  if (!targetReferenceImages || targetReferenceImages.length === 0) {
    throw new Error("请先上传至少 1 张我的商品图片，再生成方案图。");
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
      throw new Error(
        "数据库结构尚未更新，请先执行 `supabase db push`（缺少 image_assets）。",
      );
    }

    throw new Error(latestVersionError.message);
  }

  const version = (latestVersionRow?.version ?? 0) + 1;
  const openai = new OpenAI({
    apiKey: requireEnv("OPENAI_API_KEY"),
  });
  const imageProvider =
    payload.imageProvider && ["openai", "gemini"].includes(payload.imageProvider)
      ? payload.imageProvider
      : getImageGenerationProvider();
  const modelName = sanitizeText(payload.imageModel) || getConfiguredImageModelName();
  const promptModel = process.env.OPENAI_MODEL || "gpt-5-mini";
  const basePrompts = buildPrompts({
    slot,
    goal,
    message,
    supportingProof,
    recommendedOverlayCopy,
    visualDirection,
    complianceNotes,
  });
  const { promptZh, promptEn } = promptOverride
    ? await (async () => {
        const localizedOverride = await localizeImagePromptToEnglish({
          client: openai,
          model: promptModel,
          slot,
          prompt: promptOverride,
        });

        return {
          promptZh: [
            basePrompts.promptZh,
            "",
            "用户补充要求：",
            localizedOverride.promptZh,
            "",
            "执行规则：如果用户补充要求与商品真实结构、商品身份或平台合规限制冲突，优先保持真实商品和合规要求。",
          ].join("\n"),
          promptEn: [
            basePrompts.promptEn,
            "",
            "User refinements:",
            localizedOverride.promptEn,
            "",
            "Execution rule: apply the user refinements only when they do not conflict with the real product identity, structural relationships, or compliance constraints.",
          ].join("\n"),
        };
      })()
    : basePrompts;
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
  let effectiveIdentityProfile = identityProfile;

  if (
    !effectiveIdentityProfile ||
    effectiveIdentityProfile.status !== "confirmed" ||
    effectiveIdentityProfile.reference_signature !== referenceSignature
  ) {
    if (!targetProduct) {
      throw new Error("当前项目没有我的商品。");
    }

    await updateImageGenerationRun(runId, {
      stage: "identifying_product",
      progress: 25,
    });

    const generatedIdentityProfile = await generateProductIdentityProfile({
      client: openai,
      model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini",
      targetName: targetProduct.name ?? "未命名我的商品",
      referenceImages: targetReferenceImages
        .filter((image): image is { id: string; file_name: string; image_url: string } =>
          typeof image.image_url === "string" && image.image_url.length > 0,
        )
        .map((image) => ({
          fileName: image.file_name,
          imageUrl: image.image_url,
        })),
    });

    const { data: insertedIdentityProfile, error: upsertIdentityProfileError } = await supabase
      .from("product_identity_profiles")
      .upsert(
        {
          project_id: projectId,
          project_product_id: targetProduct.id,
          status: "confirmed",
          reference_signature: referenceSignature,
          source_image_count: targetReferenceImages.length,
          product_type: generatedIdentityProfile.product_type,
          category: generatedIdentityProfile.category,
          primary_color: generatedIdentityProfile.primary_color,
          materials: generatedIdentityProfile.materials,
          signature_features: generatedIdentityProfile.signature_features,
          must_keep: generatedIdentityProfile.must_keep,
          can_change: generatedIdentityProfile.can_change,
          must_not_change: generatedIdentityProfile.must_not_change,
          identity_summary: generatedIdentityProfile.identity_summary,
        },
        {
          onConflict: "project_id,project_product_id",
        },
      )
      .select(
        "status, reference_signature, product_type, category, primary_color, materials, signature_features, must_keep, must_not_change, identity_summary",
      )
      .single();

    if (upsertIdentityProfileError) {
      if (upsertIdentityProfileError.code === "42P01") {
        throw new Error(
          "数据库结构尚未更新，请先执行 `supabase db push`（缺少 product_identity_profiles）。",
        );
      }

      throw new Error(upsertIdentityProfileError.message);
    }

    effectiveIdentityProfile = insertedIdentityProfile;
  }

  await updateImageGenerationRun(runId, {
    stage: "generating_image",
    progress: 55,
  });

  const referenceCandidates = targetReferenceImages
    .filter((image): image is { id: string; file_name: string; image_url: string } =>
      typeof image.image_url === "string" && image.image_url.length > 0,
    )
    .map((image) => ({
      id: image.id,
      fileName: image.file_name,
      imageUrl: image.image_url,
    }));

  const selectedReferences = await selectReferenceImagesForEdit({
    client: openai,
    model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini",
    slotTitle: slot,
    goal,
    message,
    identitySummary:
      effectiveIdentityProfile.identity_summary ||
      effectiveIdentityProfile.product_type ||
      effectiveIdentityProfile.category ||
      "",
    referenceImages: referenceCandidates,
    maxSelected: 5,
  });

  const selectedReferenceFiles = referenceCandidates.filter((image) =>
    selectedReferences.selected_file_names.includes(image.fileName),
  );

  const editReferenceImages = selectedReferenceFiles.length > 0 ? selectedReferenceFiles : referenceCandidates.slice(0, 4);

  if (editReferenceImages.length === 0) {
    throw new Error("我的商品素材图不可用，请重新上传后再生成方案图。");
  }
  const generationPrompt = (
    promptOverride
      ? [
          promptEn,
          "",
          "Edit instructions:",
          "Use the uploaded product photos as the visual source of truth.",
          `The product identity must remain the same across the selected reference images: ${editReferenceImages
            .map((image) => image.fileName)
            .join(", ")}.`,
          "Do not replace the product with a similar product.",
          "Preserve product category, silhouette, structure, material impression, and color family.",
          "Preserve the real structural relationships shown in the reference images.",
          "Keep separate components separate when they are separate in the reference product.",
          "Keep integrated components integrated when they are integrated in the reference product.",
          "Do not merge distinct product parts into one shape.",
          "Do not split connected product parts into separate objects.",
          `Product type: ${effectiveIdentityProfile.product_type || effectiveIdentityProfile.category || "unknown"}.`,
          `Primary color / material: ${effectiveIdentityProfile.primary_color || "unknown"}.`,
          `Identity summary: ${effectiveIdentityProfile.identity_summary || "Keep the same product identity."}`,
          `Must keep: ${Array.isArray(effectiveIdentityProfile.must_keep) ? effectiveIdentityProfile.must_keep.join("; ") : ""}.`,
          `Must not change: ${
            Array.isArray(effectiveIdentityProfile.must_not_change)
              ? effectiveIdentityProfile.must_not_change.join("; ")
              : ""
          }.`,
        ]
      : [
          promptEn,
          "",
          "Edit instructions:",
          "Use the uploaded product photos as the visual source of truth.",
          `The product identity must remain the same across the selected reference images: ${editReferenceImages
            .map((image) => image.fileName)
            .join(", ")}.`,
          "Do not replace the product with a similar product.",
          "Preserve product category, silhouette, structure, material impression, and color family.",
          "Preserve the real structural relationships shown in the reference images.",
          "Keep separate components separate when they are separate in the reference product.",
          "Keep integrated components integrated when they are integrated in the reference product.",
          "Do not merge distinct product parts into one shape.",
          "Do not split connected product parts into separate objects.",
          `Product type: ${effectiveIdentityProfile.product_type || effectiveIdentityProfile.category || "unknown"}.`,
          `Primary color / material: ${effectiveIdentityProfile.primary_color || "unknown"}.`,
          `Identity summary: ${effectiveIdentityProfile.identity_summary || "Keep the same product identity."}`,
          `Must keep: ${Array.isArray(effectiveIdentityProfile.must_keep) ? effectiveIdentityProfile.must_keep.join("; ") : ""}.`,
          `Must not change: ${
            Array.isArray(effectiveIdentityProfile.must_not_change)
              ? effectiveIdentityProfile.must_not_change.join("; ")
              : ""
          }.`,
          "No text, no letters, no logo, no watermark.",
        ]
  ).join("\n");

  const imageBuffer =
    imageProvider === "gemini"
      ? await generateImageWithGemini({
          modelName,
          prompt: generationPrompt,
          referenceImages: editReferenceImages,
        })
      : await (async () => {
          const referenceFiles = await Promise.all(
            editReferenceImages.map((image) =>
              urlToUploadableFile(image.imageUrl, image.fileName),
            ),
          );

          const generation = (await openai.images.edit({
            model: modelName,
            image: referenceFiles,
            input_fidelity: "high",
            quality: "medium",
            output_format: "png",
            size: "1024x1024",
            prompt: generationPrompt,
            n: 1,
          })) as ImageGenerationResponse;

          return responseToImageBuffer(generation);
        })();
  const bucket = "listing-images";
  const slotKey = toSafePathSegment(slot);
  const imageHash = createHash("sha256").update(imageBuffer).digest("hex").slice(0, 16);
  const storagePath = `projects/${projectId}/${slotKey}/v${version}-${imageHash}.png`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload generated image.");
  }

  const publicUrl = supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;

  await updateImageGenerationRun(runId, {
    stage: "reviewing_identity",
    progress: 80,
  });

  const reviewModel = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini";
  const identityReview = await reviewGeneratedImageIdentity({
    client: openai,
    model: reviewModel,
    slotTitle: slot,
    goal,
    generatedImageUrl: publicUrl,
    referenceImages: targetReferenceImages
      .filter((image): image is { id: string; file_name: string; image_url: string } =>
        typeof image.image_url === "string" && image.image_url.length > 0,
      )
      .map((image) => ({
        fileName: image.file_name,
        imageUrl: image.image_url,
      })),
  });
  const validationError = identityReview.passes
    ? null
    : `商品一致性校验未通过（${identityReview.score}/100）：${
        identityReview.critical_mismatch || identityReview.summary
      }`;

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
      status: identityReview.passes ? "generated" : "failed",
      storage_bucket: bucket,
      storage_path: storagePath,
      image_url: publicUrl,
      width: 1024,
      height: 1024,
      error_message: validationError,
      is_kept: false,
      version,
    })
    .select(
      "id, project_id, slot, goal, message, supporting_proof, visual_direction, prompt_zh, prompt_en, model_name, status, storage_bucket, storage_path, image_url, width, height, error_message, is_kept, version, created_at, updated_at",
    )
    .single();

  if (insertError || !insertedAsset) {
    if (insertError?.code === "42P01") {
      throw new Error("数据库结构尚未更新，请先执行 `supabase db push`（缺少 image_assets）。");
    }

    throw new Error(insertError?.message ?? "Failed to insert generated asset.");
  }

  await updateImageGenerationRun(runId, {
    status: identityReview.passes ? "completed" : "failed",
    stage: identityReview.passes ? "completed" : "failed",
    progress: identityReview.passes ? 100 : 100,
    completed_at: new Date().toISOString(),
    error_message: validationError,
    image_asset_id: insertedAsset.id,
  });

  if (!identityReview.passes) {
    throw new Error(validationError ?? "商品一致性校验未通过。");
  }

  return {
    asset: insertedAsset,
  };
}
