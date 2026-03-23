import OpenAI from "openai";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

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
  image_count: number;
  has_video: boolean;
};

type OpenAiMessage = {
  role: "system" | "user";
  content: string;
};

export type ThemeItem = {
  theme: string;
  summary: string;
  evidence: string[];
};

export type LabelSummaryItem = {
  label: string;
  summary: string;
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
  comparison_opportunities: LabelSummaryItem[];
  comparison_risks: LabelSummaryItem[];
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

function pickRepresentativeReviews(reviews: DbReviewRow[]) {
  const negative = reviews
    .filter((review) => (review.rating ?? 0) <= 2)
    .sort((left, right) => {
      const leftScore = left.image_count * 100 + left.review_body.length;
      const rightScore = right.image_count * 100 + right.review_body.length;
      return rightScore - leftScore;
    })
    .slice(0, 24);

  const neutral = reviews
    .filter((review) => review.rating === 3)
    .sort((left, right) => right.review_body.length - left.review_body.length)
    .slice(0, 12);

  const positive = reviews
    .filter((review) => (review.rating ?? 0) >= 4)
    .sort((left, right) => {
      const leftScore = left.image_count * 100 + left.review_body.length;
      const rightScore = right.image_count * 100 + right.review_body.length;
      return rightScore - leftScore;
    })
    .slice(0, 28);

  return [...negative, ...neutral, ...positive].slice(0, 64);
}

function reviewToPromptLine(review: DbReviewRow) {
  const excerpt = review.review_body.replace(/\s+/g, " ").slice(0, 340);

  return [
    `asin=${review.asin ?? "-"}`,
    `rating=${review.rating ?? "-"}`,
    `model=${review.model ?? "-"}`,
    `country=${review.country ?? "-"}`,
    `date=${review.review_date ?? "-"}`,
    `title=${review.review_title || "-"}`,
    `body=${excerpt}`,
  ].join(" | ");
}

function buildPrompt({
  datasetOverview,
  targetOverview,
  competitorOverview,
  targetReviews,
  competitorReviews,
}: {
  datasetOverview: ReturnType<typeof computeDatasetOverview>;
  targetOverview: ReturnType<typeof computeDatasetOverview>;
  competitorOverview: ReturnType<typeof computeDatasetOverview>;
  targetReviews: DbReviewRow[];
  competitorReviews: DbReviewRow[];
}) {
  const representativeTargetReviews = pickRepresentativeReviews(targetReviews)
    .map((review, index) => `${index + 1}. ${reviewToPromptLine(review)}`)
    .join("\n");
  const representativeCompetitorReviews = pickRepresentativeReviews(competitorReviews)
    .map((review, index) => `${index + 1}. ${reviewToPromptLine(review)}`)
    .join("\n");

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
        "dataset_overview, target_overview, competitor_overview, target_positive_themes, target_negative_themes, competitor_positive_themes, competitor_negative_themes, buyer_desires, buyer_objections, usage_scenarios, comparison_opportunities, comparison_risks, voc_response_matrix, image_strategy, copy_strategy",
        "",
        "JSON shape requirements:",
        '- target_positive_themes: array of { "theme": string, "summary": string, "evidence": string[] }',
        '- target_negative_themes: array of { "theme": string, "summary": string, "evidence": string[] }',
        '- competitor_positive_themes: array of { "theme": string, "summary": string, "evidence": string[] }',
        '- competitor_negative_themes: array of { "theme": string, "summary": string, "evidence": string[] }',
        '- buyer_desires: array of { "label": string, "summary": string }',
        '- buyer_objections: array of { "label": string, "summary": string }',
        '- usage_scenarios: array of { "label": string, "summary": string }',
        '- comparison_opportunities: array of { "label": string, "summary": string }',
        '- comparison_risks: array of { "label": string, "summary": string }',
        '- voc_response_matrix: array of { "voc_theme": string, "buyer_signal": string, "risk_or_opportunity": string, "execution_area": "positioning"|"listing"|"image"|"ads", "priority": "p1"|"p2"|"p3", "why_now": string, "recommended_listing_response": string, "recommended_image_response": string, "recommended_ad_angle": string, "confidence": "low"|"medium"|"high" }',
        '- image_strategy: object with hero_image, feature_callouts[], objection_handling_images[], lifestyle_scenes[]',
        '- copy_strategy: object with title_angles[], bullet_angles[], proof_phrases[]',
        "",
        "Rules:",
        "- target_overview and competitor_overview should echo the dataset stats provided to you without inventing numbers.",
        "- Keep each theme list to at most 5 items.",
        "- Keep buyer_desires, buyer_objections, usage_scenarios, comparison_opportunities, and comparison_risks to at most 5 items each.",
        "- Keep voc_response_matrix to at most 8 items and sort it by action priority, with p1 first.",
        "- p1 means immediate conversion impact, p2 means important but secondary, p3 means useful later.",
        "- Every evidence entry should be a short review-derived quote or paraphrase, no more than 140 characters.",
        "- Do not invent product features not supported by reviews.",
        "- Keep recommendations practical for listing, image, and advertising decisions.",
        "- If there are no target reviews, infer target-side opportunities from competitor review gaps and say so implicitly in the summaries.",
        "",
        `Global dataset overview: ${JSON.stringify(datasetOverview)}`,
        `Target review overview: ${JSON.stringify(targetOverview)}`,
        `Competitor review overview: ${JSON.stringify(competitorOverview)}`,
        "",
        "Representative target reviews:",
        representativeTargetReviews || "No target reviews provided.",
        "",
        "Representative competitor reviews:",
        representativeCompetitorReviews || "No competitor reviews provided.",
      ].join("\n"),
    },
  ];

  return messages;
}

