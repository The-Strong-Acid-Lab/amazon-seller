import OpenAI from "openai";

export type ProductIdentityProfileShape = {
  product_type: string;
  category: string;
  primary_color: string;
  materials: string[];
  signature_features: string[];
  must_keep: string[];
  can_change: string[];
  must_not_change: string[];
  identity_summary: string;
};

export function buildReferenceImageSignature(
  references: Array<{
    role: string;
    project_product_id: string;
    file_hash: string;
  }>,
) {
  return references
    .map((reference) =>
      [
        reference.role.trim(),
        reference.project_product_id.trim(),
        reference.file_hash.trim(),
      ].join(":"),
    )
    .sort()
    .join("|");
}

type ReferenceImageInput = {
  fileName: string;
  imageUrl: string;
};

function sanitizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeProfile(value: unknown): ProductIdentityProfileShape {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    product_type: sanitizeString(record.product_type),
    category: sanitizeString(record.category),
    primary_color: sanitizeString(record.primary_color),
    materials: sanitizeStringArray(record.materials),
    signature_features: sanitizeStringArray(record.signature_features),
    must_keep: sanitizeStringArray(record.must_keep),
    can_change: sanitizeStringArray(record.can_change),
    must_not_change: sanitizeStringArray(record.must_not_change),
    identity_summary: sanitizeString(record.identity_summary),
  };
}

export async function generateProductIdentityProfile({
  client,
  model,
  targetName,
  referenceImages,
}: {
  client: OpenAI;
  model: string;
  targetName: string;
  referenceImages: ReferenceImageInput[];
}) {
  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "你是电商商品身份识别助手。你的任务是基于多张真实商品图，提炼出这件商品的身份档案。",
          "重点不是写营销文案，而是识别商品类别、结构、外观特征，以及哪些地方绝对不能变。",
          "必须返回 JSON，字段固定为：product_type, category, primary_color, materials, signature_features, must_keep, can_change, must_not_change, identity_summary。",
          "所有数组字段都必须返回数组，即使为空也返回空数组。",
          "不要发明看不见的结构；只总结多张图里稳定可见的特征。",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `目标商品名称：${targetName || "未命名商品"}`,
              "下面是同一个商品的多张真实参考图。",
              "请提炼出这件商品的 Product Identity Profile，用于后续图片生成时锁定商品身份。",
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

  return normalizeProfile(parsed);
}
