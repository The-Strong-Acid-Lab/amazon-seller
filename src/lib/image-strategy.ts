export type ImageBriefInput = {
  slot: string;
  goal: string;
  message: string;
  supporting_proof: string;
  visual_direction: string;
};

export type ImageStrategyInput = {
  hero_image: string;
  feature_callouts: string[];
  objection_handling_images: string[];
  lifestyle_scenes: string[];
};

export type ImageStrategySlotId =
  | "main_image"
  | "core_value"
  | "primary_lifestyle"
  | "secondary_lifestyle"
  | "feature_proof"
  | "material_detail"
  | "dimensions_fit"
  | "objection_closer";

export type ImageStrategySlotPlan = {
  id: ImageStrategySlotId;
  order: number;
  section: "main" | "secondary";
  title: string;
  audienceLabel: string;
  purpose: string;
  conversionGoal: string;
  recommendedOverlayCopy: string;
  evidence: string;
  visualDirection: string;
  complianceNotes: string;
  sourceBriefSlot: string | null;
  defaultPrompt: string;
};

export type PersistedImageStrategySlot = {
  id: string;
  project_id: string;
  slot_key: string;
  order_index: number;
  section: "main" | "secondary";
  title: string;
  purpose: string;
  conversion_goal: string;
  recommended_overlay_copy: string;
  evidence: string;
  visual_direction: string;
  compliance_notes: string;
  prompt_text: string;
  source_brief_slot: string | null;
  created_at: string;
  updated_at: string;
};

type SlotBlueprint = {
  id: ImageStrategySlotId;
  order: number;
  section: "main" | "secondary";
  title: string;
  audienceLabel: string;
  fallbackPurpose: string;
  fallbackConversionGoal: string;
  fallbackOverlayCopy: string;
  fallbackVisualDirection: string;
  complianceNotes: string;
  keywords: string[];
  strategySource?: {
    key: keyof ImageStrategyInput;
    index?: number;
  };
};

