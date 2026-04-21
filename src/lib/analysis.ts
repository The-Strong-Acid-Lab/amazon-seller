import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

import { normalizePendingUploadedReviewsForProject } from "@/lib/import-persistence";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { resolveProjectApiKey } from "@/lib/user-api-keys";

type DbReviewRow = {
  id: string;
  project_product_id: string | null;
  asin: string | null;
  model: string | null;
  review_title: string;
  review_body: string;
  rating: number | null;
  review_date: string | null;
  country: string | null;
  helpful_count: number | null;
  image_count: number;
  has_video: boolean;
};

type DbProjectProductRow = {
  id: string;
  role: "target" | "competitor";
  name: string | null;
  asin: string | null;
  market: string | null;
  product_url: string | null;
  current_title: string | null;
  current_bullets: string | null;
  current_description: string | null;
};

type OpenAiMessage = {
  role: "system" | "user";
  content: string;
};

export type AnalysisProvider = "openai" | "gemini";

export type ThemeItem = {
  theme: string;
  summary: string;
  evidence: string[];
  mention_count?: number;
};

export type LabelSummaryItem = {
  label: string;
  summary: string;
  evidence?: string[];
  mention_count?: number;
};

export type PersonaItem = {
  name: string;
  who: string;
  goal: string;
  pain_point: string;
  message_angle: string;
};

export type VocResponseItem = {
  voc_theme: string;
  buyer_signal: string;
  risk_or_opportunity: string;
  execution_area: "positioning" | "listing" | "image" | "ads";
  priority: "p1" | "p2" | "p3";
  why_now: string;
  recommended_listing_response: string;
  recommended_image_response: string;
  recommended_ad_angle: string;
  confidence: "low" | "medium" | "high";
};

export type ExecutionTaskItem = {
  task_title: string;
  priority: "p1" | "p2" | "p3";
  workstream: "positioning" | "listing" | "image" | "ads";
  concrete_action: string;
  expected_impact: string;
  success_signal: string;
};

export type ListingDraftShape = {
  title_draft: string;
  title_rationale: string;
  bullet_drafts: string[];
  bullet_rationales: string[];
  positioning_statement: string;
};

export type ImageBriefItem = {
  slot: string;
  goal: string;
  message: string;
  supporting_proof: string;
  visual_direction: string;
};

export type APlusBriefItem = {
  module: string;
  goal: string;
  key_message: string;
  supporting_proof: string;
  content_direction: string;
};

export type AnalysisReportShape = {
  dataset_overview: {
    review_count: number;
    asin_count: number;
    country_count: number;
    date_from: string | null;
    date_to: string | null;
    rating_distribution: Record<string, number>;
  };
  target_overview: {
    review_count: number;
    asin_count: number;
    country_count: number;
    date_from: string | null;
    date_to: string | null;
    rating_distribution: Record<string, number>;
  };
  competitor_overview: {
    review_count: number;
    asin_count: number;
    country_count: number;
    date_from: string | null;
    date_to: string | null;
    rating_distribution: Record<string, number>;
  };
  target_positive_themes: ThemeItem[];
  target_negative_themes: ThemeItem[];
  competitor_positive_themes: ThemeItem[];
  competitor_negative_themes: ThemeItem[];
  buyer_desires: LabelSummaryItem[];
  buyer_objections: LabelSummaryItem[];
  usage_scenarios: LabelSummaryItem[];
  usage_where: LabelSummaryItem[];
  usage_when: LabelSummaryItem[];
  usage_how: LabelSummaryItem[];
  product_what: LabelSummaryItem[];
  user_personas: PersonaItem[];
  purchase_drivers: LabelSummaryItem[];
  negative_opinions: LabelSummaryItem[];
  unmet_needs: LabelSummaryItem[];
  baseline_requirements: LabelSummaryItem[];
  performance_levers: LabelSummaryItem[];
  differentiators: LabelSummaryItem[];
  comparison_opportunities: LabelSummaryItem[];
  comparison_risks: LabelSummaryItem[];
  execution_tasks: ExecutionTaskItem[];
  listing_draft: ListingDraftShape;
  image_brief: ImageBriefItem[];
  a_plus_brief: APlusBriefItem[];
  voc_response_matrix: VocResponseItem[];
  image_strategy: {
    hero_image: string;
    feature_callouts: string[];
    objection_handling_images: string[];
    lifestyle_scenes: string[];
  };
  copy_strategy: {
    title_angles: string[];
    bullet_angles: string[];
    proof_phrases: string[];
  };
};

export type CompetitorInsightShape = {
  positive_themes: ThemeItem[];
  negative_themes: ThemeItem[];
  purchase_drivers: LabelSummaryItem[];
  negative_opinions: LabelSummaryItem[];
  listing_angles: LabelSummaryItem[];
  inspiration_for_target: LabelSummaryItem[];
};

type ListingDraftOnlyShape = {
  listing_draft: ListingDraftShape;
};

function requireOpenAiEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function computeDatasetOverview(reviews: DbReviewRow[]) {
  const asins = new Set<string>();
  const countries = new Set<string>();
  const ratingDistribution: Record<string, number> = {};
  let dateFrom: string | null = null;
  let dateTo: string | null = null;

  for (const review of reviews) {
    if (review.asin) {
      asins.add(review.asin);
    }

    if (review.country) {
      countries.add(review.country);
    }

    if (review.rating !== null) {
      const ratingKey = String(review.rating);
      ratingDistribution[ratingKey] = (ratingDistribution[ratingKey] ?? 0) + 1;
    }

    if (review.review_date) {
      if (!dateFrom || review.review_date < dateFrom) {
        dateFrom = review.review_date;
      }

      if (!dateTo || review.review_date > dateTo) {
        dateTo = review.review_date;
      }
    }
  }

  return {
    review_count: reviews.length,
    asin_count: asins.size,
    country_count: countries.size,
    date_from: dateFrom,
    date_to: dateTo,
    rating_distribution: ratingDistribution,
  };
}

