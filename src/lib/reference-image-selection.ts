import OpenAI from "openai";

type ReferenceImageInput = {
  fileName: string;
  imageUrl: string;
  referenceKind?: string;
  pinnedForMain?: boolean;
};

export type SelectedReferenceImage = {
  file_name: string;
  image_type:
    | "main"
    | "structure"
    | "material"
    | "detail"
    | "lifestyle"
    | "infographic"
    | "reject";
  suitability: number;
  keep_for_edit: boolean;
  reason: string;
};

type ReferenceImageSelectionShape = {
  summary: string;
  selected_file_names: string[];
  items: SelectedReferenceImage[];
};

function clampScore(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const imageType = sanitizeString(record.image_type) as SelectedReferenceImage["image_type"];

      return {
        file_name: sanitizeString(record.file_name),
        image_type:
          imageType === "main" ||
          imageType === "structure" ||
          imageType === "material" ||
          imageType === "detail" ||
          imageType === "lifestyle" ||
          imageType === "infographic" ||
          imageType === "reject"
            ? imageType
            : "reject",
        suitability: clampScore(record.suitability),
        keep_for_edit: record.keep_for_edit === true,
        reason: sanitizeString(record.reason),
      };
    })
    .filter((item): item is SelectedReferenceImage => Boolean(item?.file_name));
}

function normalizeSelection(value: unknown): ReferenceImageSelectionShape {
  if (!value || typeof value !== "object") {
    return {
      summary: "",
      selected_file_names: [],
      items: [],
    };
  }

  const record = value as Record<string, unknown>;

  return {
    summary: sanitizeString(record.summary),
    selected_file_names: Array.isArray(record.selected_file_names)
      ? record.selected_file_names
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    items: sanitizeItems(record.items),
  };
}

function fallbackSelection(referenceImages: ReferenceImageInput[]) {
  return {
    summary: "未拿到可用的参考图筛选结果，已按默认顺序选取前 4 张。",
    selected_file_names: referenceImages.slice(0, 4).map((image) => image.fileName),
    items: referenceImages.slice(0, 4).map((image, index) => ({
      file_name: image.fileName,
      image_type: index === 0 ? "main" : "structure",
      suitability: 70,
      keep_for_edit: true,
      reason: "默认回退选择",
    })),
  } satisfies ReferenceImageSelectionShape;
}

export async function selectReferenceImagesForEdit({
  client,
  model,
  slotTitle,
  goal,
  message,
  identitySummary,
  referenceImages,
  maxSelected = 5,
}: {
  client: OpenAI;
  model: string;
  slotTitle: string;
  goal: string;
  message: string;
  identitySummary: string;
  referenceImages: ReferenceImageInput[];
  maxSelected?: number;
}) {
  if (referenceImages.length <= maxSelected) {
    return {
      summary: "参考图数量不多，直接使用当前上传图。",
      selected_file_names: referenceImages.map((image) => image.fileName),
      items: referenceImages.map((image, index) => ({
        file_name: image.fileName,
        image_type: index === 0 ? "main" : "structure",
        suitability: 90,
        keep_for_edit: true,
        reason: "直接纳入当前生成。",
      })),
    } satisfies ReferenceImageSelectionShape;
  }

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "你是电商商品图参考图筛选助手。",
          "任务：从多张商品图里选出最适合送入图片编辑模型的 3-5 张参考图。",
          "优先保留：主体清晰、结构完整、能看清关键部件与连接关系、材质颜色真实的图片。",
          "优先剔除：大段文字信息图、尺寸图、拼图、结构被严重遮挡、构图过于花哨的 lifestyle 图。",
          "必须返回 JSON，字段固定为：summary, selected_file_names, items。",
          "items 中每项字段固定为：file_name, image_type, suitability, keep_for_edit, reason。",
          "image_type 只能是：main, structure, material, detail, lifestyle, infographic, reject。",
          `selected_file_names 最多 ${maxSelected} 张。`,
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `当前槽位：${slotTitle}`,
              `图片任务：${goal || "未提供"}`,
              `转化目标：${message || "未提供"}`,
              `商品身份摘要：${identitySummary || "未提供"}`,
              "请先判断每张图的类型和 suitability，再挑出最适合送去 edit 的参考图。",
              "如果多张图互相冲突，优先选择结构最清晰、最像真实商品的图片。",
            ].join("\n"),
          },
          ...referenceImages.flatMap((image, index) => [
            {
              type: "text" as const,
              text: [
                `参考图 ${index + 1}：${image.fileName}`,
                `人工标签：${image.referenceKind || "untyped"}`,
                image.pinnedForMain ? "主图锁定：是" : "主图锁定：否",
              ].join("\n"),
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

  const normalized = normalizeSelection(parsed);

  if (normalized.selected_file_names.length === 0) {
    return fallbackSelection(referenceImages);
  }

  const selectedSet = new Set(normalized.selected_file_names);
  const selectedItems = referenceImages
    .filter((image) => selectedSet.has(image.fileName))
    .slice(0, maxSelected);

  if (selectedItems.length === 0) {
    return fallbackSelection(referenceImages);
  }

  return {
    summary: normalized.summary,
    selected_file_names: selectedItems.map((image) => image.fileName),
    items: normalized.items,
  } satisfies ReferenceImageSelectionShape;
}
