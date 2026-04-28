import type { AnalysisReportShape } from "@/lib/analysis";
import type { ImageBriefWorkbench } from "@/components/image-brief-workbench";
import type { ListingDeliverableCard } from "@/components/listing-deliverable-card";

export type AnalysisStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "pending";

export type ProjectReport = {
  dataset_overview?: Partial<AnalysisReportShape>["dataset_overview"];
  target_overview?: Partial<AnalysisReportShape>["target_overview"];
  competitor_overview?: Partial<AnalysisReportShape>["competitor_overview"];
  target_positive_themes: NonNullable<
    Partial<AnalysisReportShape>["target_positive_themes"]
  >;
  target_negative_themes: NonNullable<
    Partial<AnalysisReportShape>["target_negative_themes"]
  >;
  competitor_positive_themes: NonNullable<
    Partial<AnalysisReportShape>["competitor_positive_themes"]
  >;
  competitor_negative_themes: NonNullable<
    Partial<AnalysisReportShape>["competitor_negative_themes"]
  >;
  buyer_desires: NonNullable<Partial<AnalysisReportShape>["buyer_desires"]>;
  buyer_objections: NonNullable<
    Partial<AnalysisReportShape>["buyer_objections"]
  >;
  usage_scenarios: NonNullable<Partial<AnalysisReportShape>["usage_scenarios"]>;
  usage_where: NonNullable<Partial<AnalysisReportShape>["usage_where"]>;
  usage_when: NonNullable<Partial<AnalysisReportShape>["usage_when"]>;
  usage_how: NonNullable<Partial<AnalysisReportShape>["usage_how"]>;
  product_what: NonNullable<Partial<AnalysisReportShape>["product_what"]>;
  user_personas: NonNullable<Partial<AnalysisReportShape>["user_personas"]>;
  purchase_drivers: NonNullable<
    Partial<AnalysisReportShape>["purchase_drivers"]
  >;
  negative_opinions: NonNullable<
    Partial<AnalysisReportShape>["negative_opinions"]
  >;
  unmet_needs: NonNullable<Partial<AnalysisReportShape>["unmet_needs"]>;
  baseline_requirements: NonNullable<
    Partial<AnalysisReportShape>["baseline_requirements"]
  >;
  performance_levers: NonNullable<
    Partial<AnalysisReportShape>["performance_levers"]
  >;
  differentiators: NonNullable<Partial<AnalysisReportShape>["differentiators"]>;
  comparison_opportunities: NonNullable<
    Partial<AnalysisReportShape>["comparison_opportunities"]
  >;
  comparison_risks: NonNullable<
    Partial<AnalysisReportShape>["comparison_risks"]
  >;
  listing_draft?: Partial<AnalysisReportShape>["listing_draft"];
  image_brief: NonNullable<Partial<AnalysisReportShape>["image_brief"]>;
  a_plus_brief: NonNullable<Partial<AnalysisReportShape>["a_plus_brief"]>;
  voc_response_matrix: NonNullable<
    Partial<AnalysisReportShape>["voc_response_matrix"]
  >;
  image_strategy?: Partial<AnalysisReportShape>["image_strategy"];
  copy_strategy?: Partial<AnalysisReportShape>["copy_strategy"];
};

export type ProjectWorkspaceShellProps = {
  project: {
    id: string;
    name: string;
    target_market: string | null;
    product_name: string | null;
  };
  report: ProjectReport | null;
  reportId: string | null;
  reportCreatedAt: string | null;
  targetProduct: {
    id: string;
    name: string | null;
    asin: string | null;
    product_url: string | null;
    market: string | null;
    is_launched: boolean;
    role: "target";
    notes: string | null;
    current_title: string | null;
    current_bullets: string | null;
    current_description: string | null;
  } | null;
  competitorProducts: Array<{
    id: string;
    name: string | null;
    asin: string | null;
    market: string | null;
    role: "competitor";
    product_url: string | null;
    is_launched: boolean;
    notes: string | null;
    current_title: string | null;
    current_bullets: string | null;
    current_description: string | null;
  }>;
  availableAnalysisProviders: Array<"openai" | "gemini">;
  freshness: {
    status: "missing" | "stale" | "fresh";
    reasonText: string;
    latestReportAt: string | null;
    latestDataUpdateAt: string | null;
  };
  latestAnalysisRun: {
    status: AnalysisStatus | null;
    error_message: string | null;
    stage: string | null;
    progress: number | null;
  } | null;
  latestAnalysisStatus: AnalysisStatus;
  latestAnalysisProgress: number;
  reviews: Array<{ project_product_id: string | null }>;
  importFiles: Array<{
    id: string;
    project_product_id: string | null;
    file_name: string;
    row_count: number;
    created_at: string;
    import_status: "uploaded" | "parsed" | "normalized" | "failed";
    error_message: string | null;
    sheet_name: string | null;
  }>;
  listingSnapshots: Parameters<typeof ListingDeliverableCard>[0]["snapshots"];
  imageAssets: Parameters<typeof ImageBriefWorkbench>[0]["assets"];
  imageGenerationRuns: Parameters<
    typeof ImageBriefWorkbench
  >[0]["generationRuns"];
  promptRebuildRuns: Parameters<
    typeof ImageBriefWorkbench
  >[0]["promptRebuildRuns"];
  referenceImages: Parameters<typeof ImageBriefWorkbench>[0]["referenceImages"];
  imageStrategySlots: Parameters<typeof ImageBriefWorkbench>[0]["savedSlots"];
  defaultImageModel: string;
  defaultImageProvider: Parameters<
    typeof ImageBriefWorkbench
  >[0]["defaultImageProvider"];
  reviewCountByProduct: Record<string, number>;
  importCountByProduct: Record<string, number>;
  productNameById: Record<string, string>;
};
