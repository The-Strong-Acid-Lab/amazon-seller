import { notFound } from "next/navigation";

import type { AnalysisReportShape } from "@/lib/analysis";
import { requireUser } from "@/lib/auth";
import {
  getConfiguredImageModelName,
  getImageGenerationProvider,
} from "@/lib/image-generation-provider";
import { getProjectPageData } from "@/lib/projects";
import { getUserApiKeySettings } from "@/lib/user-api-keys";
import { ProjectWorkspaceShell } from "@/components/project-page/project-workspace-shell";

type AnalysisRunStatus = "queued" | "running" | "completed" | "failed" | "pending";


function asReport(
  latestReport: { summary_json: unknown; strategy_json: unknown } | null,
) {
  if (!latestReport) return null;
  const summary = latestReport.summary_json as Partial<AnalysisReportShape>;
  const strategy = latestReport.strategy_json as Partial<AnalysisReportShape>;
  return {
    dataset_overview: summary.dataset_overview,
    target_overview: summary.target_overview,
    competitor_overview: summary.competitor_overview,
    target_positive_themes: summary.target_positive_themes ?? [],
    target_negative_themes: summary.target_negative_themes ?? [],
    competitor_positive_themes: summary.competitor_positive_themes ?? [],
    competitor_negative_themes: summary.competitor_negative_themes ?? [],
    buyer_desires: summary.buyer_desires ?? [],
    buyer_objections: summary.buyer_objections ?? [],
    usage_scenarios: summary.usage_scenarios ?? [],
    usage_where: summary.usage_where ?? [],
    usage_when: summary.usage_when ?? [],
    usage_how: summary.usage_how ?? [],
    product_what: summary.product_what ?? [],
    user_personas: summary.user_personas ?? [],
    purchase_drivers: summary.purchase_drivers ?? [],
    negative_opinions: summary.negative_opinions ?? [],
    unmet_needs: summary.unmet_needs ?? [],
    baseline_requirements: summary.baseline_requirements ?? [],
    performance_levers: summary.performance_levers ?? [],
    differentiators: summary.differentiators ?? [],
    comparison_opportunities: summary.comparison_opportunities ?? [],
    comparison_risks: summary.comparison_risks ?? [],
    listing_draft: strategy.listing_draft,
    image_brief: strategy.image_brief ?? [],
    a_plus_brief: strategy.a_plus_brief ?? [],
    voc_response_matrix: strategy.voc_response_matrix ?? [],
    image_strategy: strategy.image_strategy,
    copy_strategy: strategy.copy_strategy,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  try {
    const user = await requireUser("/login");
    const apiKeySettings = await getUserApiKeySettings(user.id);
    const availableAnalysisProviders: Array<"openai" | "gemini"> = [];
    if (apiKeySettings.hasOpenAiKey) availableAnalysisProviders.push("openai");
    if (apiKeySettings.hasGeminiKey) availableAnalysisProviders.push("gemini");

    const { projectId } = await params;
    const data = await getProjectPageData(projectId, user.id);
    const report = asReport(data.latestReport);

    const targetProduct = (() => {
      const p = data.projectProducts.find((p) => p.role === "target");
      if (!p) return null;
      return { ...p, role: "target" as const, notes: p.notes ?? null };
    })();
    const competitorProducts = data.projectProducts
      .filter((p) => p.role === "competitor")
      .map((p) => ({
        ...p,
        role: "competitor" as const,
        product_url: p.product_url ?? null,
        is_launched: p.is_launched ?? false,
        notes: p.notes ?? null,
      }));

    // Convert Maps to Records for client component serialization
    const reviewCountByProduct: Record<string, number> = {};
    const importCountByProduct: Record<string, number> = {};
    const productNameById: Record<string, string> = {};

    for (const product of data.projectProducts) {
      productNameById[product.id] =
        product.name ??
        (product.role === "target" ? "未命名我的商品" : "未命名竞品");
    }
    for (const review of data.reviews) {
      if (!review.project_product_id) continue;
      reviewCountByProduct[review.project_product_id] =
        (reviewCountByProduct[review.project_product_id] ?? 0) + 1;
    }
    for (const importFile of data.importFiles) {
      if (!importFile.project_product_id) continue;
      importCountByProduct[importFile.project_product_id] =
        (importCountByProduct[importFile.project_product_id] ?? 0) + 1;
    }

    // Freshness
    const latestImportAt = data.importFiles.reduce<string | null>(
      (latest, item) => {
        if (!latest || item.created_at > latest) return item.created_at;
        return latest;
      },
      null,
    );
    const latestProductUpdateAt = data.projectProducts.reduce<string | null>(
      (latest, item) => {
        const candidate = item.updated_at || item.created_at;
        if (!latest || candidate > latest) return candidate;
        return latest;
      },
      null,
    );
    const latestDataUpdateAt =
      [latestImportAt, latestProductUpdateAt].filter(Boolean).sort().at(-1) ??
      null;
    const latestReportAt = data.latestReport?.created_at ?? null;

    let freshnessStatus: "missing" | "stale" | "fresh" = "fresh";
    let freshnessReasonText = "";
    if (!latestReportAt) {
      freshnessStatus = "missing";
      freshnessReasonText = "还没有分析记录。";
    } else if (latestDataUpdateAt && latestDataUpdateAt > latestReportAt) {
      freshnessStatus = "stale";
      const reasons: string[] = [];
      if (latestImportAt && latestImportAt > latestReportAt)
        reasons.push("有新的评论导入");
      if (latestProductUpdateAt && latestProductUpdateAt > latestReportAt)
        reasons.push("有新的 listing 信息修改");
      freshnessReasonText =
        reasons.length > 0
          ? `原因：${reasons.join("，")}。`
          : "项目数据已经变化。";
    }

    const latestAnalysisStatus: AnalysisRunStatus =
      data.latestAnalysisRun?.status ??
      (data.latestReport ? "completed" : "pending");
    const latestAnalysisProgress = (() => {
      if (latestAnalysisStatus === "completed") return 100;
      if (latestAnalysisStatus === "pending") return 0;
      const p = data.latestAnalysisRun?.progress;
      if (typeof p !== "number" || isNaN(p))
        return latestAnalysisStatus === "failed" ? 0 : 5;
      return Math.max(0, Math.min(100, Math.round(p)));
    })();

    return (
      <ProjectWorkspaceShell
        project={{
          id: data.project.id,
          name: data.project.name,
          target_market: data.project.target_market ?? null,
          product_name: data.project.product_name ?? null,
        }}
        report={report}
        reportId={data.latestReport?.id ?? null}
        reportCreatedAt={data.latestReport?.created_at ?? null}
        targetProduct={targetProduct}
        competitorProducts={competitorProducts}
        availableAnalysisProviders={
          availableAnalysisProviders.length > 0
            ? availableAnalysisProviders
            : ["openai"]
        }
        freshness={{
          status: freshnessStatus,
          reasonText: freshnessReasonText,
          latestReportAt,
          latestDataUpdateAt,
        }}
        latestAnalysisRun={
          data.latestAnalysisRun
            ? {
                status: data.latestAnalysisRun
                  .status as AnalysisRunStatus | null,
                error_message: data.latestAnalysisRun.error_message ?? null,
                stage: data.latestAnalysisRun.stage ?? null,
                progress: data.latestAnalysisRun.progress ?? null,
              }
            : null
        }
        latestAnalysisStatus={latestAnalysisStatus}
        latestAnalysisProgress={latestAnalysisProgress}
        reviews={data.reviews}
        importFiles={data.importFiles}
        listingSnapshots={data.listingSnapshots}
        imageAssets={data.imageAssets}
        imageGenerationRuns={data.imageGenerationRuns}
        promptRebuildRuns={data.promptRebuildRuns}
        referenceImages={data.referenceImages}
        imageStrategySlots={data.imageStrategySlots}
        defaultImageModel={getConfiguredImageModelName()}
        defaultImageProvider={getImageGenerationProvider()}
        reviewCountByProduct={reviewCountByProduct}
        importCountByProduct={importCountByProduct}
        productNameById={productNameById}
      />
    );
  } catch {
    notFound();
  }
}
