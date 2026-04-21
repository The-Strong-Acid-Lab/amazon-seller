import OpenAI from "openai";

import { resolveProjectApiKey } from "@/lib/user-api-keys";

export type RebuildPromptPayload = {
  slotKey?: string;
  slotTitle?: string;
  purpose?: string;
  conversionGoal?: string;
  recommendedOverlayCopy?: string;
  evidence?: string;
  visualDirection?: string;
  complianceNotes?: string;
  currentPrompt?: string;
  referenceImageUrl?: string;
  language?: string;
};

export type RebuildPromptResult = {
  prompt: string;
  matchScore: number | null;
  mismatchNotes: string;
  canonicalPromptEn: string;
  language: string;
};

function sanitizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function requireOpenAiEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function enforceEditOnlyPrompt(prompt: string) {
  if (!prompt) {
    return prompt;
  }

  const bannedPatterns = [
    /请更换[图片图像素材]*/g,
    /请重新拍摄/g,
    /重新拍摄/g,
    /重拍/g,
    /更换图片/g,
    /更换素材/g,
    /replace the image/gi,
    /reshoot/gi,
    /retake/gi,
    /capture a new photo/gi,
  ];

  let next = prompt;

  for (const pattern of bannedPatterns) {
    next = next.replace(pattern, "edit and optimize the existing image");
  }

  return next;
}