const SLOT_BLUEPRINTS: SlotBlueprint[] = [
  {
    id: "main_image",
    order: 1,
    section: "main",
    title: "主图",
    audienceLabel: "Main 1",
    fallbackPurpose: "让买家一眼认出产品，并马上看见核心结构差异。",
    fallbackConversionGoal: "提升首屏点击与停留，避免被当成普通同类商品。",
    fallbackOverlayCopy: "主图不叠加文案",
    fallbackVisualDirection:
      "背景保持简洁干净，产品完整入镜，结构特征清晰，优先展示最能区分类目的轮廓。",
    complianceNotes:
      "不加营销文案，不加误导性对比图，不加虚构配件，背景不要喧宾夺主。",
    keywords: ["hero", "main", "primary", "主图"],
    strategySource: {
      key: "hero_image",
    },
  },
  {
    id: "core_value",
    order: 2,
    section: "secondary",
    title: "核心卖点图",
    audienceLabel: "Image 2",
    fallbackPurpose: "在第二张图说明为什么这个产品值得继续往下看。",
    fallbackConversionGoal: "把抽象优势翻译成一句明确利益点。",
    fallbackOverlayCopy: "一句主标题 + 一句副标题",
    fallbackVisualDirection:
      "产品仍是主角，搭配少量支持性细节或 icon 区域，适合后续叠加文案。",
    complianceNotes:
      "允许后续叠加短文案，但底图本身不要生成文字，不要做夸张承诺。",
    keywords: ["value", "benefit", "sell", "message", "feature", "卖点"],
    strategySource: {
      key: "feature_callouts",
      index: 0,
    },
  },
  {
    id: "primary_lifestyle",
    order: 3,
    section: "secondary",
    title: "主场景图",
    audienceLabel: "Image 3",
    fallbackPurpose: "让目标用户代入真实使用情境，降低想象成本。",
    fallbackConversionGoal: "证明产品在真实环境里成立，而不只是工作室摆拍。",
    fallbackOverlayCopy: "一个场景标题 + 一句结果导向描述",
    fallbackVisualDirection:
      "真实生活或工作环境，人物动作自然，产品与场景比例可信，优先展示主要使用任务。",
    complianceNotes:
      "人物姿态自然，不要过度表演，不要加入无关装饰，不要让场景压过产品。",
    keywords: ["lifestyle", "scene", "use case", "desk", "home", "场景"],
    strategySource: {
      key: "lifestyle_scenes",
      index: 0,
    },
  },
  {
    id: "secondary_lifestyle",
    order: 4,
    section: "secondary",
    title: "延展场景图",
    audienceLabel: "Image 4",
    fallbackPurpose: "展示第二种高价值使用情境或另一类人群的代入感。",
    fallbackConversionGoal: "扩大适用人群理解，解释产品不是单一场景道具。",
    fallbackOverlayCopy: "一条细分人群或第二场景标题",
    fallbackVisualDirection:
      "同样真实，但和主场景有明显区分，可换角度、人物动作或使用环境。",
    complianceNotes:
      "避免重复上一张图的构图和动作，不做同质化 lifestyle。",
    keywords: ["lifestyle", "secondary", "persona", "alternative", "场景"],
    strategySource: {
      key: "lifestyle_scenes",
      index: 1,
    },
  },
  {
    id: "feature_proof",
    order: 5,
    section: "secondary",
    title: "结构功能图",
    audienceLabel: "Image 5",
    fallbackPurpose: "把一个关键结构或功能讲明白，回答产品到底怎么工作。",
    fallbackConversionGoal: "减少功能理解门槛，避免用户靠猜。",
    fallbackOverlayCopy: "一条功能标题 + 2 到 3 个结构标注点",
    fallbackVisualDirection:
      "近景或半近景，结构关系清晰，便于后续加箭头、标签或局部放大框。",
    complianceNotes:
      "只强调真实存在的结构和功能，不允许虚构内部构造或参数。",
    keywords: ["feature", "mechanism", "adjust", "support", "function", "结构"],
    strategySource: {
      key: "feature_callouts",
      index: 1,
    },
  },
  {
    id: "material_detail",
    order: 6,
    section: "secondary",
    title: "材质舒适图",
    audienceLabel: "Image 6",
    fallbackPurpose: "把触感、材质、舒适度等更难用文字说清的感受可视化。",
    fallbackConversionGoal: "用质感和细节建立高级感、可信感与舒适预期。",
    fallbackOverlayCopy: "一条材质标题 + 一条触感或维护说明",
    fallbackVisualDirection:
      "局部细节、手部接触、材质近景、表面纹理或使用中的舒适特写。",
    complianceNotes:
      "不要伪造材质纹理，不要制造不符合真实产品的光泽和厚度。",
    keywords: ["material", "comfort", "soft", "waterproof", "detail", "材质"],
    strategySource: {
      key: "feature_callouts",
      index: 2,
    },
  },
  {
    id: "dimensions_fit",
    order: 7,
    section: "secondary",
    title: "尺寸适配图",
    audienceLabel: "Image 7",
    fallbackPurpose: "提前回答尺寸、适配对象、空间关系这类容易导致退货的问题。",
    fallbackConversionGoal: "减少因尺寸不清、适配不明造成的犹豫和差评。",
    fallbackOverlayCopy: "一条尺寸标题 + 关键尺寸/适配说明",
    fallbackVisualDirection:
      "留足后期加尺寸线、对比尺和适配信息的版面空间，产品结构要完整。",
    complianceNotes:
      "尺寸和适配信息后期叠加时必须基于真实规格，不允许凭空估计。",
    keywords: ["size", "dimension", "fit", "space", "spec", "尺寸"],
    strategySource: {
      key: "objection_handling_images",
      index: 0,
    },
  },
  {
    id: "objection_closer",
    order: 8,
    section: "secondary",
    title: "顾虑收口图",
    audienceLabel: "Image 8",
    fallbackPurpose: "集中回应最后还会阻碍下单的疑虑或与普通竞品的差异点。",
    fallbackConversionGoal: "在买家离开前补上信心，完成收口。",
    fallbackOverlayCopy: "一条反顾虑标题 + 一句信心结论",
    fallbackVisualDirection:
      "可以是对比式表达、结构强化、稳定性/可靠性场景，画面要直接回答疑虑。",
    complianceNotes:
      "不要做误导性竞品对比，不要使用无法证明的绝对化措辞。",
    keywords: ["objection", "risk", "compare", "confidence", "proof", "顾虑"],
    strategySource: {
      key: "objection_handling_images",
      index: 1,
    },
  },
];

function cleanText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function pickStrategyLine(
  strategy: ImageStrategyInput | undefined,
  source: SlotBlueprint["strategySource"],
) {
  if (!strategy || !source) {
    return "";
  }

  const rawValue = strategy[source.key];

  if (typeof rawValue === "string") {
    return cleanText(rawValue);
  }

  const item = rawValue[source.index ?? 0];
  return cleanText(item);
}

function matchesKeyword(value: string, keywords: string[]) {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function pickBriefForBlueprint(
  blueprint: SlotBlueprint,
  brief: ImageBriefInput[],
  usedIndexes: Set<number>,
) {
  const byKeywordIndex = brief.findIndex((item, index) => {
    if (usedIndexes.has(index)) {
      return false;
    }

    const searchable = [item.slot, item.goal, item.message].join(" ");
    return matchesKeyword(searchable, blueprint.keywords);
  });

  if (byKeywordIndex >= 0) {
    usedIndexes.add(byKeywordIndex);
    return brief[byKeywordIndex];
  }

  const nextUnusedIndex = brief.findIndex((_, index) => !usedIndexes.has(index));

  if (nextUnusedIndex >= 0) {
    usedIndexes.add(nextUnusedIndex);
    return brief[nextUnusedIndex];
  }

  return null;
}

function joinEvidence(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => cleanText(part))
    .filter(Boolean)
    .join("；");
}

