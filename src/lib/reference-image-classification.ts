import OpenAI from "openai";

export type ReferenceImageKind =
  | "untyped"
  | "hero_source"
  | "structure_lock"
  | "material_lock"
  | "lifestyle_ref"
  | "competitor_inspiration"
  | "infographic_ignore";

type ReferenceImageClassificationShape = {
  reference_kind: ReferenceImageKind;
  should_pin_for_main: boolean;
  summary: string;
};

function sanitizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeReferenceKind(value: unknown): ReferenceImageKind {
  const normalized = sanitizeString(value);

  if (
    normalized === "hero_source" ||
    normalized === "structure_lock" ||
    normalized === "material_lock" ||
    normalized === "lifestyle_ref" ||
    normalized === "competitor_inspiration" ||
    normalized === "infographic_ignore"
  ) {
    return normalized;
  }

  return "untyped";
}

function normalizeClassification(value: unknown): ReferenceImageClassificationShape {
  if (!value || typeof value !== "object") {
    return {
      reference_kind: "untyped",
      should_pin_for_main: false,
      summary: "",
    };
  }

  const record = value as Record<string, unknown>;

  return {
    reference_kind: normalizeReferenceKind(record.reference_kind),
    should_pin_for_main: record.should_pin_for_main === true,
    summary: sanitizeString(record.summary),
  };
}

export async function classifyReferenceImage({
  client,
  model,
  role,
  productName,
  fileName,
  imageUrl,
}: {
  client: OpenAI;
  model: string;
  role: "target" | "competitor";
  productName: string;
  fileName: string;
  imageUrl: string;
}) {
  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "你是电商商品参考图分类助手。",
          "任务：看一张参考图，并为后续商品图生成给出最合适的用途分类。",
          "必须返回 JSON，字段固定为：reference_kind, should_pin_for_main, summary。",
          "reference_kind 只能是：untyped, hero_source, structure_lock, material_lock, lifestyle_ref, competitor_inspiration, infographic_ignore。",
          "should_pin_for_main 只能在图片非常适合充当主图视觉真值时返回 true；否则返回 false。",
          "如果图片是信息图、尺寸图、拼图、带大量文字、过度遮挡、无法用于锁定商品身份，优先返回 infographic_ignore。",
          "如果 role=competitor，优先考虑 competitor_inspiration 或 infographic_ignore，不要把竞品图判断成主图真值。",
          "不要因为文件名猜测内容，只根据图像可见信息判断。",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `图片角色：${role}`,
              `商品名称：${productName || "未命名商品"}`,
              `文件名：${fileName}`,
              "请判断这张图更适合做什么用途，并说明一句理由。",
            ].join("\n"),
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
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

  return normalizeClassification(parsed);
}
