"use client";

import { useState } from "react";
import Link from "next/link";

import type { AnalysisReportShape } from "@/lib/analysis";
import { AnalyzeProjectButton } from "@/components/analyze-project-button";
import { CompetitorListModal } from "@/components/competitor-list-modal";
import { ImageBriefWorkbench } from "@/components/image-brief-workbench";
import { ListingDeliverableCard } from "@/components/listing-deliverable-card";
import {
  APlusBriefCard,
  formatDateTime,
  formatExecutionArea,
  formatPriority,
  InsightListCard,
  LabelSummaryCard,
  OverviewCard,
  PersonaCard,
  ProjectProductCard,
  sortVocResponseItems,
  StringListCard,
} from "@/components/project-page/sections";
import { ProductListingEditorModal } from "@/components/product-listing-editor-modal";
import { ProjectSourceImport } from "@/components/project-source-import";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

type StepKey =
  | "evidence"
  | "insight"
  | "strategy"
  | "listing"
  | "images"
  | "export";

type AnalysisStatus = "queued" | "running" | "completed" | "failed" | "pending";

type ProjectReport = {
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
    role: "target";
    name: string | null;
    asin: string | null;
    product_url: string | null;
    market: string | null;
    is_launched: boolean;
    current_title: string | null;
    current_bullets: string | null;
    current_description: string | null;
    notes: string | null;
  } | null;
  competitorProducts: Array<{
    id: string;
    role: "competitor";
    name: string | null;
    asin: string | null;
    product_url: string | null;
    market: string | null;
    is_launched: boolean;
    current_title: string | null;
    current_bullets: string | null;
    current_description: string | null;
    notes: string | null;
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

// ─── Step config ─────────────────────────────────────────────────────────────

const STEPS: Array<{ key: StepKey; num: string; label: string }> = [
  { key: "evidence", num: "01", label: "依据" },
  { key: "insight", num: "02", label: "洞察" },
  { key: "strategy", num: "03", label: "策略" },
  { key: "listing", num: "04", label: "Listing" },
  { key: "images", num: "05", label: "图片" },
  { key: "export", num: "06", label: "导出" },
];

function getStepStatus(
  key: StepKey,
  props: ProjectWorkspaceShellProps,
): "done" | "current" | "pending" | "locked" {
  const { report, reviews, imageAssets } = props;
  const hasReviews = reviews.filter((r) => r.project_product_id).length > 0;
  const hasReport = !!report;
  switch (key) {
    case "evidence":
      return hasReviews ? "done" : "current";
    case "insight":
      return hasReport ? "done" : hasReviews ? "pending" : "locked";
    case "strategy":
      return hasReport &&
        (report.voc_response_matrix.length > 0 ||
          report.comparison_opportunities.length > 0)
        ? "done"
        : hasReport
          ? "pending"
          : "locked";
    case "listing":
      return report?.listing_draft ? "done" : hasReport ? "pending" : "locked";
    case "images":
      return imageAssets.length > 0
        ? "done"
        : report?.listing_draft
          ? "pending"
          : "locked";
    case "export":
      return report?.listing_draft ? "pending" : "locked";
  }
}

function getInitialStep(props: ProjectWorkspaceShellProps): StepKey {
  if (!props.report) return "evidence";
  if (!props.report.listing_draft)
    return props.report.voc_response_matrix.length > 0 ? "strategy" : "insight";
  if (props.imageAssets.length === 0) return "listing";
  return "images";
}

function getNextBanner(activeStep: StepKey, props: ProjectWorkspaceShellProps) {
  const { report, reviews, latestAnalysisStatus } = props;
  const hasReviews = reviews.filter((r) => r.project_product_id).length > 0;
  const isRunning =
    latestAnalysisStatus === "running" || latestAnalysisStatus === "queued";

  if (activeStep === "evidence") {
    if (isRunning)
      return {
        title: "正在分析，稍候…",
        sub: `评论解析中 · 完成后自动跳到洞察层`,
        cta: null,
      };
    if (!hasReviews)
      return {
        title: "先上传评论文件",
        sub: "至少需要一个产品 + 一份评论文件，才能开始分析。",
        cta: null,
      };
    return {
      title: "资料齐全，可以开始分析",
      sub: `已导入 ${reviews.filter((r) => r.project_product_id).length} 条评论 · ${props.competitorProducts.length} 个竞品`,
      cta: "开始分析",
    };
  }
  if (activeStep === "insight") {
    if (!report)
      return {
        title: "需要先完成分析",
        sub: "回到「依据」步骤，点击开始分析。",
        cta: null,
      };
    return {
      title: "审阅洞察，进入策略层",
      sub: `${report.target_negative_themes.length} 个负面主题等待响应 · ${report.buyer_objections.length} 个买家顾虑`,
      cta: "生成策略矩阵",
    };
  }
  if (activeStep === "strategy") {
    if (!report)
      return {
        title: "需要先完成分析",
        sub: "回到「依据」步骤，点击开始分析。",
        cta: null,
      };
    return {
      title: "审阅策略，生成 Listing 草稿",
      sub: `${report.voc_response_matrix.length} 条 VOC 响应 · ${report.comparison_opportunities.length} 个定位机会`,
      cta: "生成 Listing 草稿",
    };
  }
  if (activeStep === "listing")
    return {
      title: "审阅 Listing 草稿后进入图片规划",
      sub: "逐条采纳或修改，完成后再做图片。",
      cta: null,
    };
  if (activeStep === "images")
    return {
      title: "为 8 个图片 slot 写 brief",
      sub: "主图 + 7 张辅图，每个 slot 对应一个买家顾虑。",
      cta: null,
    };
  if (activeStep === "export")
    return {
      title: "导出可交付报告",
      sub: "Listing 文本 / A+ Brief / 完整 PDF，按需选择。",
      cta: null,
    };
  return { title: "", sub: "", cta: null };
}

// ─── Main shell ──────────────────────────────────────────────────────────────

export function ProjectWorkspaceShell(props: ProjectWorkspaceShellProps) {
  const [activeStep, setActiveStep] = useState<StepKey>(() =>
    getInitialStep(props),
  );
  const { project, latestAnalysisRun, freshness } = props;
  const providers =
    props.availableAnalysisProviders.length > 0
      ? props.availableAnalysisProviders
      : (["openai"] as Array<"openai" | "gemini">);

  const banner = getNextBanner(activeStep, props);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* ── Sticky header zone ── */}
      <div className="sticky top-0 z-20 border-b border-[var(--page-border)] bg-white/95 backdrop-blur">
        {/* Project header */}
        <div className="mx-auto max-w-7xl px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <button className="font-mono text-xs text-stone-400 hover:text-stone-600 transition-colors">
                    ← Projects
                  </button>
                </Link>
                <span className="text-stone-300">/</span>
                <span className="font-mono text-xs text-stone-500 truncate max-w-xs">
                  {project.name}
                </span>
              </div>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
                {project.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-400 font-mono">
                {project.target_market && <span>{project.target_market}</span>}
                {project.target_market && <span>·</span>}
                <span>
                  {props.reviews
                    .filter((r) => r.project_product_id)
                    .length.toLocaleString()}{" "}
                  条评论
                </span>
                <span>·</span>
                <span>{props.competitorProducts.length} 个竞品</span>
                {props.reportCreatedAt && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-600">
                      ● 已分析 {formatDateTime(props.reportCreatedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AnalyzeProjectButton
                availableProviders={providers}
                initialRunError={latestAnalysisRun?.error_message ?? null}
                initialRunStatus={
                  latestAnalysisRun?.status === "pending" ||
                  !latestAnalysisRun?.status
                    ? null
                    : latestAnalysisRun.status
                }
                projectId={project.id}
              />
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}
          >
            {STEPS.map((step) => {
              const status = getStepStatus(step.key, props);
              const isActive = step.key === activeStep;
              const isDone = status === "done";
              const isLocked = status === "locked";
              return (
                <button
                  key={step.key}
                  onClick={() => !isLocked && setActiveStep(step.key)}
                  disabled={isLocked}
                  className={`group relative flex items-center gap-2.5 pb-3 pt-2 text-left transition-colors ${
                    isLocked
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-pointer"
                  }`}
                  style={{
                    borderBottom: isActive
                      ? "2px solid var(--accent-blue)"
                      : "2px solid transparent",
                  }}
                >
                  {/* Dot */}
                  <span
                    className="relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold"
                    style={{
                      background: isDone
                        ? "#1a1815"
                        : isActive
                          ? "var(--accent-blue)"
                          : "white",
                      color: isDone || isActive ? "white" : "#9a9388",
                      border:
                        isDone || isActive ? "none" : "1.5px solid #d6cdb8",
                    }}
                  >
                    {isDone ? "✓" : step.num.slice(-1)}
                  </span>

                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium leading-none ${
                        isActive
                          ? "text-stone-950"
                          : isDone
                            ? "text-stone-700"
                            : "text-stone-400"
                      }`}
                    >
                      {step.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Next action banner ── */}
      {banner.title && (
        <div className="border-b border-[var(--page-border)] bg-stone-50">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3 sm:px-8">
            <span
              className="flex-shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-semibold text-white"
              style={{ background: "var(--accent-blue)" }}
            >
              ▸ 下一步
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-stone-900">
                {banner.title}
              </span>
              <span className="ml-2 text-sm text-stone-400">{banner.sub}</span>
            </div>
            {banner.cta && (
              <Button
                size="sm"
                style={{
                  background: "var(--accent-blue)",
                  color: "white",
                  border: "none",
                }}
              >
                {banner.cta} →
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Alerts ── */}
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {freshness.status === "missing" && (
          <Alert className="mt-4" variant="warning">
            <AlertTitle>还没有分析结果</AlertTitle>
            <AlertDescription>
              项目已有数据，点右上角「开始分析」生成报告。
            </AlertDescription>
          </Alert>
        )}
        {freshness.status === "stale" && (
          <Alert className="mt-4" variant="warning">
            <AlertTitle>数据已更新，建议重新分析</AlertTitle>
            <AlertDescription>{freshness.reasonText}</AlertDescription>
          </Alert>
        )}
        {latestAnalysisRun?.error_message && (
          <Alert className="mt-4" variant="destructive">
            <AlertTitle>最近一次分析失败</AlertTitle>
            <AlertDescription>
              {latestAnalysisRun.error_message}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* ── Step content ── */}
      <div className="mx-auto max-w-7xl px-6 py-6 sm:px-8">
        {activeStep === "evidence" && <EvidenceStep {...props} />}
        {activeStep === "insight" && <InsightStep {...props} />}
        {activeStep === "strategy" && <StrategyStep {...props} />}
        {activeStep === "listing" && <ListingStep {...props} />}
        {activeStep === "images" && <ImagesStep {...props} />}
        {activeStep === "export" && <ExportStep {...props} />}
      </div>
    </div>
  );
}

// ─── Step: Evidence ──────────────────────────────────────────────────────────

function EvidenceStep(props: ProjectWorkspaceShellProps) {
  const {
    project,
    targetProduct,
    competitorProducts,
    importFiles,
    reviewCountByProduct,
    importCountByProduct,
    productNameById,
    availableAnalysisProviders,
  } = props;
  const providers =
    availableAnalysisProviders.length > 0
      ? availableAnalysisProviders
      : (["openai"] as Array<"openai" | "gemini">);

  return (
    <div className="grid gap-6">
      <StepHeading
        num="01"
        label="依据"
        sub="上传评论、粘贴自家 Listing、加入竞品。所有结论都来自这里。"
      />

      {/* Target + Competitors */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* My product */}
        <div className="rounded-xl border border-[var(--page-border)] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-900">目标产品</h3>
            {targetProduct && (
              <ProductListingEditorModal
                product={targetProduct}
                projectId={project.id}
                triggerLabel="编辑"
              />
            )}
          </div>
          {targetProduct ? (
            <ProjectProductCard
              asin={targetProduct.asin}
              importCount={importCountByProduct[targetProduct.id] ?? 0}
              isLaunched={targetProduct.is_launched}
              market={targetProduct.market}
              name={
                targetProduct.name ?? project.product_name ?? "未命名我的商品"
              }
              productUrl={targetProduct.product_url}
              reviewCount={reviewCountByProduct[targetProduct.id] ?? 0}
              role="target"
            />
          ) : (
            <p className="text-sm text-stone-500">还没有目标产品。</p>
          )}
        </div>

        {/* Competitors */}
        <div className="rounded-xl border border-[var(--page-border)] bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-stone-900">
            竞品来源
            <span className="ml-2 font-mono text-xs font-normal text-stone-400">
              {competitorProducts.length} / 10
            </span>
          </h3>
          <CompetitorListModal
            availableProviders={providers}
            competitors={competitorProducts}
            importCountByProduct={importCountByProduct}
            projectId={project.id}
            reviews={
              props.reviews.filter((r) =>
                competitorProducts.some((p) => p.id === r.project_product_id),
              ) as Parameters<typeof CompetitorListModal>[0]["reviews"]
            }
          />
        </div>
      </div>

      {/* Import reviews */}
      {targetProduct && (
        <div className="rounded-xl border border-[var(--page-border)] bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-stone-900">
            上传评论
          </h3>
          <ProjectSourceImport
            projectId={project.id}
            targetMarket={targetProduct.market ?? project.target_market ?? "US"}
            targetProductId={targetProduct.id}
          />
        </div>
      )}

      {/* Import file list */}
      {importFiles.length > 0 && (
        <div className="rounded-xl border border-[var(--page-border)] bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-stone-900">
            已上传评论文件
            <span className="ml-2 font-mono text-xs font-normal text-stone-400">
              {importFiles.length} 份
            </span>
          </h3>
          <div className="grid gap-2">
            {importFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-lg border border-[var(--page-border)] bg-stone-50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-900">
                    {file.file_name}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {file.project_product_id
                      ? (productNameById[file.project_product_id] ?? "未知商品")
                      : "未关联商品"}
                    {file.sheet_name ? ` · ${file.sheet_name}` : ""}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <span className="font-mono text-xs text-stone-400">
                    {file.row_count} rows
                  </span>
                  <Badge
                    className={`rounded-full font-mono text-[10px] ${file.import_status === "failed" ? "border-red-200 bg-red-50 text-red-700" : ""}`}
                    variant={
                      file.import_status === "normalized"
                        ? "default"
                        : "outline"
                    }
                  >
                    {file.import_status === "normalized"
                      ? "已入库"
                      : file.import_status === "failed"
                        ? "失败"
                        : file.import_status === "parsed"
                          ? "已解析"
                          : "已上传"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step: Insight ───────────────────────────────────────────────────────────

function InsightStep({ report }: ProjectWorkspaceShellProps) {
  if (!report)
    return (
      <LockedStep message="先完成「依据」步骤并运行分析，才能查看洞察。" />
    );
  return (
    <div className="grid gap-6">
      <StepHeading
        num="02"
        label="洞察"
        sub="主题、欲望、顾虑——买家真实在说什么。"
      />

      {/* Overview strip */}
      {(report.target_overview || report.competitor_overview) && (
        <div className="grid gap-4 xl:grid-cols-2">
          <OverviewCard
            title="我的商品评论概览"
            overview={report.target_overview}
          />
          <OverviewCard
            title="竞品评论概览"
            overview={report.competitor_overview}
          />
        </div>
      )}

      {/* Themes */}
      <div className="grid gap-4 xl:grid-cols-2">
        <InsightListCard
          title="我的商品正向主题"
          description={
            (report.target_overview?.review_count ?? 0) > 0
              ? "买家对我们商品的真实认可点。"
              : "当前没有我的商品评论。"
          }
          emptyLabel="当前没有我的商品评论。"
          items={report.target_positive_themes}
        />
        <InsightListCard
          title="我的商品负向主题"
          description={
            (report.target_overview?.review_count ?? 0) > 0
              ? "最影响转化的负面反馈。"
              : "当前没有我的商品评论。"
          }
          emptyLabel="当前没有我的商品评论。"
          items={report.target_negative_themes}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InsightListCard
          title="竞品正向主题"
          description="竞品被买家认可的价值点——代表类目主流期待。"
          items={report.competitor_positive_themes}
        />
        <InsightListCard
          title="竞品负向主题"
          description="竞品的负面反馈往往是我们可以切入的机会。"
          items={report.competitor_negative_themes}
        />
      </div>

      {/* Buyer voice */}
      <div className="grid gap-4 xl:grid-cols-3">
        <LabelSummaryCard title="买家想要什么" items={report.buyer_desires} />
        <LabelSummaryCard
          title="买家担心什么"
          items={report.buyer_objections}
        />
        <LabelSummaryCard title="使用场景" items={report.usage_scenarios} />
      </div>

      {/* Context */}
      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        <LabelSummaryCard title="Where" items={report.usage_where} />
        <LabelSummaryCard title="When" items={report.usage_when} />
        <LabelSummaryCard title="How" items={report.usage_how} />
        <LabelSummaryCard title="What" items={report.product_what} />
      </div>

      {/* Persona */}
      {report.user_personas.length > 0 && (
        <PersonaCard items={report.user_personas} />
      )}
    </div>
  );
}

// ─── Step: Strategy ──────────────────────────────────────────────────────────

function StrategyStep({ report }: ProjectWorkspaceShellProps) {
  if (!report)
    return (
      <LockedStep message="先完成「依据」步骤并运行分析，才能查看策略。" />
    );
  const sorted = sortVocResponseItems(report.voc_response_matrix);
  return (
    <div className="grid gap-6">
      <StepHeading
        num="03"
        label="策略"
        sub="VOC 与竞品定位交叉，找到可认领的角度。"
      />

      {/* VOC matrix */}
      {sorted.length > 0 && (
        <div className="rounded-xl border border-[var(--page-border)] bg-white">
          <div className="border-b border-[var(--page-border)] px-5 py-4">
            <h3 className="text-sm font-semibold text-stone-900">
              VOC × 响应矩阵
            </h3>
            <p className="mt-0.5 text-xs text-stone-400">
              按优先级排序 · 先做 P1
            </p>
          </div>
          <div className="divide-y divide-[var(--page-border)]">
            {sorted.map((item) => (
              <div
                key={`${item.voc_theme}-${item.buyer_signal}`}
                className="px-5 py-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="rounded-full font-mono text-[10px]"
                    variant={item.priority === "p1" ? "default" : "outline"}
                  >
                    {formatPriority(item.priority)}
                  </Badge>
                  <Badge
                    className="rounded-full font-mono text-[10px]"
                    variant="secondary"
                  >
                    {formatExecutionArea(item.execution_area)}
                  </Badge>
                  <Badge
                    className="rounded-full font-mono text-[10px]"
                    variant="outline"
                  >
                    {item.voc_theme}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-1.5 text-sm">
                  <p className="text-stone-700">
                    <span className="font-medium text-stone-900">
                      买家信号:{" "}
                    </span>
                    {item.buyer_signal}
                  </p>
                  {item.why_now && (
                    <p className="text-stone-700">
                      <span className="font-medium text-stone-900">
                        为什么现在:{" "}
                      </span>
                      {item.why_now}
                    </p>
                  )}
                  <p className="text-stone-700">
                    <span className="font-medium text-stone-900">
                      Listing 响应:{" "}
                    </span>
                    {item.recommended_listing_response}
                  </p>
                  <p className="text-stone-700">
                    <span className="font-medium text-stone-900">
                      图片响应:{" "}
                    </span>
                    {item.recommended_image_response}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunities + Risks */}
      <div className="grid gap-4 xl:grid-cols-2">
        <LabelSummaryCard
          title="定位机会"
          items={report.comparison_opportunities}
        />
        <LabelSummaryCard title="定位风险" items={report.comparison_risks} />
      </div>

      {/* Value layers */}
      <div className="grid gap-4 xl:grid-cols-3">
        <LabelSummaryCard
          title="Baseline（基线）"
          items={report.baseline_requirements}
        />
        <LabelSummaryCard
          title="Performance（性能）"
          items={report.performance_levers}
        />
        <LabelSummaryCard
          title="Differentiator（差异化）"
          items={report.differentiators}
        />
      </div>

      {/* Copy strategy */}
      {report.copy_strategy && (
        <StringListCard
          title="文案策略"
          lists={[
            {
              label: "Title angles",
              items: report.copy_strategy.title_angles ?? [],
            },
            {
              label: "Bullet angles",
              items: report.copy_strategy.bullet_angles ?? [],
            },
            {
              label: "Proof phrases",
              items: report.copy_strategy.proof_phrases ?? [],
            },
          ]}
        />
      )}
    </div>
  );
}

// ─── Step: Listing ───────────────────────────────────────────────────────────

function ListingStep(props: ProjectWorkspaceShellProps) {
  if (!props.report)
    return <LockedStep message="先运行分析才能生成 Listing 草稿。" />;
  return (
    <div className="grid gap-6">
      <StepHeading
        num="04"
        label="Listing"
        sub="基于评论生成的标题与 bullet 草案，可逐条采纳或修改。"
      />
      <ListingDeliverableCard
        analysisReportId={props.reportId}
        analysisFreshness={{
          status: props.freshness.status,
          reasonText: props.freshness.reasonText,
        }}
        initialDraft={props.report.listing_draft}
        projectId={props.project.id}
        snapshots={props.listingSnapshots}
      />
    </div>
  );
}

// ─── Step: Images ────────────────────────────────────────────────────────────

function ImagesStep(props: ProjectWorkspaceShellProps) {
  if (!props.report)
    return <LockedStep message="先运行分析才能进入图片规划。" />;
  const providers =
    props.availableAnalysisProviders.length > 0
      ? props.availableAnalysisProviders
      : (["openai"] as Array<"openai" | "gemini">);
  return (
    <div className="grid gap-6">
      <StepHeading
        num="05"
        label="图片"
        sub="主图 + 7 张辅图，每个 slot 对应一个买家顾虑或卖点。"
      />
      <ImageBriefWorkbench
        assets={props.imageAssets}
        brief={props.report.image_brief}
        competitorProducts={props.competitorProducts.map((p) => ({
          id: p.id,
          name: p.name,
        }))}
        defaultImageModel={props.defaultImageModel}
        defaultImageProvider={props.defaultImageProvider}
        generationRuns={props.imageGenerationRuns}
        promptRebuildRuns={props.promptRebuildRuns}
        projectId={props.project.id}
        referenceImages={props.referenceImages}
        savedSlots={props.imageStrategySlots}
        strategy={props.report.image_strategy}
        targetProduct={
          props.targetProduct
            ? { id: props.targetProduct.id, name: props.targetProduct.name }
            : null
        }
      />
    </div>
  );
}

// ─── Step: Export ────────────────────────────────────────────────────────────

function ExportStep(props: ProjectWorkspaceShellProps) {
  if (!props.report) return <LockedStep message="先完成分析才能导出报告。" />;
  return (
    <div className="grid gap-6">
      <StepHeading
        num="06"
        label="导出"
        sub="把决策报告交给团队、设计师，或直接粘贴到 Seller Central。"
      />
      <APlusBriefCard items={props.report.a_plus_brief} />
    </div>
  );
}

// ─── Shared primitives ───────────────────────────────────────────────────────

function StepHeading({
  num,
  label,
  sub,
}: {
  num: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="mb-2">
      <div
        className="font-mono text-xs font-medium"
        style={{ color: "var(--accent-blue)" }}
      >
        {num} · {label.toUpperCase()}
      </div>
      <p className="mt-1 text-sm text-stone-400">{sub}</p>
    </div>
  );
}

function LockedStep({ message }: { message: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--page-border)] bg-white text-center">
      <div className="text-2xl opacity-30">🔒</div>
      <p className="mt-3 text-sm text-stone-400">{message}</p>
    </div>
  );
}