function getReviewTimestamp(review: DbReviewRow) {
  if (!review.review_date) {
    return 0;
  }

  const timestamp = new Date(review.review_date).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getReviewSignalScore(review: DbReviewRow) {
  const helpfulScore = Math.min(review.helpful_count ?? 0, 50) * 120;
  const imageScore = review.image_count * 100;
  const videoScore = review.has_video ? 250 : 0;
  const bodyScore = review.review_body.length;

  return helpfulScore + imageScore + videoScore + bodyScore;
}

function compareReviewsBySignal(left: DbReviewRow, right: DbReviewRow) {
  const scoreDiff = getReviewSignalScore(right) - getReviewSignalScore(left);

  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  return getReviewTimestamp(right) - getReviewTimestamp(left);
}

function takeUniqueReviews(
  groups: DbReviewRow[][],
  limit: number,
) {
  const seen = new Set<string>();
  const selected: DbReviewRow[] = [];

  for (const group of groups) {
    for (const review of group) {
      if (seen.has(review.id)) {
        continue;
      }

      seen.add(review.id);
      selected.push(review);

      if (selected.length >= limit) {
        return selected;
      }
    }
  }

  return selected;
}

function pickRepresentativeReviews(reviews: DbReviewRow[]) {
  const negative = reviews
    .filter((review) => (review.rating ?? 0) <= 2)
    .sort(compareReviewsBySignal)
    .slice(0, 20);

  const neutral = reviews
    .filter((review) => review.rating === 3)
    .sort(compareReviewsBySignal)
    .slice(0, 8);

  const positive = reviews
    .filter((review) => (review.rating ?? 0) >= 4)
    .sort(compareReviewsBySignal)
    .slice(0, 20);

  const recent = [...reviews]
    .sort((left, right) => {
      const timestampDiff = getReviewTimestamp(right) - getReviewTimestamp(left);

      if (timestampDiff !== 0) {
        return timestampDiff;
      }

      return compareReviewsBySignal(left, right);
    })
    .slice(0, 16);

  const helpful = reviews
    .filter((review) => (review.helpful_count ?? 0) > 0)
    .sort((left, right) => {
      const helpfulDiff = (right.helpful_count ?? 0) - (left.helpful_count ?? 0);

      if (helpfulDiff !== 0) {
        return helpfulDiff;
      }

      return compareReviewsBySignal(left, right);
    })
    .slice(0, 16);

  return takeUniqueReviews([negative, positive, recent, helpful, neutral], 72);
}

function reviewToPromptLine(review: DbReviewRow) {
  const excerpt = review.review_body.replace(/\s+/g, " ").slice(0, 340);

  return [
    `asin=${review.asin ?? "-"}`,
    `rating=${review.rating ?? "-"}`,
    `model=${review.model ?? "-"}`,
    `country=${review.country ?? "-"}`,
    `date=${review.review_date ?? "-"}`,
    `helpful=${review.helpful_count ?? 0}`,
    `title=${review.review_title || "-"}`,
    `body=${excerpt}`,
  ].join(" | ");
}

function cleanListingText(value: string | null | undefined, maxLength: number) {
  if (!value) {
    return "Not provided.";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength) || "Not provided.";
}

function listingToPromptBlock(product: DbProjectProductRow) {
  return [
    `name=${product.name ?? "-"}`,
    `asin=${product.asin ?? "-"}`,
    `market=${product.market ?? "-"}`,
    `url=${product.product_url ?? "-"}`,
    `title=${cleanListingText(product.current_title, 260)}`,
    `bullets=${cleanListingText(product.current_bullets, 600)}`,
    `description=${cleanListingText(product.current_description, 600)}`,
  ].join("\n");
}

function normalizeThemeItems(
  items: ThemeItem[] | undefined,
  maxItems: number,
) {
  return (items ?? [])
    .map((item) => {
      const rawMentionCount = item.mention_count;
      const parsedMentionCount =
        typeof rawMentionCount === "number"
          ? rawMentionCount
          : typeof rawMentionCount === "string"
            ? Number(rawMentionCount)
            : NaN;

      return {
        theme: item.theme ?? "",
        summary: item.summary ?? "",
        evidence: Array.isArray(item.evidence) ? item.evidence.slice(0, 3) : [],
        mention_count:
          Number.isFinite(parsedMentionCount) && parsedMentionCount > 0
            ? Math.round(parsedMentionCount)
            : undefined,
      } satisfies ThemeItem;
    })
    .filter((item) => item.theme.trim() && item.summary.trim())
    .slice(0, maxItems);
}

function normalizeLabelSummaryItems(
  items: LabelSummaryItem[] | undefined,
  maxItems: number,
) {
  return (items ?? [])
    .map((item) => {
      const rawMentionCount = item.mention_count;
      const parsedMentionCount =
        typeof rawMentionCount === "number"
          ? rawMentionCount
          : typeof rawMentionCount === "string"
            ? Number(rawMentionCount)
            : NaN;

      return {
        label: item.label ?? "",
        summary: item.summary ?? "",
        evidence: Array.isArray(item.evidence) ? item.evidence.slice(0, 3) : [],
        mention_count:
          Number.isFinite(parsedMentionCount) && parsedMentionCount > 0
            ? Math.round(parsedMentionCount)
            : undefined,
      } satisfies LabelSummaryItem;
    })
    .filter((item) => item.label.trim() && item.summary.trim())
    .slice(0, maxItems);
}

function buildPrompt({
  datasetOverview,
  targetOverview,
  competitorOverview,
  targetReviews,
  competitorReviews,
  targetProducts,
  competitorProducts,
}: {
  datasetOverview: ReturnType<typeof computeDatasetOverview>;
  targetOverview: ReturnType<typeof computeDatasetOverview>;
  competitorOverview: ReturnType<typeof computeDatasetOverview>;
  targetReviews: DbReviewRow[];
  competitorReviews: DbReviewRow[];
  targetProducts: DbProjectProductRow[];
  competitorProducts: DbProjectProductRow[];
}) {
  const representativeTargetReviews = pickRepresentativeReviews(targetReviews)
    .map((review, index) => `${index + 1}. ${reviewToPromptLine(review)}`)
    .join("\n");
  const representativeCompetitorReviews = pickRepresentativeReviews(competitorReviews)
    .map((review, index) => `${index + 1}. ${reviewToPromptLine(review)}`)
    .join("\n");
  const targetListingBlocks = targetProducts
    .map((product, index) => `Target ${index + 1}\n${listingToPromptBlock(product)}`)
    .join("\n\n");
  const competitorListingBlocks = competitorProducts
    .map((product, index) => `Competitor ${index + 1}\n${listingToPromptBlock(product)}`)
    .join("\n\n");

  const messages: OpenAiMessage[] = [
    {
      role: "system",
      content:
        "You are an Amazon seller research analyst. Return valid JSON only. Do not include markdown. Ground your analysis in the provided reviews. Focus on conversion-relevant insights, especially how a target product should position itself against competitors.",
    },
    {
      role: "user",
      content: [
        "Analyze this Amazon review dataset and produce a target-vs-competitor structured VOC report.",
        "Use concise, evidence-backed language.",
        "Return JSON with these top-level keys exactly:",
        "dataset_overview, target_overview, competitor_overview, target_positive_themes, target_negative_themes, competitor_positive_themes, competitor_negative_themes, buyer_desires, buyer_objections, usage_scenarios, usage_where, usage_when, usage_how, product_what, user_personas, purchase_drivers, negative_opinions, unmet_needs, baseline_requirements, performance_levers, differentiators, comparison_opportunities, comparison_risks, execution_tasks, listing_draft, image_brief, a_plus_brief, voc_response_matrix, image_strategy, copy_strategy",
        "",
        "JSON shape requirements:",
        '- target_positive_themes: array of { "theme": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- target_negative_themes: array of { "theme": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- competitor_positive_themes: array of { "theme": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- competitor_negative_themes: array of { "theme": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- buyer_desires: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- buyer_objections: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- usage_scenarios: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- usage_where: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- usage_when: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- usage_how: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- product_what: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- user_personas: array of { "name": string, "who": string, "goal": string, "pain_point": string, "message_angle": string }',
        '- purchase_drivers: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- negative_opinions: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- unmet_needs: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- baseline_requirements: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- performance_levers: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- differentiators: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- comparison_opportunities: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- comparison_risks: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- execution_tasks: array of { "task_title": string, "priority": "p1"|"p2"|"p3", "workstream": "positioning"|"listing"|"image"|"ads", "concrete_action": string, "expected_impact": string, "success_signal": string }',
        '- listing_draft: object with title_draft, title_rationale, bullet_drafts[], bullet_rationales[], positioning_statement',
        '- image_brief: array of { "slot": string, "goal": string, "message": string, "supporting_proof": string, "visual_direction": string }',
        '- a_plus_brief: array of { "module": string, "goal": string, "key_message": string, "supporting_proof": string, "content_direction": string }',
        '- voc_response_matrix: array of { "voc_theme": string, "buyer_signal": string, "risk_or_opportunity": string, "execution_area": "positioning"|"listing"|"image"|"ads", "priority": "p1"|"p2"|"p3", "why_now": string, "recommended_listing_response": string, "recommended_image_response": string, "recommended_ad_angle": string, "confidence": "low"|"medium"|"high" }',
        '- image_strategy: object with hero_image, feature_callouts[], objection_handling_images[], lifestyle_scenes[]',
        '- copy_strategy: object with title_angles[], bullet_angles[], proof_phrases[]',
        "",
        "Rules:",
        "- target_overview and competitor_overview should echo the dataset stats provided to you without inventing numbers.",
        "- Keep target_positive_themes and target_negative_themes to at most 5 items each.",
        "- Keep competitor_positive_themes and competitor_negative_themes to 5 to 8 items when enough evidence exists; otherwise return as many solid items as the evidence supports, up to 8.",
        "- Keep buyer_desires, buyer_objections, usage_scenarios, usage_where, usage_when, usage_how, product_what, purchase_drivers, negative_opinions, unmet_needs, baseline_requirements, performance_levers, differentiators, comparison_opportunities, and comparison_risks to at most 5 items each.",
        "- Keep user_personas to at most 3 items.",
        "- Each user_persona should be grounded in the reviews and should be useful for listing and image decisions, not vague demographics.",
        "- For all label-summary arrays, include 1 to 3 short evidence snippets whenever the reviews support them.",
        "- For every label-summary item, mention_count must be the number of provided representative reviews that mention or clearly imply that item. Only count the reviews shown in the prompt. Do not estimate beyond the provided sample.",
        "- For every theme list item, mention_count must be the number of provided representative reviews that mention or clearly imply that theme. Only count the reviews shown in the prompt. Do not estimate beyond the provided sample.",
        "- usage_where should capture locations or environmental contexts of use.",
        "- usage_when should capture timing, moments, or triggers for use.",
        "- usage_how should capture the way people use the product, including posture, routine, or process.",
        "- product_what should capture the specific attributes, features, materials, dimensions, or product qualities buyers keep talking about.",
        "- purchase_drivers should capture what most pushes people toward purchase in this category or product context.",
        "- negative_opinions should capture what most causes doubt, dissatisfaction, or abandonment risk.",
        "- unmet_needs should capture needs that reviews imply are not fully addressed by current competitor offerings.",
        "- baseline_requirements should capture table-stakes expectations: if these are unclear or weak, conversion suffers.",
        "- performance_levers should capture areas where better execution meaningfully improves conversion compared with weaker rivals.",
        "- differentiators should capture angles that can genuinely separate the target product from competitors instead of repeating category clichés.",
        "- Keep execution_tasks to at most 6 items and sort them by priority, with p1 first.",
        "- Every execution task must be concrete enough that a seller or operator can act on it this week.",
        "- listing_draft.bullet_drafts should contain exactly 5 bullets when enough evidence exists, otherwise as many solid bullets as the evidence supports.",
        "- listing_draft should reflect a differentiated target product angle, not a generic rewrite.",
        '- image_brief should contain 8 items when enough evidence exists: Main Image, Core Value, Primary Lifestyle, Secondary Lifestyle, Feature Proof, Material Detail, Dimensions & Fit, Objection Closer.',
        "- Each image_brief item should tell a designer what the image is supposed to accomplish, what buyer doubt it resolves, and what kind of visual base image should be created.",
        "- image_brief should be planned as a fixed 1+7 Amazon listing image system, not as arbitrary image ideas.",
        '- a_plus_brief should contain 4 to 6 modules when enough evidence exists, for example Brand story, Core value, Feature proof, Objection handling, Lifestyle, Comparison.',
        "- Each a_plus_brief item should explain what that module should accomplish and how it should support conversion.",
        "- Keep voc_response_matrix to at most 8 items and sort it by action priority, with p1 first.",
        "- p1 means immediate conversion impact, p2 means important but secondary, p3 means useful later.",
        "- If there are no target reviews, target_positive_themes and target_negative_themes must be empty arrays.",
        "- Use listing inputs to judge what competitors are already saying well or poorly, not just what reviews say.",
        "- When listing inputs are missing, do not invent them; rely on the reviews that are available.",
        "- Every evidence entry should be a short review-derived quote or paraphrase, no more than 140 characters.",
        "- Do not invent product features not supported by reviews.",
        "- Keep recommendations practical for listing, image, and advertising decisions.",
        "- If there are no target reviews, infer target-side opportunities from competitor review gaps and say so implicitly in the summaries.",
        "",
        `Global dataset overview: ${JSON.stringify(datasetOverview)}`,
        `Target review overview: ${JSON.stringify(targetOverview)}`,
        `Competitor review overview: ${JSON.stringify(competitorOverview)}`,
        "",
        "Target listing inputs:",
        targetListingBlocks || "No target listing inputs provided.",
        "",
        "Competitor listing inputs:",
        competitorListingBlocks || "No competitor listing inputs provided.",
        "",
        "Representative target reviews (balanced across positive, negative, recent, and high-helpful reviews):",
        representativeTargetReviews || "No target reviews provided.",
        "",
        "Representative competitor reviews (balanced across positive, negative, recent, and high-helpful reviews):",
        representativeCompetitorReviews || "No competitor reviews provided.",
      ].join("\n"),
    },
  ];

  return messages;
}

function buildCompetitorInsightPrompt({
  competitor,
  reviews,
}: {
  competitor: DbProjectProductRow;
  reviews: DbReviewRow[];
}) {
  const representativeReviews = pickRepresentativeReviews(reviews)
    .map((review, index) => `${index + 1}. ${reviewToPromptLine(review)}`)
    .join("\n");

  const messages: OpenAiMessage[] = [
    {
      role: "system",
      content:
        "You are an Amazon seller competitor analyst. Return valid JSON only. Do not include markdown. Ground every conclusion in the provided competitor reviews and listing inputs.",
    },
    {
      role: "user",
      content: [
        "Analyze this single Amazon competitor and produce a compact competitor insight report.",
        "Use concise, evidence-backed language.",
        "Return JSON with these top-level keys exactly:",
        "positive_themes, negative_themes, purchase_drivers, negative_opinions, listing_angles, inspiration_for_target",
        "",
        "JSON shape requirements:",
        '- positive_themes: array of { "theme": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- negative_themes: array of { "theme": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- purchase_drivers: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- negative_opinions: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- listing_angles: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        '- inspiration_for_target: array of { "label": string, "summary": string, "mention_count": number, "evidence": string[] }',
        "",
        "Rules:",
        "- Keep positive_themes and negative_themes to 5 to 8 items when enough evidence exists; otherwise return as many solid items as the evidence supports, up to 8.",
        "- Keep purchase_drivers, negative_opinions, listing_angles, and inspiration_for_target to at most 4 items each.",
        "- Every evidence entry should be a short review-derived quote or listing-derived paraphrase, no more than 140 characters.",
        "- For every theme list item, mention_count must be the number of provided representative reviews that mention or clearly imply that theme. Only count the reviews shown in the prompt. Do not estimate beyond the provided sample.",
        "- For every label-summary item, mention_count must be the number of provided representative reviews that mention or clearly imply that item. Only count the reviews shown in the prompt. Do not estimate beyond the provided sample.",
        "- positive_themes and negative_themes should focus on what buyers repeatedly praise or criticize about this competitor.",
        "- purchase_drivers should explain why buyers choose this competitor.",
        "- negative_opinions should focus on what creates dissatisfaction, risk, or abandonment.",
        "- listing_angles should explain what this competitor is currently emphasizing in its title/bullets/description.",
        "- inspiration_for_target should convert the competitor's strengths and weaknesses into practical guidance for the target product.",
        "- Do not invent product features not supported by the inputs.",
        "",
        "Competitor listing inputs:",
        listingToPromptBlock(competitor),
        "",
        "Representative competitor reviews (balanced across positive, negative, recent, and high-helpful reviews):",
        representativeReviews || "No competitor reviews provided.",
      ].join("\n"),
    },
  ];

  return messages;
}

function buildListingDraftPrompt({
  datasetOverview,
  targetOverview,
  competitorOverview,
  targetReviews,
  competitorReviews,
  targetProducts,
  competitorProducts,
}: {
  datasetOverview: ReturnType<typeof computeDatasetOverview>;
  targetOverview: ReturnType<typeof computeDatasetOverview>;
  competitorOverview: ReturnType<typeof computeDatasetOverview>;
  targetReviews: DbReviewRow[];
  competitorReviews: DbReviewRow[];
  targetProducts: DbProjectProductRow[];
  competitorProducts: DbProjectProductRow[];
}) {
  const representativeTargetReviews = pickRepresentativeReviews(targetReviews)
    .map((review, index) => `${index + 1}. ${reviewToPromptLine(review)}`)
    .join("\n");
  const representativeCompetitorReviews = pickRepresentativeReviews(competitorReviews)
    .map((review, index) => `${index + 1}. ${reviewToPromptLine(review)}`)
    .join("\n");
  const targetListingBlocks = targetProducts
    .map((product, index) => `Target ${index + 1}\n${listingToPromptBlock(product)}`)
    .join("\n\n");
  const competitorListingBlocks = competitorProducts
    .map((product, index) => `Competitor ${index + 1}\n${listingToPromptBlock(product)}`)
    .join("\n\n");

  const messages: OpenAiMessage[] = [
    {
      role: "system",
      content:
        "You are an Amazon listing strategist. Return valid JSON only. Do not include markdown. Use the provided reviews and competitor listing inputs to generate only a strong, differentiated listing draft.",
    },
    {
      role: "user",
      content: [
        "Generate only the Amazon listing draft for this project.",
        "Use concise, conversion-focused language.",
        "Return JSON with this top-level key exactly:",
        "listing_draft",
        "",
        "JSON shape requirements:",
        '- listing_draft: object with { "title_draft": string, "title_rationale": string, "bullet_drafts": string[], "bullet_rationales": string[], "positioning_statement": string }',
        "",
        "Rules:",
        "- listing_draft.bullet_drafts should contain exactly 5 bullets when enough evidence exists, otherwise as many solid bullets as the evidence supports.",
        "- listing_draft should reflect a differentiated target product angle, not a generic rewrite.",
        "- title_rationale should briefly explain the chosen angle in plain language.",
        "- bullet_rationales should align 1:1 with bullet_drafts.",
        "- positioning_statement should be short and useful internally, but do not optimize around it over title and bullets.",
        "- Use listing inputs to judge what competitors are already saying well or poorly, not just what reviews say.",
        "- When listing inputs are missing, do not invent them; rely on the reviews that are available.",
        "- Do not invent product features not supported by reviews or listing inputs.",
        "- Prioritize clarity, differentiation, and conversion value over keyword stuffing.",
        "",
        `Global dataset overview: ${JSON.stringify(datasetOverview)}`,
        `Target review overview: ${JSON.stringify(targetOverview)}`,
        `Competitor review overview: ${JSON.stringify(competitorOverview)}`,
        "",
        "Target listing inputs:",
        targetListingBlocks || "No target listing inputs provided.",
        "",
        "Competitor listing inputs:",
        competitorListingBlocks || "No competitor listing inputs provided.",
        "",
        "Representative target reviews (balanced across positive, negative, recent, and high-helpful reviews):",
        representativeTargetReviews || "No target reviews provided.",
        "",
        "Representative competitor reviews (balanced across positive, negative, recent, and high-helpful reviews):",
        representativeCompetitorReviews || "No competitor reviews provided.",
      ].join("\n"),
    },
  ];

  return messages;
}

async function callLlm<T>({
  messages,
  projectId,
  provider = "openai",
  model,
}: {
  messages: OpenAiMessage[];
  projectId?: string;
  provider?: AnalysisProvider;
  model?: string;
}) {
  if (provider === "gemini") {
    const apiKey =
      (projectId ? await resolveProjectApiKey(projectId, "gemini") : null) ??
      process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_GENAI_API_KEY ??
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error("Missing Gemini API key.");
    }

    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: model || process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash",
      contents: messages
        .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
        .join("\n\n"),
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });
    const content = response.text;

    if (!content) {
      throw new Error("Gemini response did not include any content");
    }

    return JSON.parse(content) as T;
  }

  const apiKey =
    (projectId ? await resolveProjectApiKey(projectId, "openai") : null) ??
    requireOpenAiEnv("OPENAI_API_KEY");
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: model || process.env.OPENAI_MODEL || "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages,
    temperature: 0.3,
  });
  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI response did not include any content");
  }

  return JSON.parse(content) as T;
}

