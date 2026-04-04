import OpenAI from "openai";

type ReferenceImageInput = {
  fileName: string;
  imageUrl: string;
};

type IdentityReviewResult = {
  is_match: boolean;
  score: number;
  summary: string;
  critical_mismatch: string | null;
  reasons: string[];
};

function clampScore(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeReviewResult(value: unknown): IdentityReviewResult {
  if (!value || typeof value !== "object") {
    return {
      is_match: false,
      score: 0,
      summary: "模型没有返回可用的一致性校验结果。",
      critical_mismatch: "identity-review-empty",
      reasons: [],
    };
  }

  const record = value as Record<string, unknown>;
  const criticalMismatch =
    typeof record.critical_mismatch === "string" && record.critical_mismatch.trim().length > 0
      ? record.critical_mismatch.trim()
      : null;

  return {
    is_match: record.is_match === true,
    score: clampScore(record.score),
    summary:
      typeof record.summary === "string" && record.summary.trim().length > 0
        ? record.summary.trim()
        : "模型没有返回摘要。",
    critical_mismatch: criticalMismatch,
    reasons: sanitizeStringArray(record.reasons),
  };
}

export async function reviewGeneratedImageIdentity({
  client,
  model,
  slotTitle,
  goal,
  generatedImageUrl,
  referenceImages,
}: {
  client: OpenAI;
  model: string;
  slotTitle: string;
  goal: string;
  generatedImageUrl: string;
  referenceImages: ReferenceImageInput[];
}) {
  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "你是电商商品图审校员。你的唯一任务是判断“生成图中的商品”是否与“参考图中的真实商品”为同一个商品身份。",
          "重点看：商品类别、整体轮廓、关键结构、配色/材质、独特零件和比例。",
          "不要因为场景、人物、光线、机位不同就判失败；只有当商品本身变成了别的产品，或者关键结构明显改变时，才判失败。",
          "必须返回 JSON，字段固定为：is_match, score, summary, critical_mismatch, reasons。",
          "score 是 0-100 的商品一致性分数。critical_mismatch 只有在存在关键错位时才填写，否则返回 null。",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `当前槽位：${slotTitle}`,
              `生成目标：${goal || "未提供"}`,
              "下面先给你真实商品参考图，再给你本次生成图。",
              "请只回答它们是否还是同一个商品身份，而不是评价图片好不好看。",
            ].join("\n"),
          },
          ...referenceImages.flatMap((image, index) => [
            {
              type: "text" as const,
              text: `参考图 ${index + 1}：${image.fileName}`,
            },
            {
              type: "image_url" as const,
              image_url: {
                url: image.imageUrl,
              },
            },
          ]),
          {
            type: "text",
            text: "本次生成图：",
          },
          {
            type: "image_url",
            image_url: {
              url: generatedImageUrl,
            },
          },
          {
            type: "text",
            text: [
              "判定规则：",
              "1. 如果商品类别变了，直接失败。",
              "2. 如果独特结构或轮廓变了，直接失败。",
              "3. 如果只是背景、人物、角度变化，但商品还是同一个，允许通过。",
              "4. 只有在你有明确视觉依据时才给高分。",
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: unknown = {};

  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  const result = normalizeReviewResult(parsed);

  return {
    ...result,
    passes: result.is_match && result.score >= 75 && !result.critical_mismatch,
  };
}