function containsCjk(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function englishOrFallback(value: string, fallback: string) {
  return value && !containsCjk(value) ? value : fallback;
}

function hasStructuredPromptSections(prompt: string) {
  return [
    "Purpose",
    "Conversion Goal",
    "VOC / Market Evidence",
    "Recommended On-Image Copy",
    "Visual Direction",
    "Product Invariants",
    "Compliance",
    "Negative Constraints",
    "Final Visual Prompt",
  ].every((section) => prompt.includes(section));
}

function buildStructuredPrompt({
  slotTitle,
  purpose,
  conversionGoal,
  recommendedOverlayCopy,
  evidence,
  visualDirection,
  complianceNotes,
  modelAdjustment,
}: {
  slotTitle: string;
  purpose: string;
  conversionGoal: string;
  recommendedOverlayCopy: string;
  evidence: string;
  visualDirection: string;
  complianceNotes: string;
  modelAdjustment: string;
}) {
  const title = englishOrFallback(slotTitle, "Image Slot");
  const safePurpose = englishOrFallback(
    purpose,
    "Create a focused Amazon listing image for this slot.",
  );
  const safeConversionGoal = englishOrFallback(
    conversionGoal,
    "Make the target product value clear and easy to understand.",
  );
  const safeEvidence = englishOrFallback(
    evidence,
    "Use the current product reference and available market evidence.",
  );
  const safeOverlayCopy = englishOrFallback(
    recommendedOverlayCopy,
    "No required overlay copy.",
  );
  const safeVisualDirection = englishOrFallback(
    visualDirection,
    "Keep the product clear, realistic, and easy to inspect.",
  );
  const safeCompliance = englishOrFallback(
    complianceNotes,
    "Keep poses natural, avoid irrelevant decoration, do not let the scene overpower the product, and do not render text in the image.",
  );
  const safeModelAdjustment = englishOrFallback(modelAdjustment, "");
  const adjustment = safeModelAdjustment
    ? ` Apply this reference-image-specific correction: ${safeModelAdjustment}`
    : "";

  return [
    `${title}`,
    "",
    "Purpose",
    safePurpose,
    "",
    "Conversion Goal",
    safeConversionGoal,
    "",
    "VOC / Market Evidence",
    safeEvidence,
    "",
    "Recommended On-Image Copy",
    `${safeOverlayCopy} (handled outside image generation; do not render text in the image)`,
    "",
    "Visual Direction",
    safeVisualDirection,
    "",
    "Product Invariants",
    "Keep the uploaded product identity stable. Do not change category, silhouette, materials, hardware layout, or core structure.",
    "",
    "Compliance",
    safeCompliance,
    "",
    "Negative Constraints",
    "No text, no letters, no logo, no watermark, no fabricated accessories, no impossible geometry, no misleading before/after claims.",
    "",
    "Final Visual Prompt",
    `Create a polished Amazon listing base image for ${title}. The image should serve this purpose: ${safePurpose} The composition should support this conversion goal: ${safeConversionGoal} Ground the visual choices in this evidence: ${safeEvidence} Visual direction: ${safeVisualDirection}.${adjustment} Keep the real product identity intact and leave room for later layout overlays where appropriate.`,
  ].join("\n");
}

export async function rebuildImageSlotPrompt({
  projectId,
  payload,
}: {
  projectId: string;
  payload: RebuildPromptPayload;
}): Promise<RebuildPromptResult> {
  const slotKey = sanitizeText(payload.slotKey);
  const slotTitle = sanitizeText(payload.slotTitle);
  const purpose = sanitizeText(payload.purpose);
  const conversionGoal = sanitizeText(payload.conversionGoal);
  const recommendedOverlayCopy = sanitizeText(payload.recommendedOverlayCopy);
  const evidence = sanitizeText(payload.evidence);
  const visualDirection = sanitizeText(payload.visualDirection);
  const complianceNotes = sanitizeText(payload.complianceNotes);
  const currentPrompt = sanitizeText(payload.currentPrompt);
  const referenceImageUrl = sanitizeText(payload.referenceImageUrl);
  const language = sanitizeText(payload.language) || "zh-CN";

  if (!slotKey) {
    throw new Error("slotKey is required.");
  }

  const apiKey =
    (await resolveProjectApiKey(projectId, "openai")) ?? requireOpenAiEnv("OPENAI_API_KEY");
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "你是亚马逊商品图提示词重建器（含槽位匹配判断）。",
          "任务：先判断“当前参考图是否匹配目标槽位”，再重建可直接用于生图的最终 Prompt。",
          "要求：",
          "1) 修复语法、标点、中英混杂和病句；",
          "2) 不改变原始业务意图和合规约束；",
          "3) 保留结构化段落（Purpose / Conversion Goal / VOC / Visual Direction / Compliance）；",
          "4) 如果参考图与槽位职责不匹配，输出纠偏式 Prompt（强调在当前图上该改什么）；",
          "5) 严禁建议用户更换图片、重新拍摄、重拍、替换素材。",
          "6) 你必须假设输入图片就是用户当前线上可用素材，只能给编辑优化指令。",
          "7) 另外请始终输出一份 canonical_prompt_en（英文、稳定、执行基准），用于跨语言一致性。",
          "8) prompt 必须是多段结构化文本，且必须完整包含这些英文段落标题：Purpose / Conversion Goal / VOC / Market Evidence / Recommended On-Image Copy / Visual Direction / Product Invariants / Compliance / Negative Constraints / Final Visual Prompt。",
          "9) prompt 和 canonical_prompt_en 必须全部使用英文，包括纠偏内容和合规限制；mismatch_notes 可以使用用户显示语言。",
          "10) 不要只输出一段中文建议。不要用 markdown 列表。不要删除段落标题。",
          "11) 输出 JSON，格式：{\"match_score\":0-100,\"mismatch_notes\":\"...\",\"prompt\":\"...\",\"canonical_prompt_en\":\"...\"}",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `slotKey: ${slotKey}`,
              `slotTitle: ${slotTitle || "unknown"}`,
              "",
              "策略输入：",
              `Purpose: ${purpose || "-"}`,
              `Conversion Goal: ${conversionGoal || "-"}`,
              `Recommended On-Image Copy: ${recommendedOverlayCopy || "-"}`,
              `VOC / Evidence: ${evidence || "-"}`,
              `Visual Direction: ${visualDirection || "-"}`,
              `Compliance Notes: ${complianceNotes || "-"}`,
              `Display Language: ${language}`,
              "",
              "当前Prompt（仅供参考，不要照抄错误）：",
              currentPrompt || "-",
            ].join("\n"),
          },
          ...(referenceImageUrl
            ? [
                {
                  type: "image_url" as const,
                  image_url: {
                    url: referenceImageUrl,
                  },
                },
              ]
            : []),
        ],
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content?.trim() || "";
  let parsed: {
    match_score?: number;
    mismatch_notes?: string;
    prompt?: string;
    canonical_prompt_en?: string;
  } = {};

  try {
    parsed = JSON.parse(rawContent) as typeof parsed;
  } catch {
    parsed = {
      prompt: rawContent,
    };
  }

  const rawRebuiltPrompt = enforceEditOnlyPrompt(sanitizeText(parsed.prompt));
  const matchScore =
    typeof parsed.match_score === "number" && Number.isFinite(parsed.match_score)
      ? Math.max(0, Math.min(100, Math.round(parsed.match_score)))
      : null;
  const mismatchNotes = sanitizeText(parsed.mismatch_notes);
  const canonicalStructuredPrompt = enforceEditOnlyPrompt(
    sanitizeText(parsed.canonical_prompt_en),
  );
  const rebuiltPrompt =
    hasStructuredPromptSections(rawRebuiltPrompt) && !containsCjk(rawRebuiltPrompt)
      ? rawRebuiltPrompt
      : hasStructuredPromptSections(canonicalStructuredPrompt)
        ? canonicalStructuredPrompt
        : buildStructuredPrompt({
            slotTitle,
            purpose,
            conversionGoal,
            recommendedOverlayCopy,
            evidence,
            visualDirection,
            complianceNotes,
            modelAdjustment: canonicalStructuredPrompt || rawRebuiltPrompt || mismatchNotes,
          });

  if (!rebuiltPrompt) {
    throw new Error("模型未返回可用提示词。");
  }

  return {
    prompt: rebuiltPrompt,
    matchScore,
    mismatchNotes,
    canonicalPromptEn: canonicalStructuredPrompt,
    language,
  };
}