function createExportText(report: AnalysisReportShape) {
  const lines: string[] = [];

  lines.push("亚马逊卖家 VOC 分析报告");
  lines.push("");
  lines.push(`评论数量：${report.dataset_overview.review_count}`);
  lines.push(`ASIN 数量：${report.dataset_overview.asin_count}`);
  lines.push("");
  lines.push("我的商品正向主题：");

  for (const item of report.target_positive_themes) {
    const countLabel =
      typeof item.mention_count === "number" ? `（提及 ${item.mention_count} 次）` : "";
    lines.push(`- ${item.theme}${countLabel}: ${item.summary}`);
  }

  lines.push("");
  lines.push("竞品正向主题：");

  for (const item of report.competitor_positive_themes) {
    const countLabel =
      typeof item.mention_count === "number" ? `（提及 ${item.mention_count} 次）` : "";
    lines.push(`- ${item.theme}${countLabel}: ${item.summary}`);
  }

  lines.push("");
  lines.push("定位机会：");

  for (const item of report.comparison_opportunities) {
    lines.push(`- ${item.label}: ${item.summary}`);
  }

  lines.push("");
  lines.push("买家顾虑：");

  for (const item of report.buyer_objections) {
    lines.push(`- ${item.label}: ${item.summary}`);
  }

  lines.push("");
  lines.push("使用场景：");

  for (const item of report.usage_scenarios) {
    lines.push(`- ${item.label}: ${item.summary}`);
  }

  lines.push("");
  lines.push("Where：");

  for (const item of report.usage_where) {
    lines.push(`- ${item.label}: ${item.summary}`);
  }

  lines.push("");
  lines.push("When：");

  for (const item of report.usage_when) {
    lines.push(`- ${item.label}: ${item.summary}`);
  }

  lines.push("");
  lines.push("How：");

  for (const item of report.usage_how) {
    lines.push(`- ${item.label}: ${item.summary}`);
  }

  lines.push("");
  lines.push("What：");

  for (const item of report.product_what) {
    lines.push(`- ${item.label}: ${item.summary}`);
  }

  lines.push("");
  lines.push("卖点分层：");

  for (const item of report.baseline_requirements) {
    lines.push(`- Baseline｜${item.label}: ${item.summary}`);
  }

  for (const item of report.performance_levers) {
    lines.push(`- Performance｜${item.label}: ${item.summary}`);
  }

  for (const item of report.differentiators) {
    lines.push(`- Differentiator｜${item.label}: ${item.summary}`);
  }

  lines.push("");
  lines.push("本周任务单：");

  for (const item of sortExecutionTasks(report.execution_tasks)) {
    lines.push(
      `- [${item.priority.toUpperCase()}][${item.workstream}] ${item.task_title}：${item.concrete_action}`,
    );
  }

  lines.push("");
  lines.push("Listing Draft：");
  lines.push(`- 标题草案：${report.listing_draft.title_draft}`);
  lines.push(`- 定位句：${report.listing_draft.positioning_statement}`);

  for (const bullet of report.listing_draft.bullet_drafts) {
    lines.push(`- Bullet：${bullet}`);
  }

  lines.push("");
  lines.push("Image Brief：");

  for (const item of report.image_brief) {
    lines.push(`- ${item.slot}：${item.goal}｜${item.message}`);
  }

  lines.push("");
  lines.push("A+ Brief：");

  for (const item of report.a_plus_brief) {
    lines.push(`- ${item.module}：${item.goal}｜${item.key_message}`);
  }

  lines.push("");
  lines.push("优先执行清单：");

  for (const item of sortVocResponseItems(report.voc_response_matrix)) {
    lines.push(`- [${item.priority.toUpperCase()}][${item.execution_area}] ${item.voc_theme}：${item.why_now}`);
  }

  lines.push("");
  lines.push("图片策略：");
  lines.push(`- 主图：${report.image_strategy.hero_image}`);

  for (const line of report.image_strategy.feature_callouts) {
    lines.push(`- 功能卖点图：${line}`);
  }

  lines.push("");
  lines.push("文案策略：");

  for (const line of report.copy_strategy.title_angles) {
    lines.push(`- 标题角度：${line}`);
  }

  return lines.join("\n");
}