async function callOpenAi(messages: OpenAiMessage[]) {
  const apiKey = requireOpenAiEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const client = new OpenAI({
    apiKey,
  });

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages,
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI response did not include any content");
  }

  return JSON.parse(content) as AnalysisReportShape;
}

function createExportText(report: AnalysisReportShape) {
  const lines: string[] = [];

  lines.push("Amazon Seller VOC Report");
  lines.push("");
  lines.push(`Review count: ${report.dataset_overview.review_count}`);
  lines.push(`ASIN count: ${report.dataset_overview.asin_count}`);
  lines.push("");
  lines.push("Target Positive Themes:");

  for (const item of report.target_positive_themes) {
    lines.push(`- ${item.theme}: ${item.summary}`);
  }

  lines.push("");
  lines.push("Competitor Positive Themes:");

  for (const item of report.competitor_positive_themes) {
    lines.push(`- ${item.theme}: ${item.summary}`);
  }

  lines.push("");
  lines.push("Comparison Opportunities:");

  for (const item of report.comparison_opportunities) {
    lines.push(`- ${item.label}: ${item.summary}`);
  }

  lines.push("");
  lines.push("Buyer Objections:");

  for (const item of report.buyer_objections) {
    lines.push(`- ${item.label}: ${item.summary}`);
  }

  lines.push("");
  lines.push("Priority Actions:");

  for (const item of sortVocResponseItems(report.voc_response_matrix)) {
    lines.push(`- [${item.priority.toUpperCase()}][${item.execution_area}] ${item.voc_theme}: ${item.why_now}`);
  }

  lines.push("");
  lines.push("Image Strategy:");
  lines.push(`- Hero image: ${report.image_strategy.hero_image}`);

  for (const line of report.image_strategy.feature_callouts) {
    lines.push(`- Feature callout: ${line}`);
  }

  lines.push("");
  lines.push("Copy Strategy:");

  for (const line of report.copy_strategy.title_angles) {
    lines.push(`- Title angle: ${line}`);
  }

  return lines.join("\n");
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

export async function generateAnalysisReportForProject(projectId: string) {
  const supabase = createAdminSupabaseClient();

  const { data: run, error: runError } = await supabase
    .from("analysis_runs")
    .insert({
      project_id: projectId,
      run_type: "voc_report",
      status: "running",
      model_name: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runError || !run) {
    throw new Error(runError?.message ?? "Failed to create analysis run");
  }

  try {
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select(
        "id, project_product_id, asin, model, review_title, review_body, rating, review_date, country, image_count, has_video",
      )
      .eq("project_id", projectId)
      .order("review_date", { ascending: false });

    const { data: projectProducts, error: projectProductsError } = await supabase
      .from("project_products")
      .select("id, role")
      .eq("project_id", projectId);

    if (reviewsError) {
      throw new Error(reviewsError.message);
    }

    if (projectProductsError) {
      throw new Error(projectProductsError.message);
    }

    if (!reviews || reviews.length === 0) {
      throw new Error("No reviews found for this project");
    }

    const roleByProductId = new Map(
      (projectProducts ?? []).map((product) => [product.id, product.role] as const),
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
    const prompt = buildPrompt({
      datasetOverview,
      targetOverview,
      competitorOverview,
      targetReviews,
      competitorReviews,
    });
    const modelReport = await callOpenAi(prompt);

    const report: AnalysisReportShape = {
      ...modelReport,
      dataset_overview: datasetOverview,
      target_overview: targetOverview,
      competitor_overview: competitorOverview,
      voc_response_matrix: sortVocResponseItems(modelReport.voc_response_matrix ?? []),
    };

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
      comparison_opportunities: report.comparison_opportunities,
      comparison_risks: report.comparison_risks,
    };

    const strategyJson = {
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
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : "Analysis failed",
      })
      .eq("id", run.id);

    throw error;
  }
}
