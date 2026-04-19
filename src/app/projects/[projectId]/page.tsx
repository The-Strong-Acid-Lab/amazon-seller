import Link from "next/link";
import { notFound } from "next/navigation";

import type { AnalysisReportShape } from "@/lib/analysis";
import { requireUser } from "@/lib/auth";
import {
  getConfiguredImageModelName,
  getImageGenerationProvider,
} from "@/lib/image-generation-provider";
import { getProjectPageData } from "@/lib/projects";
import { getUserApiKeySettings } from "@/lib/user-api-keys";
import { AnalyzeProjectButton } from "@/components/analyze-project-button";
import { CompetitorListModal } from "@/components/competitor-list-modal";
import { ExportProjectReportButton } from "@/components/export-project-report-button";
import { ImageBriefWorkbench } from "@/components/image-brief-workbench";
import { ListingDeliverableCard } from "@/components/listing-deliverable-card";
import {
  APlusBriefCard,
  AnalysisInputsCard,
  CollapsibleReportSection,
  formatDateTime,
  formatExecutionArea,
  formatPriority,
  hasListingInput,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AnalysisRunStatus = "queued" | "running" | "completed" | "failed" | "pending";
type AnalysisRunStage =
  | "queued"
  | "normalizing"
  | "loading_reviews"
  | "llm_analyzing"
  | "writing_report"
  | "completed"
  | "failed";

function asReport(latestReport: {
  summary_json: unknown;
  strategy_json: unknown;
} | null) {
  if (!latestReport) {
    return null;
  }

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

    if (apiKeySettings.hasOpenAiKey) {
      availableAnalysisProviders.push("openai");
    }

    if (apiKeySettings.hasGeminiKey) {
      availableAnalysisProviders.push("gemini");
    }

    const { projectId } = await params;
    const data = await getProjectPageData(projectId, user.id);
    const report = asReport(data.latestReport);
    const targetProduct =
      data.projectProducts.find((product) => product.role === "target") ?? null;
    const competitorProducts = data.projectProducts.filter(
      (product) => product.role === "competitor",
    );
    const productNameById = new Map(
      data.projectProducts.map((product) => [
        product.id,
        product.name ??
          (product.role === "target" ? "未命名我的商品" : "未命名竞品"),
      ]),
    );
    const reviewCountByProduct = new Map<string, number>();
    const importCountByProduct = new Map<string, number>();

    for (const review of data.reviews) {
      if (!review.project_product_id) {
        continue;
      }

      reviewCountByProduct.set(
        review.project_product_id,
        (reviewCountByProduct.get(review.project_product_id) ?? 0) + 1,
      );
    }

    for (const importFile of data.importFiles) {
      if (!importFile.project_product_id) {
        continue;
      }

      importCountByProduct.set(
        importFile.project_product_id,
        (importCountByProduct.get(importFile.project_product_id) ?? 0) + 1,
      );
    }

    const freshness = buildAnalysisFreshness({
      latestReportAt: data.latestReport?.created_at ?? null,
      importFiles: data.importFiles,
      projectProducts: data.projectProducts,
    });
    const latestAnalysisStatus: AnalysisRunStatus =
      data.latestAnalysisRun?.status ??
      (data.latestReport ? "completed" : "pending");
    const latestAnalysisStage = resolveAnalysisStage({
      status: latestAnalysisStatus,
      stage: data.latestAnalysisRun?.stage ?? null,
    });
    const latestAnalysisProgress = resolveAnalysisProgress({
      status: latestAnalysisStatus,
      progress: data.latestAnalysisRun?.progress ?? null,
    });
    const reportContext = buildReportContext({
      latestReportAt: data.latestReport?.created_at ?? null,
      importFiles: data.importFiles,
      productNameById,
      projectProducts: data.projectProducts,
      reportTargetReviewCount: report?.target_overview?.review_count ?? 0,
    });
    const pageSections = [
      { id: "overview", label: "项目概览" },
      { id: "products", label: "商品与竞品" },
      { id: "imports", label: "追加竞品" },
      { id: "inputs", label: "分析输入" },
      ...(report
        ? [
            { id: "listing", label: "Listing" },
            { id: "images", label: "图片策略" },
            { id: "aplus", label: "A+ Brief" },
            { id: "evidence-reviews", label: "评论与主题" },
            { id: "evidence-needs", label: "用户与需求" },
            { id: "evidence-strategy", label: "策略依据" },
          ]
        : []),
    ];

    return (
      <main className="min-h-screen scroll-smooth px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-6">
          <div className="flex flex-wrap items-start justify-between gap-6 rounded-xl border border-[var(--page-border)] bg-white/80 px-6 py-6 shadow-[0_20px_70px_rgba(54,40,24,0.08)] sm:px-8">
            <div>
              <div className="flex items-center gap-3">
                <Link href="/dashboard">
                  <Button size="sm" variant="outline">
                    返回 Console
                  </Button>
                </Link>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                {data.project.name}
              </h1>
            </div>

            <div className="grid gap-3">
              <AnalyzeProjectButton
                availableProviders={
                  availableAnalysisProviders.length > 0
                    ? availableAnalysisProviders
                    : ["openai"]
                }
                initialRunError={data.latestAnalysisRun?.error_message ?? null}
                initialRunStatus={data.latestAnalysisRun?.status ?? null}
                projectId={data.project.id}
              />
              <ExportProjectReportButton
                disabled={!data.latestReport?.export_text}
                projectId={data.project.id}
              />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="hidden xl:block">
              <div className="sticky top-8 rounded-3xl border border-stone-200 bg-white/85 p-4 shadow-[0_18px_50px_rgba(54,40,24,0.06)] backdrop-blur">
                <p className="px-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                  页面导航
                </p>
                <nav className="mt-4 grid gap-1">
                  {pageSections.map((section) => (
                    <a
                      key={section.id}
                      className="rounded-2xl px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-100 hover:text-stone-950"
                      href={`#${section.id}`}
                    >
                      {section.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="grid gap-6">
              {freshness.status === "missing" ? (
                <Alert variant="warning">
                  <AlertTitle>还没有分析结果</AlertTitle>
                  <AlertDescription>
                    当前项目已经有数据了，但还没有生成过报告。先点右上角的
                    `开始分析`。
                  </AlertDescription>
                </Alert>
              ) : null}

              {freshness.status === "stale" ? (
                <Alert variant="warning">
                  <AlertTitle>数据已更新，建议重新分析</AlertTitle>
                  <AlertDescription>
                    <p>
                      最近一次分析时间：
                      {formatDateTime(freshness.latestReportAt)}
                    </p>
                    <p>
                      最近一次数据更新时间：
                      {formatDateTime(freshness.latestDataUpdateAt)}
                    </p>
                    <p>{freshness.reasonText}</p>
                  </AlertDescription>
                </Alert>
              ) : null}

              <section className="scroll-mt-24" id="overview">
                <Card className="rounded-[2rem]">
                  <CardHeader>
                    <CardTitle>项目概览</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-sm leading-7 text-stone-700">
                      <p>
                        <span className="font-semibold text-stone-950">
                          当前分析：
                        </span>
                        {latestAnalysisStatus === "running" ||
                        latestAnalysisStatus === "queued"
                          ? `${formatAnalysisRunStage(latestAnalysisStage)} · ${latestAnalysisProgress}%`
                          : formatAnalysisRunStatus(latestAnalysisStatus)}
                      </p>
                      <p>
                        <span className="font-semibold text-stone-950">
                          最近报告：
                        </span>
                        {data.latestReport?.created_at
                          ? `${formatDateTime(data.latestReport.created_at)}`
                          : "还没有生成报告"}
                      </p>
                      <p>
                        <span className="font-semibold text-stone-950">
                          当前数据：
                        </span>
                        评论 {data.reviews.length} 条 · 竞品{" "}
                        {competitorProducts.length} 个 · 市场{" "}
                        {targetProduct?.market ??
                          data.project.target_market ??
                          "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-stone-950">
                          本次纳入：
                        </span>
                        评论文件 {reportContext.reportInputFileCount} 份 · 竞品{" "}
                        {reportContext.reportCompetitorCount} 个 · Listing{" "}
                        {reportContext.reportListingInputCount} 项
                      </p>
                      <p>
                        <span className="font-semibold text-stone-950">
                          报告之后：
                        </span>
                        {reportContext.addedImportsAfterReport.length === 0 &&
                        reportContext.updatedListingsAfterReport.length === 0
                          ? "没有新的评论导入或 listing 修改"
                          : [
                              reportContext.addedImportsAfterReport.length > 0
                                ? `新增评论导入 ${reportContext.addedImportsAfterReport.length} 份`
                                : null,
                              reportContext.updatedListingsAfterReport.length >
                              0
                                ? `新增 listing 修改 ${reportContext.updatedListingsAfterReport.length} 项`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                      </p>
                    </div>
                    {data.latestAnalysisRun?.error_message ? (
                      <div>
                        <Alert variant="destructive">
                          <AlertTitle>最近一次失败原因</AlertTitle>
                          <AlertDescription>
                            {data.latestAnalysisRun.error_message}
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </section>

              <section className="scroll-mt-24" id="products">
                <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                  <Card className="rounded-[2rem]">
                    <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                      <div className="space-y-1.5">
                        <CardTitle>我的商品</CardTitle>
                        <CardDescription>
                          这个项目最终是为了给这个商品做页面与转化决策。
                        </CardDescription>
                      </div>
                      {targetProduct ? (
                        <ProductListingEditorModal
                          product={targetProduct}
                          projectId={data.project.id}
                          triggerLabel="编辑我的商品"
                        />
                      ) : null}
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      <ProjectProductCard
                        asin={targetProduct?.asin ?? null}
                        importCount={
                          targetProduct
                            ? (importCountByProduct.get(targetProduct.id) ?? 0)
                            : 0
                        }
                        isLaunched={targetProduct?.is_launched ?? false}
                        market={targetProduct?.market ?? null}
                        name={
                          targetProduct?.name ??
                          data.project.product_name ??
                          "未命名我的商品"
                        }
                        productUrl={targetProduct?.product_url ?? null}
                        reviewCount={
                          targetProduct
                            ? (reviewCountByProduct.get(targetProduct.id) ?? 0)
                            : 0
                        }
                        role="target"
                      />
                    </CardContent>
                  </Card>

                  <Card className="rounded-[2rem]">
                    <CardHeader>
                      <CardTitle>竞品来源</CardTitle>
                      <CardDescription>
                        先看竞品列表，再点开某个竞品看它自己的评论和 listing。
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      <CompetitorListModal
                        availableProviders={
                          availableAnalysisProviders.length > 0
                            ? availableAnalysisProviders
                            : ["openai"]
                        }
                        competitors={competitorProducts.map((product) => ({
                          ...product,
                          role: "competitor" as const,
                        }))}
                        importCountByProduct={Object.fromEntries(
                          importCountByProduct.entries(),
                        )}
                        projectId={data.project.id}
                        reviews={data.reviews.filter((review) =>
                          competitorProducts.some(
                            (product) =>
                              product.id === review.project_product_id,
                          ),
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              </section>

              {targetProduct ? (
                <section className="scroll-mt-24" id="imports">
                  <ProjectSourceImport
                    projectId={data.project.id}
                    targetMarket={
                      targetProduct.market ?? data.project.target_market ?? "US"
                    }
                    targetProductId={targetProduct.id}
                  />
                </section>
              ) : null}

              <section className="scroll-mt-24" id="inputs">
                <AnalysisInputsCard
                  competitorProducts={competitorProducts}
                  importCountByProduct={importCountByProduct}
                  importFiles={data.importFiles}
                  productNameById={productNameById}
                  reviewCountByProduct={reviewCountByProduct}
                  targetProduct={targetProduct}
                />
              </section>

              {report ? (
                <div className="grid gap-6">
                  <section className="scroll-mt-24" id="listing">
                    <ListingDeliverableCard
                      analysisReportId={data.latestReport?.id ?? null}
                      analysisFreshness={{
                        status: freshness.status,
                        reasonText: freshness.reasonText,
                      }}
                      initialDraft={report.listing_draft}
                      projectId={data.project.id}
                      snapshots={data.listingSnapshots}
                    />
                  </section>

                  <section className="scroll-mt-24" id="images">
                    <ImageBriefWorkbench
                      assets={data.imageAssets}
                      brief={report.image_brief}
                      competitorProducts={competitorProducts.map((product) => ({
                        id: product.id,
                        name: product.name,
                      }))}
                      defaultImageModel={getConfiguredImageModelName()}
                      defaultImageProvider={getImageGenerationProvider()}
                      generationRuns={data.imageGenerationRuns}
                      projectId={data.project.id}
                      referenceImages={data.referenceImages}
                      savedSlots={data.imageStrategySlots}
                      strategy={report.image_strategy}
                      targetProduct={
                        targetProduct
                          ? {
                              id: targetProduct.id,
                              name: targetProduct.name,
                            }
                          : null
                      }
                    />
                  </section>

                  <section className="scroll-mt-24" id="aplus">
                    <APlusBriefCard items={report.a_plus_brief} />
                  </section>

                  <section className="scroll-mt-24" id="evidence-reviews">
                    <CollapsibleReportSection
                      defaultOpen={false}
                      description="这里放评论统计和主题拆解，用来理解结论从哪里来。日常使用先看上面的执行输出，不够时再展开。"
                      title="分析依据：评论与主题"
                    >
                      <div className="grid gap-6 xl:grid-cols-2">
                        <OverviewCard
                          title="我的商品评论概览"
                          overview={report.target_overview}
                        />
                        <OverviewCard
                          title="竞品评论概览"
                          overview={report.competitor_overview}
                        />
                      </div>

                      <div className="grid gap-6 xl:grid-cols-2">
                        <InsightListCard
                          description={
                            (report.target_overview?.review_count ?? 0) > 0
                              ? "这里反映买家对我的商品的真实认可点。"
                              : "当前没有我的商品评论，所以这里不会显示主题。"
                          }
                          emptyLabel="当前没有我的商品评论。"
                          items={report.target_positive_themes}
                          title="我的商品正向主题"
                        />
                        <InsightListCard
                          description={
                            (report.target_overview?.review_count ?? 0) > 0
                              ? "这里反映当前最影响我的商品转化的负面反馈。"
                              : "当前没有我的商品评论，所以这里不会显示主题。"
                          }
                          emptyLabel="当前没有我的商品评论。"
                          items={report.target_negative_themes}
                          title="我的商品负向主题"
                        />
                      </div>

                      <div className="grid gap-6 xl:grid-cols-2">
                        <InsightListCard
                          description="竞品被买家反复认可的价值点，通常代表类目里的主流期待。"
                          items={report.competitor_positive_themes}
                          title="竞品正向主题"
                        />
                        <InsightListCard
                          description="竞品的负面反馈往往就是我的商品可以切入的机会。"
                          items={report.competitor_negative_themes}
                          title="竞品负向主题"
                        />
                      </div>
                    </CollapsibleReportSection>
                  </section>

                  <section className="scroll-mt-24" id="evidence-needs">
                    <CollapsibleReportSection
                      defaultOpen={false}
                      description="这里是用户、场景、驱动因素和卖点分层。做定位、图片和文案时用它校准方向。"
                      title="分析依据：用户与需求"
                    >
                      <div className="grid gap-6 xl:grid-cols-3">
                        <LabelSummaryCard
                          items={report.buyer_desires}
                          title="买家想要什么"
                        />
                        <LabelSummaryCard
                          items={report.buyer_objections}
                          title="买家担心什么"
                        />
                        <LabelSummaryCard
                          items={report.usage_scenarios}
                          title="使用场景"
                        />
                      </div>

                      <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-4">
                        <LabelSummaryCard
                          items={report.usage_where}
                          title="Where"
                        />
                        <LabelSummaryCard
                          items={report.usage_when}
                          title="When"
                        />
                        <LabelSummaryCard
                          items={report.usage_how}
                          title="How"
                        />
                        <LabelSummaryCard
                          items={report.product_what}
                          title="What"
                        />
                      </div>

                      <PersonaCard items={report.user_personas} />

                      <div className="grid gap-6 xl:grid-cols-3">
                        <LabelSummaryCard
                          items={report.purchase_drivers}
                          title="Top Purchase Drivers"
                        />
                        <LabelSummaryCard
                          items={report.negative_opinions}
                          title="Top Negative Opinions"
                        />
                        <LabelSummaryCard
                          items={report.unmet_needs}
                          title="Unmet Needs"
                        />
                      </div>

                      <div className="grid gap-6 xl:grid-cols-3">
                        <LabelSummaryCard
                          items={report.baseline_requirements}
                          title="Baseline"
                        />
                        <LabelSummaryCard
                          items={report.performance_levers}
                          title="Performance"
                        />
                        <LabelSummaryCard
                          items={report.differentiators}
                          title="Differentiator"
                        />
                      </div>
                    </CollapsibleReportSection>
                  </section>

                  <section className="scroll-mt-24" id="evidence-strategy">
                    <CollapsibleReportSection
                      defaultOpen={false}
                      description="这里保留完整的策略依据和文案角度，适合在需要复盘或给团队解释时展开看。"
                      title="分析依据：策略依据"
                    >
                      <div className="grid gap-6 xl:grid-cols-2">
                        <LabelSummaryCard
                          items={report.comparison_opportunities}
                          title="定位机会"
                        />
                        <LabelSummaryCard
                          items={report.comparison_risks}
                          title="定位风险"
                        />
                      </div>

                      <Card className="rounded-[2rem]">
                        <CardHeader>
                          <CardTitle>优先执行清单</CardTitle>
                          <CardDescription>
                            不是泛泛建议，而是按优先级排好的动作。先做
                            P1，再处理 P2、P3。
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                          {sortVocResponseItems(report.voc_response_matrix)
                            .length > 0 ? (
                            sortVocResponseItems(
                              report.voc_response_matrix,
                            ).map((item) => (
                              <div
                                key={`${item.voc_theme}-${item.buyer_signal}`}
                                className="rounded-2xl border border-stone-200 p-4"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    className="rounded-full"
                                    variant={
                                      item.priority === "p1"
                                        ? "default"
                                        : "outline"
                                    }
                                  >
                                    {formatPriority(item.priority)}
                                  </Badge>
                                  <Badge
                                    className="rounded-full"
                                    variant="secondary"
                                  >
                                    {formatExecutionArea(item.execution_area)}
                                  </Badge>
                                  <Badge
                                    className="rounded-full"
                                    variant="outline"
                                  >
                                    {item.voc_theme}
                                  </Badge>
                                  <Badge
                                    className="rounded-full"
                                    variant="outline"
                                  >
                                    {item.confidence}
                                  </Badge>
                                </div>
                                <p className="mt-3 text-sm text-stone-700">
                                  <span className="font-medium text-stone-900">
                                    为什么现在做:
                                  </span>{" "}
                                  {item.why_now || "未提供"}
                                </p>
                                <p className="mt-3 text-sm text-stone-700">
                                  <span className="font-medium text-stone-900">
                                    Buyer signal:
                                  </span>{" "}
                                  {item.buyer_signal}
                                </p>
                                <p className="mt-2 text-sm text-stone-700">
                                  <span className="font-medium text-stone-900">
                                    Risk / opportunity:
                                  </span>{" "}
                                  {item.risk_or_opportunity}
                                </p>
                                <p className="mt-2 text-sm text-stone-700">
                                  <span className="font-medium text-stone-900">
                                    Listing:
                                  </span>{" "}
                                  {item.recommended_listing_response}
                                </p>
                                <p className="mt-2 text-sm text-stone-700">
                                  <span className="font-medium text-stone-900">
                                    Image:
                                  </span>{" "}
                                  {item.recommended_image_response}
                                </p>
                                <p className="mt-2 text-sm text-stone-700">
                                  <span className="font-medium text-stone-900">
                                    Ad angle:
                                  </span>{" "}
                                  {item.recommended_ad_angle}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-stone-500">
                              还没有策略矩阵。
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      <div className="grid gap-6 xl:grid-cols-2">
                        <StringListCard
                          lists={[
                            {
                              label: "Title angles",
                              items: report.copy_strategy?.title_angles ?? [],
                            },
                            {
                              label: "Bullet angles",
                              items: report.copy_strategy?.bullet_angles ?? [],
                            },
                            {
                              label: "Proof phrases",
                              items: report.copy_strategy?.proof_phrases ?? [],
                            },
                          ]}
                          title="文案策略"
                        />
                      </div>
                    </CollapsibleReportSection>
                  </section>
                </div>
              ) : (
                <Card className="rounded-[2rem]">
                  <CardHeader>
                    <CardTitle>还没有分析结果</CardTitle>
                    <CardDescription>
                      评论已经进库了。下一步点击“开始分析”，生成第一版 VOC
                      报告。
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}

function buildAnalysisFreshness({
  latestReportAt,
  importFiles,
  projectProducts,
}: {
  latestReportAt: string | null;
  importFiles: Array<{ created_at: string }>;
  projectProducts: Array<{ updated_at: string; created_at: string }>;
}) {
  const latestImportAt = importFiles.reduce<string | null>((latest, item) => {
    if (!latest || item.created_at > latest) {
      return item.created_at;
    }

    return latest;
  }, null);

  const latestProductUpdateAt = projectProducts.reduce<string | null>((latest, item) => {
    const candidate = item.updated_at || item.created_at;

    if (!latest || candidate > latest) {
      return candidate;
    }

    return latest;
  }, null);

  const latestDataUpdateAt = [latestImportAt, latestProductUpdateAt]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  if (!latestReportAt) {
    return {
      status: "missing" as const,
      latestReportAt: null,
      latestDataUpdateAt,
      reasonText: "还没有分析记录。",
    };
  }

  if (latestDataUpdateAt && latestDataUpdateAt > latestReportAt) {
    const reasons: string[] = [];

    if (latestImportAt && latestImportAt > latestReportAt) {
      reasons.push("有新的评论导入");
    }

    if (latestProductUpdateAt && latestProductUpdateAt > latestReportAt) {
      reasons.push("有新的 listing 信息修改");
    }

    return {
      status: "stale" as const,
      latestReportAt,
      latestDataUpdateAt,
      reasonText:
        reasons.length > 0
          ? `原因：${reasons.join("，")}。`
          : "项目数据已经变化。",
    };
  }

  return {
    status: "fresh" as const,
    latestReportAt,
    latestDataUpdateAt,
    reasonText: "",
  };
}

function formatAnalysisRunStatus(status: AnalysisRunStatus) {
  switch (status) {
    case "queued":
      return "排队中";
    case "running":
      return "分析中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return "未开始";
  }
}

function formatAnalysisRunStage(stage: AnalysisRunStage) {
  switch (stage) {
    case "queued":
      return "等待执行";
    case "normalizing":
      return "解析并入库评论";
    case "loading_reviews":
      return "读取项目数据";
    case "llm_analyzing":
      return "LLM 分析中";
    case "writing_report":
      return "写入报告";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return stage;
  }
}

function resolveAnalysisStage({
  status,
  stage,
}: {
  status: AnalysisRunStatus;
  stage: string | null;
}): AnalysisRunStage {
  if (
    stage === "queued" ||
    stage === "normalizing" ||
    stage === "loading_reviews" ||
    stage === "llm_analyzing" ||
    stage === "writing_report" ||
    stage === "completed" ||
    stage === "failed"
  ) {
    return stage;
  }

  if (status === "failed") {
    return "failed";
  }

  if (status === "completed") {
    return "completed";
  }

  return "queued";
}

function resolveAnalysisProgress({
  status,
  progress,
}: {
  status: AnalysisRunStatus;
  progress: number | null;
}) {
  if (status === "completed") {
    return 100;
  }

  if (status === "pending") {
    return 0;
  }

  if (typeof progress !== "number" || Number.isNaN(progress)) {
    return status === "failed" ? 0 : 5;
  }

  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  return clamped;
}

function buildReportContext({
  latestReportAt,
  importFiles,
  projectProducts,
  productNameById,
  reportTargetReviewCount,
}: {
  latestReportAt: string | null;
  importFiles: Array<{
    file_name: string;
    created_at: string;
    project_product_id: string | null;
  }>;
  projectProducts: Array<{
    id: string;
    role: "target" | "competitor";
    name: string | null;
    current_title: string | null;
    current_bullets: string | null;
    current_description: string | null;
    updated_at: string;
    created_at: string;
  }>;
  productNameById: Map<string, string>;
  reportTargetReviewCount: number;
}) {
  if (!latestReportAt) {
    return {
      reportInputFileCount: 0,
      reportCompetitorCount: 0,
      reportListingInputCount: 0,
      reportTargetReviewCount: 0,
      addedImportsAfterReport: [],
      updatedListingsAfterReport: [],
    };
  }

  const importsBeforeOrAtReport = importFiles.filter((item) => item.created_at <= latestReportAt);
  const importsAfterReport = importFiles
    .filter((item) => item.created_at > latestReportAt)
    .map((item) => ({
      label: `${item.file_name} · ${
        item.project_product_id
          ? (productNameById.get(item.project_product_id) ?? "未知商品")
          : "未关联商品"
      }`,
      created_at: item.created_at,
    }));

  const productsBeforeOrAtReport = projectProducts.filter(
    (item) => item.created_at <= latestReportAt,
  );
  const listingInputCount = productsBeforeOrAtReport.filter((item) => hasListingInput(item)).length;
  const competitorCount = productsBeforeOrAtReport.filter(
    (item) => item.role === "competitor",
  ).length;
  const updatedListingsAfterReport = projectProducts
    .filter(
      (item) =>
        hasListingInput(item) &&
        item.updated_at > latestReportAt &&
        item.created_at <= latestReportAt,
    )
    .map((item) => ({
      label: productNameById.get(item.id) ?? "未知商品",
      updated_at: item.updated_at,
    }));

  return {
    reportInputFileCount: importsBeforeOrAtReport.length,
    reportCompetitorCount: competitorCount,
    reportListingInputCount: listingInputCount,
    reportTargetReviewCount,
    addedImportsAfterReport: importsAfterReport,
    updatedListingsAfterReport,
  };
}