export function buildEditableImagePrompt(slot: Omit<ImageStrategySlotPlan, "defaultPrompt">) {
  const promptLines = [
    `${slot.audienceLabel} - ${slot.title}`,
    "",
    "Purpose",
    slot.purpose,
    "",
    "Conversion Goal",
    slot.conversionGoal,
    "",
    "VOC / Market Evidence",
    slot.evidence,
    "",
    "Recommended On-Image Copy",
    `${slot.recommendedOverlayCopy} (handled outside image generation; do not render text in the image)`,
    "",
    "Visual Direction",
    slot.visualDirection,
    "",
    "Product Invariants",
    "Keep the uploaded product identity stable. Do not change category, silhouette, materials, hardware layout, or core structure.",
    "",
    "Compliance",
    slot.complianceNotes,
    "",
    "Negative Constraints",
    "No text, no letters, no logo, no watermark, no fabricated accessories, no impossible geometry, no misleading before/after claims.",
    "",
    "Final Visual Prompt",
    `Create a polished Amazon listing base image for ${slot.title}. The image should serve this purpose: ${slot.purpose} The composition should support this conversion goal: ${slot.conversionGoal} Ground the visual choices in this evidence: ${slot.evidence} Visual direction: ${slot.visualDirection} Keep the real product identity intact and leave room for later layout overlays where appropriate.`,
  ];

  return promptLines.join("\n");
}

export function buildImageStrategySlots({
  brief,
  strategy,
}: {
  brief: ImageBriefInput[];
  strategy?: ImageStrategyInput;
}): ImageStrategySlotPlan[] {
  const usedBriefIndexes = new Set<number>();

  return SLOT_BLUEPRINTS.map((blueprint) => {
    const matchedBrief = pickBriefForBlueprint(blueprint, brief, usedBriefIndexes);
    const strategySeed = pickStrategyLine(strategy, blueprint.strategySource);
    const purpose = cleanText(matchedBrief?.goal) || strategySeed || blueprint.fallbackPurpose;
    const evidence = joinEvidence([
      matchedBrief?.supporting_proof,
      strategySeed && strategySeed !== purpose ? strategySeed : "",
    ]) || "当前先基于 VOC、竞品表达和 listing 线索规划该槽位。";
    const visualDirection =
      cleanText(matchedBrief?.visual_direction) || blueprint.fallbackVisualDirection;
    const conversionGoal =
      cleanText(matchedBrief?.message) || blueprint.fallbackConversionGoal;
    const recommendedOverlayCopy =
      cleanText(matchedBrief?.message) || blueprint.fallbackOverlayCopy;

    const slotWithoutPrompt = {
      id: blueprint.id,
      order: blueprint.order,
      section: blueprint.section,
      title: blueprint.title,
      audienceLabel: blueprint.audienceLabel,
      purpose,
      conversionGoal,
      recommendedOverlayCopy,
      evidence,
      visualDirection,
      complianceNotes: blueprint.complianceNotes,
      sourceBriefSlot: matchedBrief?.slot ?? null,
    };

    return {
      ...slotWithoutPrompt,
      defaultPrompt: buildEditableImagePrompt(slotWithoutPrompt),
    };
  });
}

export function mergePersistedImageStrategySlots({
  slots,
  persistedSlots,
}: {
  slots: ImageStrategySlotPlan[];
  persistedSlots: PersistedImageStrategySlot[];
}) {
  const persistedByKey = new Map(
    persistedSlots.map((item) => [item.slot_key, item] as const),
  );

  return slots.map((slot) => {
    const persisted = persistedByKey.get(slot.id);

    if (!persisted) {
      return slot;
    }

    return {
      ...slot,
      order: persisted.order_index,
      section: persisted.section,
      title: cleanText(persisted.title) || slot.title,
      purpose: cleanText(persisted.purpose) || slot.purpose,
      conversionGoal:
        cleanText(persisted.conversion_goal) || slot.conversionGoal,
      recommendedOverlayCopy:
        cleanText(persisted.recommended_overlay_copy) ||
        slot.recommendedOverlayCopy,
      evidence: cleanText(persisted.evidence) || slot.evidence,
      visualDirection:
        cleanText(persisted.visual_direction) || slot.visualDirection,
      complianceNotes:
        cleanText(persisted.compliance_notes) || slot.complianceNotes,
      sourceBriefSlot: persisted.source_brief_slot || slot.sourceBriefSlot,
      defaultPrompt: cleanText(persisted.prompt_text) || slot.defaultPrompt,
    };
  });
}