function sortExecutionTasks(items: ExecutionTaskItem[]) {
  const priorityOrder: Record<ExecutionTaskItem["priority"], number> = {
    p1: 0,
    p2: 1,
    p3: 2,
  };

  return [...items].sort((left, right) => {
    const leftPriority = priorityOrder[left.priority] ?? 99;
    const rightPriority = priorityOrder[right.priority] ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.task_title.localeCompare(right.task_title);
  });
}

function sortVocResponseItems(items: VocResponseItem[]) {
  const priorityOrder: Record<VocResponseItem["priority"], number> = {
    p1: 0,
    p2: 1,
    p3: 2,
  };

  return [...items].sort((left, right) => {
    const leftPriority = priorityOrder[left.priority] ?? 99;
    const rightPriority = priorityOrder[right.priority] ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.voc_theme.localeCompare(right.voc_theme);
  });
}

async function updateAnalysisRunProgress({
  runId,
  stage,
  progress,
}: {
  runId: string;
  stage:
    | "queued"
    | "normalizing"
    | "loading_reviews"
    | "llm_analyzing"
    | "writing_report"
    | "completed"
    | "failed";
  progress: number;
}) {
  const supabase = createAdminSupabaseClient();
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

  const { error } = await supabase
    .from("analysis_runs")
    .update({
      stage,
      progress: clampedProgress,
    })
    .eq("id", runId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function generateAnalysisReportForProject(
  projectId: string,
  options?: {
    runId?: string;
    provider?: AnalysisProvider;
    modelName?: string;
  },
) {
  const supabase = createAdminSupabaseClient();
  const provider = options?.provider || "openai";
  const modelName =
    options?.modelName ||
    (provider === "gemini"
      ? process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash"
      : process.env.OPENAI_MODEL || "gpt-4.1-mini");
  const existingRunId = options?.runId;
  let run: { id: string } | null = null;

  if (existingRunId) {
    const { data: existingRun, error: existingRunError } = await supabase
      .from("analysis_runs")
      .select("id")
      .eq("id", existingRunId)
      .eq("project_id", projectId)
      .eq("run_type", "voc_report")
      .single();

    if (existingRunError || !existingRun) {
      throw new Error(existingRunError?.message ?? "Failed to load analysis run");
    }

    const { error: markRunningError } = await supabase
      .from("analysis_runs")
      .update({
        status: "running",
        model_name: modelName,
        stage: "normalizing",
        progress: 5,
        started_at: new Date().toISOString(),
        completed_at: null,
        error_message: null,
      })
      .eq("id", existingRun.id);

    if (markRunningError) {
      throw new Error(markRunningError.message);
    }

    run = existingRun;
  } else {
    const { data: insertedRun, error: runError } = await supabase
      .from("analysis_runs")
      .insert({
        project_id: projectId,
        run_type: "voc_report",
        status: "running",
        stage: "loading_reviews",
        progress: 20,
        model_name: modelName,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runError || !insertedRun) {
      throw new Error(runError?.message ?? "Failed to create analysis run");
    }

    run = insertedRun;
  }

  if (!run) {
    throw new Error("Failed to initialize analysis run");
  }

  try {
    await updateAnalysisRunProgress({
      runId: run.id,
      stage: "normalizing",
      progress: 10,
    });

    await normalizePendingUploadedReviewsForProject(projectId);

    await updateAnalysisRunProgress({
      runId: run.id,
      stage: "loading_reviews",
      progress: 25,
    });

    const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select(
        "id, project_product_id, asin, model, review_title, review_body, rating, review_date, country, helpful_count, image_count, has_video",
        )
      .eq("project_id", projectId)
      .order("review_date", { ascending: false });

    const { data: projectProducts, error: projectProductsError } = await supabase
      .from("project_products")
      .select(
        "id, role, name, asin, market, product_url, current_title, current_bullets, current_description",
      )
      .eq("project_id", projectId);

    if (reviewsError) {
      throw new Error(reviewsError.message);
    }

    if (projectProductsError) {
      throw new Error(projectProductsError.message);
    }

    if (!reviews || reviews.length === 0) {
      throw new Error(
        "No reviews found for this project. Please upload review files and ensure they are normalized successfully.",
      );
    }

    const roleByProductId = new Map(
      (projectProducts ?? []).map((product) => [product.id, product.role] as const),
    );
    const targetProducts = (projectProducts ?? []).filter((product) => product.role === "target");
    const competitorProducts = (projectProducts ?? []).filter(
      (product) => product.role === "competitor",
    );
    const targetReviews = reviews.filter(
      (review) => review.project_product_id && roleByProductId.get(review.project_product_id) === "target",
    );
    const competitorReviews = reviews.filter(
      (review) =>
        review.project_product_id &&
        roleByProductId.get(review.project_product_id) === "competitor",
    );

    const datasetOverview = computeDatasetOverview(reviews);
    const targetOverview = computeDatasetOverview(targetReviews);
    const competitorOverview = computeDatasetOverview(competitorReviews);

    await updateAnalysisRunProgress({
      runId: run.id,
      stage: "llm_analyzing",
      progress: 55,
    });

    const prompt = buildPrompt({
      datasetOverview,
      targetOverview,
      competitorOverview,
      targetReviews,
      competitorReviews,
      targetProducts,
      competitorProducts,
    });
    const modelReport = await callLlm<AnalysisReportShape>({
      messages: prompt,
      projectId,
      provider,
      model: modelName,
    });

    const report: AnalysisReportShape = {
      ...modelReport,
      dataset_overview: datasetOverview,
      target_overview: targetOverview,
      competitor_overview: competitorOverview,
      target_positive_themes:
        targetReviews.length > 0
          ? normalizeThemeItems(modelReport.target_positive_themes, 5)
          : [],
      target_negative_themes:
        targetReviews.length > 0
          ? normalizeThemeItems(modelReport.target_negative_themes, 5)
          : [],
      competitor_positive_themes: normalizeThemeItems(
        modelReport.competitor_positive_themes,
        8,
      ),
      competitor_negative_themes: normalizeThemeItems(
        modelReport.competitor_negative_themes,
        8,
      ),
      buyer_objections: normalizeLabelSummaryItems(modelReport.buyer_objections, 5),
      usage_scenarios: normalizeLabelSummaryItems(modelReport.usage_scenarios, 5),
      usage_where: normalizeLabelSummaryItems(modelReport.usage_where, 5),
      usage_when: normalizeLabelSummaryItems(modelReport.usage_when, 5),
      usage_how: normalizeLabelSummaryItems(modelReport.usage_how, 5),
      product_what: normalizeLabelSummaryItems(modelReport.product_what, 5),
      user_personas: modelReport.user_personas ?? [],
      buyer_desires: normalizeLabelSummaryItems(modelReport.buyer_desires, 5),
      purchase_drivers: normalizeLabelSummaryItems(modelReport.purchase_drivers, 5),
      negative_opinions: normalizeLabelSummaryItems(modelReport.negative_opinions, 5),
      unmet_needs: normalizeLabelSummaryItems(modelReport.unmet_needs, 5),
      baseline_requirements: normalizeLabelSummaryItems(modelReport.baseline_requirements, 5),
      performance_levers: normalizeLabelSummaryItems(modelReport.performance_levers, 5),
      differentiators: normalizeLabelSummaryItems(modelReport.differentiators, 5),
      comparison_opportunities: normalizeLabelSummaryItems(
        modelReport.comparison_opportunities,
        5,
      ),
      comparison_risks: normalizeLabelSummaryItems(modelReport.comparison_risks, 5),
      execution_tasks: sortExecutionTasks(modelReport.execution_tasks ?? []),
      listing_draft: {
        title_draft: modelReport.listing_draft?.title_draft ?? "",
        title_rationale: modelReport.listing_draft?.title_rationale ?? "",
        bullet_drafts: modelReport.listing_draft?.bullet_drafts ?? [],
        bullet_rationales: modelReport.listing_draft?.bullet_rationales ?? [],
        positioning_statement:
          modelReport.listing_draft?.positioning_statement ?? "",
      },
      image_brief: modelReport.image_brief ?? [],
      a_plus_brief: modelReport.a_plus_brief ?? [],
      voc_response_matrix: sortVocResponseItems(modelReport.voc_response_matrix ?? []),
    };

    await updateAnalysisRunProgress({
      runId: run.id,
      stage: "writing_report",
      progress: 80,
    });

    const summaryJson = {
      dataset_overview: report.dataset_overview,
      target_overview: report.target_overview,
      competitor_overview: report.competitor_overview,
      target_positive_themes: report.target_positive_themes,
      target_negative_themes: report.target_negative_themes,
      competitor_positive_themes: report.competitor_positive_themes,
      competitor_negative_themes: report.competitor_negative_themes,
      buyer_desires: report.buyer_desires,
      buyer_objections: report.buyer_objections,
      usage_scenarios: report.usage_scenarios,
      usage_where: report.usage_where,
      usage_when: report.usage_when,
      usage_how: report.usage_how,
      product_what: report.product_what,
      user_personas: report.user_personas,
      purchase_drivers: report.purchase_drivers,
      negative_opinions: report.negative_opinions,
      unmet_needs: report.unmet_needs,
      baseline_requirements: report.baseline_requirements,
      performance_levers: report.performance_levers,
      differentiators: report.differentiators,
      comparison_opportunities: report.comparison_opportunities,
      comparison_risks: report.comparison_risks,
    };

    const strategyJson = {
      execution_tasks: report.execution_tasks,
      listing_draft: report.listing_draft,
      image_brief: report.image_brief,
      a_plus_brief: report.a_plus_brief,
      voc_response_matrix: report.voc_response_matrix,
      image_strategy: report.image_strategy,
      copy_strategy: report.copy_strategy,
    };

    const exportText = createExportText(report);

    const { error: reportError } = await supabase.from("analysis_reports").insert({
      project_id: projectId,
      analysis_run_id: run.id,
      report_version: "v1",
      summary_json: summaryJson,
      strategy_json: strategyJson,
      export_text: exportText,
    });

    if (reportError) {
      throw new Error(reportError.message);
    }

    const { error: completeRunError } = await supabase
      .from("analysis_runs")
      .update({
        status: "completed",
        stage: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    if (completeRunError) {
      throw new Error(completeRunError.message);
    }

    return {
      runId: run.id,
      report,
    };
  } catch (error) {
    await supabase
      .from("analysis_runs")
      .update({
        status: "failed",
        stage: "failed",
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : "Analysis failed",
      })
      .eq("id", run.id);

    throw error;
  }
}

export async function generateCompetitorInsightForProduct({
  projectId,
  productId,
  provider = "openai",
  modelName,
}: {
  projectId: string;
  productId: string;
  provider?: AnalysisProvider;
  modelName?: string;
}) {
  const supabase = createAdminSupabaseClient();

  const [{ data: product, error: productError }, { data: reviews, error: reviewsError }] =
    await Promise.all([
      supabase
        .from("project_products")
        .select(
          "id, role, name, asin, market, product_url, current_title, current_bullets, current_description",
        )
        .eq("project_id", projectId)
        .eq("id", productId)
        .single(),
      supabase
        .from("reviews")
        .select(
          "id, project_product_id, asin, model, review_title, review_body, rating, review_date, country, helpful_count, image_count, has_video",
        )
        .eq("project_id", projectId)
        .eq("project_product_id", productId)
        .order("review_date", { ascending: false }),
    ]);

  if (productError || !product) {
    throw new Error(productError?.message ?? "Competitor product not found");
  }

  if (product.role !== "competitor") {
    throw new Error("Only competitor products support competitor insight analysis");
  }

  if (reviewsError) {
    throw new Error(reviewsError.message);
  }

  if (!reviews || reviews.length === 0) {
    throw new Error("No reviews found for this competitor");
  }

  const modelInsight = await callLlm<CompetitorInsightShape>({
    messages: buildCompetitorInsightPrompt({
      competitor: product,
      reviews,
    }),
    projectId,
    provider,
    model: modelName,
  });

  return {
    positive_themes: normalizeThemeItems(modelInsight.positive_themes, 8),
    negative_themes: normalizeThemeItems(modelInsight.negative_themes, 8),
    purchase_drivers: normalizeLabelSummaryItems(modelInsight.purchase_drivers, 4),
    negative_opinions: normalizeLabelSummaryItems(modelInsight.negative_opinions, 4),
    listing_angles: normalizeLabelSummaryItems(modelInsight.listing_angles, 4),
    inspiration_for_target: normalizeLabelSummaryItems(
      modelInsight.inspiration_for_target,
      4,
    ),
  } as CompetitorInsightShape;
}

export async function regenerateListingDraftForProject(projectId: string) {
  const supabase = createAdminSupabaseClient();

  await normalizePendingUploadedReviewsForProject(projectId);

  const [
    { data: reviews, error: reviewsError },
    { data: projectProducts, error: projectProductsError },
    { data: latestReport, error: latestReportError },
  ] = await Promise.all([
    supabase
      .from("reviews")
      .select(
        "id, project_product_id, asin, model, review_title, review_body, rating, review_date, country, helpful_count, image_count, has_video",
      )
      .eq("project_id", projectId)
      .order("review_date", { ascending: false }),
    supabase
      .from("project_products")
      .select(
        "id, role, name, asin, market, product_url, current_title, current_bullets, current_description",
      )
      .eq("project_id", projectId),
    supabase
      .from("analysis_reports")
      .select("id, summary_json, strategy_json")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (reviewsError) {
    throw new Error(reviewsError.message);
  }

  if (projectProductsError) {
    throw new Error(projectProductsError.message);
  }

  if (latestReportError) {
    throw new Error(latestReportError.message);
  }

  if (!reviews || reviews.length === 0) {
    throw new Error("No reviews found for this project.");
  }

  if (!latestReport) {
    throw new Error("No analysis report found for this project.");
  }

  const roleByProductId = new Map(
    (projectProducts ?? []).map((product) => [product.id, product.role] as const),
  );
  const targetProducts = (projectProducts ?? []).filter((product) => product.role === "target");
  const competitorProducts = (projectProducts ?? []).filter(
    (product) => product.role === "competitor",
  );
  const targetReviews = reviews.filter(
    (review) =>
      review.project_product_id && roleByProductId.get(review.project_product_id) === "target",
  );
  const competitorReviews = reviews.filter(
    (review) =>
      review.project_product_id &&
      roleByProductId.get(review.project_product_id) === "competitor",
  );

  const datasetOverview = computeDatasetOverview(reviews);
  const targetOverview = computeDatasetOverview(targetReviews);
  const competitorOverview = computeDatasetOverview(competitorReviews);

  const prompt = buildListingDraftPrompt({
    datasetOverview,
    targetOverview,
    competitorOverview,
    targetReviews,
    competitorReviews,
    targetProducts,
    competitorProducts,
  });

  const modelResult = await callLlm<ListingDraftOnlyShape>({
    messages: prompt,
    projectId,
  });
  const listingDraft: ListingDraftShape = {
    title_draft: modelResult.listing_draft?.title_draft ?? "",
    title_rationale: modelResult.listing_draft?.title_rationale ?? "",
    bullet_drafts: modelResult.listing_draft?.bullet_drafts ?? [],
    bullet_rationales: modelResult.listing_draft?.bullet_rationales ?? [],
    positioning_statement: modelResult.listing_draft?.positioning_statement ?? "",
  };

  const summaryJson = (latestReport.summary_json ?? {}) as Partial<AnalysisReportShape>;
  const strategyJson = (latestReport.strategy_json ?? {}) as Partial<AnalysisReportShape>;
  const mergedReport = {
    ...summaryJson,
    ...strategyJson,
    dataset_overview: summaryJson.dataset_overview ?? datasetOverview,
    target_overview: summaryJson.target_overview ?? targetOverview,
    competitor_overview: summaryJson.competitor_overview ?? competitorOverview,
    listing_draft: listingDraft,
  } as AnalysisReportShape;

  const nextStrategyJson = {
    ...strategyJson,
    listing_draft: listingDraft,
  };

  const { error: updateError } = await supabase
    .from("analysis_reports")
    .update({
      strategy_json: nextStrategyJson,
      export_text: createExportText(mergedReport),
    })
    .eq("id", latestReport.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    reportId: latestReport.id,
    listingDraft,
  };
}
