import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import type { AnalysisReportShape } from "@/lib/analysis";
import { getProjectPageData } from "@/lib/projects";
import { AnalyzeProjectButton } from "@/components/analyze-project-button";
import { CompetitorListModal } from "@/components/competitor-list-modal";
import { ExportProjectReportButton } from "@/components/export-project-report-button";
import { ProductListingEditor } from "@/components/product-listing-editor";
import { ProjectSourceImport } from "@/components/project-source-import";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    execution_tasks: strategy.execution_tasks ?? [],
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
    const { projectId } = await params;
    const data = await getProjectPageData(projectId);
    const report = asReport(data.latestReport);
    const targetProduct =
      data.projectProducts.find((product) => product.role === "target") ?? null;
    const competitorProducts = data.projectProducts.filter(
      (product) => product.role === "competitor",
    );
    const productNameById = new Map(
      data.projectProducts.map((product) => [
        product.id,
        product.name ?? (product.role === "target" ? "未命名目标商品" : "未命名竞品"),
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
    const reportContext = buildReportContext({
      latestReportAt: data.latestReport?.created_at ?? null,
      importFiles: data.importFiles,
      productNameById,
      projectProducts: data.projectProducts,
      reportTargetReviewCount: report?.target_overview?.review_count ?? 0,
    });

    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-6">
          <div className="flex flex-wrap items-start justify-between gap-6 rounded-xl border border-[var(--page-border)] bg-white/80 px-6 py-6 shadow-[0_20px_70px_rgba(54,40,24,0.08)] sm:px-8">
            <div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="rounded-md border-[var(--page-border)] bg-white/75 px-2.5 py-1 font-mono text-[11px] text-[var(--page-muted)]">
                  PROJECT
                </Badge>
                <Link className="text-sm text-[var(--page-muted)] hover:text-stone-900" href="/">
                  返回导入页
                </Link>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                {data.project.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--page-muted)]">
                当前项目已保存 {data.reviews.length} 条评论。下一步是把这些评论转成可操作的 VOC 洞察和转化策略。
              </p>
            </div>

            <div className="grid gap-3">
              <AnalyzeProjectButton projectId={data.project.id} />
              <ExportProjectReportButton
                disabled={!data.latestReport?.export_text}
                projectId={data.project.id}
              />
            </div>
          </div>

          {freshness.status === "missing" ? (
            <Alert variant="warning">
              <AlertTitle>还没有分析结果</AlertTitle>
              <AlertDescription>
                当前项目已经有数据了，但还没有生成过报告。先点右上角的 `开始 LLM 分析`。
              </AlertDescription>
            </Alert>
          ) : null}

          {freshness.status === "stale" ? (
            <Alert variant="warning">
              <AlertTitle>数据已更新，建议重新分析</AlertTitle>
              <AlertDescription>
                <p>
                  最近一次分析时间：{formatDateTime(freshness.latestReportAt)}
                </p>
                <p>
                  最近一次数据更新时间：{formatDateTime(freshness.latestDataUpdateAt)}
                </p>
                <p>{freshness.reasonText}</p>
              </AlertDescription>
            </Alert>
          ) : null}

          {data.latestReport ? (
            <ReportVersionCard
              context={reportContext}
              latestReportAt={data.latestReport.created_at}
            />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="项目状态" value={data.project.status} />
            <MetricCard label="评论数量" value={String(data.reviews.length)} />
            <MetricCard label="目标市场" value={targetProduct?.market ?? data.project.target_market ?? "-"} />
            <MetricCard label="竞品数量" value={String(competitorProducts.length)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card className="rounded-[2rem]">
              <CardHeader>
                <CardTitle>目标商品</CardTitle>
                <CardDescription>
                  这个项目最终是为了给这个商品做页面与转化决策。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <ProjectProductCard
                  asin={targetProduct?.asin ?? null}
                  importCount={targetProduct ? importCountByProduct.get(targetProduct.id) ?? 0 : 0}
                  isLaunched={targetProduct?.is_launched ?? false}
                  market={targetProduct?.market ?? null}
                  name={targetProduct?.name ?? data.project.product_name ?? "未命名目标商品"}
                  productUrl={targetProduct?.product_url ?? null}
                  reviewCount={targetProduct ? reviewCountByProduct.get(targetProduct.id) ?? 0 : 0}
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
                  competitors={competitorProducts.map((product) => ({
                    ...product,
                    role: "competitor" as const,
                  }))}
                  importCountByProduct={Object.fromEntries(importCountByProduct.entries())}
                  projectId={data.project.id}
                  reviews={data.reviews.filter((review) =>
                    competitorProducts.some((product) => product.id === review.project_product_id),
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {targetProduct ? (
            <ProjectSourceImport
              projectId={data.project.id}
              targetMarket={targetProduct.market ?? data.project.target_market ?? "US"}
              targetProductAsin={targetProduct.asin}
              targetProductId={targetProduct.id}
              targetProductName={targetProduct.name ?? data.project.product_name ?? "未命名目标商品"}
              targetProductUrl={targetProduct.product_url}
            />
          ) : null}

          <AnalysisInputsCard
            competitorProducts={competitorProducts}
            importCountByProduct={importCountByProduct}
            importFiles={data.importFiles}
            productNameById={productNameById}
            reviewCountByProduct={reviewCountByProduct}
            targetProduct={targetProduct}
          />

          {targetProduct ? (
            <div className="grid gap-6">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
                  Listing 输入
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">
                  这里先手动粘贴 target 和 competitor 的 listing。后续分析会把评论和页面表达一起看，
                  才能判断哪些卖点已经被讲透，哪些位置还空着。
                </p>
              </div>

              <ProductListingEditor projectId={data.project.id} product={targetProduct} />
            </div>
          ) : null}

          {report ? (
            <div className="grid gap-6">
              <Card className="rounded-[2rem]">
                <CardHeader>
                  <CardTitle>分析总览</CardTitle>
                  <CardDescription>
                    这部分按 target 和 competitor 分开看，不再把所有评论混成一个摘要。
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard
                    label="评论数"
                    value={String(report.dataset_overview?.review_count ?? data.reviews.length)}
                  />
                  <MetricCard
                    label="ASIN 数"
                    value={String(report.dataset_overview?.asin_count ?? "-")}
                  />
                  <MetricCard
                    label="国家数"
                    value={String(report.dataset_overview?.country_count ?? "-")}
                  />
                  <MetricCard
                    label="起始日期"
                    value={report.dataset_overview?.date_from ?? "-"}
                  />
                  <MetricCard
                    label="结束日期"
                    value={report.dataset_overview?.date_to ?? "-"}
                  />
                </CardContent>
              </Card>

              <TaskListCard items={report.execution_tasks} />

              <ListingDraftCard draft={report.listing_draft} />

              <div className="grid gap-6 xl:grid-cols-2">
                <ImageBriefCard
                  brief={report.image_brief}
                  strategy={report.image_strategy}
                />
                <APlusBriefCard items={report.a_plus_brief} />
              </div>

              <CollapsibleReportSection
                defaultOpen={false}
                description="这里放评论统计和主题拆解，用来理解结论从哪里来。日常使用先看上面的执行输出，不够时再展开。"
                title="分析依据：评论与主题"
              >
                <div className="grid gap-6 xl:grid-cols-2">
                  <OverviewCard
                    title="目标商品评论概览"
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
                        ? "这里反映买家对目标商品的真实认可点。"
                        : "当前没有目标商品评论，所以这里不会显示主题。"
                    }
                    emptyLabel="当前没有目标商品评论。"
                    items={report.target_positive_themes}
                    title="目标商品正向主题"
                  />
                  <InsightListCard
                    description={
                      (report.target_overview?.review_count ?? 0) > 0
                        ? "这里反映当前最影响目标商品转化的负面反馈。"
                        : "当前没有目标商品评论，所以这里不会显示主题。"
                    }
                    emptyLabel="当前没有目标商品评论。"
                    items={report.target_negative_themes}
                    title="目标商品负向主题"
                  />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <InsightListCard
                    description="竞品被买家反复认可的价值点，通常代表类目里的主流期待。"
                    items={report.competitor_positive_themes}
                    title="竞品正向主题"
                  />
                  <InsightListCard
                    description="竞品的负面反馈往往就是目标商品可以切入的机会。"
                    items={report.competitor_negative_themes}
                    title="竞品负向主题"
                  />
                </div>
              </CollapsibleReportSection>

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
                      不是泛泛建议，而是按优先级排好的动作。先做 P1，再处理 P2、P3。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {sortVocResponseItems(report.voc_response_matrix).length > 0 ? (
                      sortVocResponseItems(report.voc_response_matrix).map((item) => (
                        <div
                          key={`${item.voc_theme}-${item.buyer_signal}`}
                          className="rounded-2xl border border-stone-200 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className="rounded-full"
                              variant={item.priority === "p1" ? "default" : "outline"}
                            >
                              {formatPriority(item.priority)}
                            </Badge>
                            <Badge className="rounded-full" variant="secondary">
                              {formatExecutionArea(item.execution_area)}
                            </Badge>
                            <Badge className="rounded-full" variant="outline">
                              {item.voc_theme}
                            </Badge>
                            <Badge className="rounded-full" variant="outline">
                              {item.confidence}
                            </Badge>
                          </div>
                          <p className="mt-3 text-sm text-stone-700">
                            <span className="font-medium text-stone-900">为什么现在做:</span>{" "}
                            {item.why_now || "未提供"}
                          </p>
                          <p className="mt-3 text-sm text-stone-700">
                            <span className="font-medium text-stone-900">Buyer signal:</span>{" "}
                            {item.buyer_signal}
                          </p>
                          <p className="mt-2 text-sm text-stone-700">
                            <span className="font-medium text-stone-900">Risk / opportunity:</span>{" "}
                            {item.risk_or_opportunity}
                          </p>
                          <p className="mt-2 text-sm text-stone-700">
                            <span className="font-medium text-stone-900">Listing:</span>{" "}
                            {item.recommended_listing_response}
                          </p>
                          <p className="mt-2 text-sm text-stone-700">
                            <span className="font-medium text-stone-900">Image:</span>{" "}
                            {item.recommended_image_response}
                          </p>
                          <p className="mt-2 text-sm text-stone-700">
                            <span className="font-medium text-stone-900">Ad angle:</span>{" "}
                            {item.recommended_ad_angle}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-stone-500">还没有策略矩阵。</p>
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
            </div>
          ) : (
            <Card className="rounded-[2rem]">
              <CardHeader>
                <CardTitle>还没有分析结果</CardTitle>
                <CardDescription>
                  评论已经进库了。下一步点击“开始 LLM 分析”，生成第一版 VOC 报告。
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}

function ProjectProductCard({
  role,
  name,
  asin,
  productUrl,
  market,
  isLaunched,
  reviewCount,
  importCount,
}: {
  role: "target" | "competitor";
  name: string;
  asin: string | null;
  productUrl: string | null;
  market: string | null;
  isLaunched: boolean;
  reviewCount: number;
  importCount: number;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="rounded-full" variant={role === "target" ? "default" : "outline"}>
          {role === "target" ? "target" : "competitor"}
        </Badge>
        <Badge className="rounded-full" variant="secondary">
          {isLaunched ? "已上线" : "未上线"}
        </Badge>
      </div>
      <p className="mt-3 text-base font-semibold text-stone-950">{name}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge className="rounded-full" variant="outline">
          {reviewCount} reviews
        </Badge>
        <Badge className="rounded-full" variant="outline">
          {importCount} imports
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-stone-700">
        <p>
          <span className="font-medium text-stone-900">ASIN:</span> {asin ?? "-"}
        </p>
        <p>
          <span className="font-medium text-stone-900">市场:</span> {market ?? "-"}
        </p>
        <p className="break-all">
          <span className="font-medium text-stone-900">URL:</span> {productUrl ?? "-"}
        </p>
      </div>
    </div>
  );
}

function AnalysisInputsCard({
  targetProduct,
  competitorProducts,
  reviewCountByProduct,
  importCountByProduct,
  importFiles,
  productNameById,
}: {
  targetProduct:
    | {
        id: string;
        name: string | null;
        asin: string | null;
        market: string | null;
        product_url: string | null;
        current_title: string | null;
        current_bullets: string | null;
        current_description: string | null;
      }
    | null;
  competitorProducts: Array<{
    id: string;
    name: string | null;
    asin: string | null;
    market: string | null;
    current_title: string | null;
    current_bullets: string | null;
    current_description: string | null;
  }>;
  reviewCountByProduct: Map<string, number>;
  importCountByProduct: Map<string, number>;
  importFiles: Array<{
    id: string;
    project_product_id: string | null;
    file_name: string;
    row_count: number;
    created_at: string;
  }>;
  productNameById: Map<string, string>;
}) {
  const latestImports = importFiles.slice(0, 6);

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>本次分析输入</CardTitle>
        <CardDescription>
          这里明确显示当前分析会读取哪些评论来源、哪些竞品，以及哪些 listing 信息已经填写，避免结果像黑盒。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="rounded-2xl border border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-900">目标商品输入</p>
            {targetProduct ? (
              <div className="mt-4 grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full" variant="default">
                    target
                  </Badge>
                  <Badge className="rounded-full" variant="outline">
                    {hasListingInput(targetProduct) ? "已填 listing" : "未填 listing"}
                  </Badge>
                  <Badge className="rounded-full" variant="outline">
                    {reviewCountByProduct.get(targetProduct.id) ?? 0} reviews
                  </Badge>
                  <Badge className="rounded-full" variant="outline">
                    {importCountByProduct.get(targetProduct.id) ?? 0} imports
                  </Badge>
                </div>
                <p className="text-base font-semibold text-stone-950">
                  {targetProduct.name ?? "未命名目标商品"}
                </p>
                <div className="grid gap-2 text-sm text-stone-700">
                  <p>
                    <span className="font-medium text-stone-900">ASIN:</span>{" "}
                    {targetProduct.asin ?? "-"}
                  </p>
                  <p>
                    <span className="font-medium text-stone-900">市场:</span>{" "}
                    {targetProduct.market ?? "-"}
                  </p>
                  <p className="break-all">
                    <span className="font-medium text-stone-900">URL:</span>{" "}
                    {targetProduct.product_url ?? "-"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-stone-500">当前项目还没有目标商品。</p>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-900">竞品输入</p>
            <div className="mt-4 grid gap-3">
              {competitorProducts.length > 0 ? (
                competitorProducts.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full" variant="outline">
                        competitor
                      </Badge>
                      <Badge className="rounded-full" variant="outline">
                        {hasListingInput(product) ? "已填 listing" : "未填 listing"}
                      </Badge>
                      <Badge className="rounded-full" variant="outline">
                        {reviewCountByProduct.get(product.id) ?? 0} reviews
                      </Badge>
                      <Badge className="rounded-full" variant="outline">
                        {importCountByProduct.get(product.id) ?? 0} imports
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-stone-950">
                      {product.name ?? "未命名竞品"}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      {product.market ?? "-"} · {product.asin ?? "无 ASIN"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-500">当前还没有竞品输入。</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 p-4">
          <p className="text-sm font-semibold text-stone-900">评论来源文件</p>
          <div className="mt-4 grid gap-3">
            {latestImports.length > 0 ? (
              latestImports.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-950">
                      {item.file_name}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      归属商品：{item.project_product_id
                        ? (productNameById.get(item.project_product_id) ?? "未知商品")
                        : "未关联商品"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full" variant="outline">
                      {item.row_count} rows
                    </Badge>
                    <Badge className="rounded-full" variant="secondary">
                      {formatDateTime(item.created_at)}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-500">当前还没有评论来源文件。</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportVersionCard({
  latestReportAt,
  context,
}: {
  latestReportAt: string;
  context: {
    reportInputFileCount: number;
    reportCompetitorCount: number;
    reportListingInputCount: number;
    reportTargetReviewCount: number;
    addedImportsAfterReport: Array<{
      label: string;
      created_at: string;
    }>;
    updatedListingsAfterReport: Array<{
      label: string;
      updated_at: string;
    }>;
  };
}) {
  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>当前报告版本</CardTitle>
        <CardDescription>
          这张卡告诉你这份报告生成于什么时候、当时覆盖了哪些输入，以及之后哪些数据发生了变化。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="生成时间" value={formatDateTime(latestReportAt)} />
          <MetricCard label="已纳入评论文件" value={String(context.reportInputFileCount)} />
          <MetricCard label="已纳入竞品" value={String(context.reportCompetitorCount)} />
          <MetricCard label="已纳入 listing" value={String(context.reportListingInputCount)} />
          <MetricCard label="当时目标商品评论" value={String(context.reportTargetReviewCount)} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-900">分析后新增评论导入</p>
            <div className="mt-4 grid gap-3">
              {context.addedImportsAfterReport.length > 0 ? (
                context.addedImportsAfterReport.map((item) => (
                  <div
                    key={`${item.label}-${item.created_at}`}
                    className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <p className="text-sm font-medium text-stone-950">{item.label}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      导入时间：{formatDateTime(item.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-500">当前没有新增评论导入。</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-900">分析后新增 listing 修改</p>
            <div className="mt-4 grid gap-3">
              {context.updatedListingsAfterReport.length > 0 ? (
                context.updatedListingsAfterReport.map((item) => (
                  <div
                    key={`${item.label}-${item.updated_at}`}
                    className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <p className="text-sm font-medium text-stone-950">{item.label}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      修改时间：{formatDateTime(item.updated_at)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-500">当前没有新增 listing 修改。</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function hasListingInput(product: {
  current_title: string | null;
  current_bullets: string | null;
  current_description: string | null;
}) {
  return Boolean(
    product.current_title?.trim() ||
      product.current_bullets?.trim() ||
      product.current_description?.trim(),
  );
}

function sortVocResponseItems(
  items: Array<{
    priority?: string;
    voc_theme: string;
    buyer_signal: string;
    risk_or_opportunity: string;
    execution_area?: string;
    why_now?: string;
    recommended_listing_response: string;
    recommended_image_response: string;
    recommended_ad_angle: string;
    confidence: string;
  }>,
) {
  const priorityOrder: Record<string, number> = {
    p1: 0,
    p2: 1,
    p3: 2,
  };

  return [...items].sort((left, right) => {
    const leftPriority = priorityOrder[left.priority ?? "zzz"] ?? 99;
    const rightPriority = priorityOrder[right.priority ?? "zzz"] ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.voc_theme.localeCompare(right.voc_theme);
  });
}

function formatPriority(priority?: string) {
  if (priority === "p1") {
    return "P1 先做";
  }

  if (priority === "p2") {
    return "P2 其次";
  }

  if (priority === "p3") {
    return "P3 后续";
  }

  return "未分级";
}

function formatExecutionArea(area?: string) {
  if (area === "positioning") {
    return "定位";
  }

  if (area === "listing") {
    return "Listing";
  }

  if (area === "image") {
    return "图片";
  }

  if (area === "ads") {
    return "广告";
  }

  return "未分类";
}

function sortExecutionTasks(
  items: Array<{
    task_title: string;
    priority?: string;
    workstream?: string;
    concrete_action: string;
    expected_impact: string;
    success_signal: string;
  }>,
) {
  const priorityOrder: Record<string, number> = {
    p1: 0,
    p2: 1,
    p3: 2,
  };

  return [...items].sort((left, right) => {
    const leftPriority = priorityOrder[left.priority ?? "zzz"] ?? 99;
    const rightPriority = priorityOrder[right.priority ?? "zzz"] ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.task_title.localeCompare(right.task_title);
  });
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-md border border-[var(--page-border)] bg-white/78 shadow-none">
      <CardContent className="px-5 !py-5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--page-muted)]">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold text-stone-950">{value}</p>
      </CardContent>
    </Card>
  );
}

function TaskListCard({
  items,
}: {
  items: Array<{
    task_title: string;
    priority?: string;
    workstream?: string;
    concrete_action: string;
    expected_impact: string;
    success_signal: string;
  }>;
}) {
  const sortedItems = sortExecutionTasks(items);

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>本周任务单</CardTitle>
        <CardDescription>
          先做这里的 P1。它是从评论洞察里直接拆出来的可执行动作。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {sortedItems.length > 0 ? (
          sortedItems.map((item) => (
            <div
              key={`${item.task_title}-${item.priority}`}
              className="rounded-2xl border border-stone-200 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className="rounded-full"
                  variant={item.priority === "p1" ? "default" : "outline"}
                >
                  {formatPriority(item.priority)}
                </Badge>
                <Badge className="rounded-full" variant="secondary">
                  {formatExecutionArea(item.workstream)}
                </Badge>
              </div>
              <p className="mt-3 text-base font-semibold text-stone-950">{item.task_title}</p>
              <p className="mt-3 text-sm text-stone-700">
                <span className="font-medium text-stone-900">具体动作:</span>{" "}
                {item.concrete_action}
              </p>
              <p className="mt-2 text-sm text-stone-700">
                <span className="font-medium text-stone-900">预期影响:</span>{" "}
                {item.expected_impact}
              </p>
              <p className="mt-2 text-sm text-stone-700">
                <span className="font-medium text-stone-900">成功信号:</span>{" "}
                {item.success_signal}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-stone-500">还没有任务单。</p>
        )}
      </CardContent>
    </Card>
  );
}

function ListingDraftCard({
  draft,
}: {
  draft:
    | {
        title_draft: string;
        title_rationale: string;
        bullet_drafts: string[];
        bullet_rationales: string[];
        positioning_statement: string;
      }
    | undefined;
}) {
  const bullets = draft?.bullet_drafts ?? [];
  const rationales = draft?.bullet_rationales ?? [];

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>Listing Draft</CardTitle>
        <CardDescription>
          这是基于评论和竞品 listing 生成的第一版标题与 bullet 草案，用来快速改稿。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="rounded-2xl border border-stone-200 p-4">
          <p className="text-sm font-semibold text-stone-900">定位句</p>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            {draft?.positioning_statement || "还没有定位句。"}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 p-4">
          <p className="text-sm font-semibold text-stone-900">推荐标题草案</p>
          <p className="mt-3 text-base font-semibold leading-7 text-stone-950">
            {draft?.title_draft || "还没有标题草案。"}
          </p>
          {draft?.title_rationale ? (
            <p className="mt-3 text-sm leading-7 text-stone-700">
              <span className="font-medium text-stone-900">为什么这样写:</span>{" "}
              {draft.title_rationale}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4">
          <p className="text-sm font-semibold text-stone-900">推荐 Bullet 草案</p>
          {bullets.length > 0 ? (
            bullets.map((bullet, index) => (
              <div key={`${bullet}-${index}`} className="rounded-2xl border border-stone-200 p-4">
                <p className="text-sm font-medium text-stone-900">Bullet {index + 1}</p>
                <p className="mt-3 text-sm leading-7 text-stone-700">{bullet}</p>
                {rationales[index] ? (
                  <p className="mt-3 text-sm leading-7 text-stone-600">
                    <span className="font-medium text-stone-900">写作意图:</span>{" "}
                    {rationales[index]}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-500">还没有 bullet 草案。</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ImageBriefCard({
  brief,
  strategy,
}: {
  brief: Array<{
    slot: string;
    goal: string;
    message: string;
    supporting_proof: string;
    visual_direction: string;
  }>;
  strategy:
    | {
        hero_image: string;
        feature_callouts: string[];
        objection_handling_images: string[];
        lifestyle_scenes: string[];
      }
    | undefined;
}) {
  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>Image Brief</CardTitle>
        <CardDescription>
          给设计师或运营的图片执行 brief。先看主图，再按顺序规划副图。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {brief.length > 0 ? (
          <div className="grid gap-4">
            {brief.map((item) => (
              <div key={`${item.slot}-${item.goal}`} className="rounded-2xl border border-stone-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full" variant="outline">
                    {item.slot}
                  </Badge>
                </div>
                <p className="mt-3 text-sm font-semibold text-stone-900">目标</p>
                <p className="mt-2 text-sm leading-7 text-stone-700">{item.goal}</p>
                <p className="mt-3 text-sm font-semibold text-stone-900">核心信息</p>
                <p className="mt-2 text-sm leading-7 text-stone-700">{item.message}</p>
                <p className="mt-3 text-sm font-semibold text-stone-900">支撑证据</p>
                <p className="mt-2 text-sm leading-7 text-stone-700">{item.supporting_proof}</p>
                <p className="mt-3 text-sm font-semibold text-stone-900">视觉方向</p>
                <p className="mt-2 text-sm leading-7 text-stone-700">{item.visual_direction}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500">还没有 Image Brief。</p>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <StringListCard
            lists={[
              {
                label: "Hero image",
                items: strategy?.hero_image ? [strategy.hero_image] : [],
              },
              {
                label: "Feature callouts",
                items: strategy?.feature_callouts ?? [],
              },
            ]}
            title="图片策略补充"
          />
          <StringListCard
            lists={[
              {
                label: "Objection handling",
                items: strategy?.objection_handling_images ?? [],
              },
              {
                label: "Lifestyle scenes",
                items: strategy?.lifestyle_scenes ?? [],
              },
            ]}
            title="图片策略补充"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function APlusBriefCard({
  items,
}: {
  items: Array<{
    module: string;
    goal: string;
    key_message: string;
    supporting_proof: string;
    content_direction: string;
  }>;
}) {
  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>A+ Brief</CardTitle>
        <CardDescription>
          给 A+ 页面或品牌故事模块的内容 brief。不是直接出设计，而是先明确每个模块该承担什么转化任务。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={`${item.module}-${item.goal}`}
              className="rounded-2xl border border-stone-200 p-4"
            >
              <p className="text-base font-semibold text-stone-950">{item.module}</p>
              <p className="mt-3 text-sm leading-7 text-stone-700">
                <span className="font-medium text-stone-900">目标:</span> {item.goal}
              </p>
              <p className="mt-2 text-sm leading-7 text-stone-700">
                <span className="font-medium text-stone-900">核心信息:</span>{" "}
                {item.key_message}
              </p>
              <p className="mt-2 text-sm leading-7 text-stone-700">
                <span className="font-medium text-stone-900">支撑证据:</span>{" "}
                {item.supporting_proof}
              </p>
              <p className="mt-2 text-sm leading-7 text-stone-700">
                <span className="font-medium text-stone-900">内容方向:</span>{" "}
                {item.content_direction}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-stone-500">还没有 A+ brief。</p>
        )}
      </CardContent>
    </Card>
  );
}

function PersonaCard({
  items,
}: {
  items: Array<{
    name: string;
    who: string;
    goal: string;
    pain_point: string;
    message_angle: string;
  }>;
}) {
  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>用户画像</CardTitle>
        <CardDescription>
          不是泛泛的人群标签，而是当前最值得服务的购买人群、他们的目标、顾虑，以及该怎么跟他们说话。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={`${item.name}-${item.goal}`}
              className="rounded-2xl border border-stone-200 p-4"
            >
              <p className="text-base font-semibold text-stone-950">{item.name}</p>
              <p className="mt-3 text-sm leading-7 text-stone-700">
                <span className="font-medium text-stone-900">是谁:</span> {item.who}
              </p>
              <p className="mt-2 text-sm leading-7 text-stone-700">
                <span className="font-medium text-stone-900">目标:</span> {item.goal}
              </p>
              <p className="mt-2 text-sm leading-7 text-stone-700">
                <span className="font-medium text-stone-900">痛点:</span> {item.pain_point}
              </p>
              <p className="mt-2 text-sm leading-7 text-stone-700">
                <span className="font-medium text-stone-900">沟通角度:</span>{" "}
                {item.message_angle}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-stone-500">还没有用户画像。</p>
        )}
      </CardContent>
    </Card>
  );
}

function OverviewCard({
  title,
  overview,
}: {
  title: string;
  overview:
    | {
        review_count: number;
        asin_count: number;
        country_count: number;
        date_from: string | null;
        date_to: string | null;
        rating_distribution: Record<string, number>;
      }
    | undefined;
}) {
  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard label="评论数" value={String(overview?.review_count ?? 0)} />
          <MetricCard label="ASIN 数" value={String(overview?.asin_count ?? 0)} />
          <MetricCard label="国家数" value={String(overview?.country_count ?? 0)} />
          <MetricCard label="日期范围" value={formatDateRange(overview)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {overview && Object.keys(overview.rating_distribution).length > 0 ? (
            Object.entries(overview.rating_distribution).map(([rating, count]) => (
              <Badge key={rating} className="rounded-full" variant="outline">
                {rating} 星: {count}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-stone-500">还没有评分分布。</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightListCard({
  title,
  description,
  items,
  emptyLabel = "还没有可展示的主题。",
}: {
  title: string;
  description: string;
  items: Array<{ theme: string; summary: string; evidence: string[] }>;
  emptyLabel?: string;
}) {
  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.theme} className="rounded-2xl border border-stone-200 p-4">
              <p className="text-base font-semibold text-stone-950">{item.theme}</p>
              <p className="mt-2 text-sm leading-6 text-stone-700">{item.summary}</p>
              {item.evidence.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.evidence.map((evidence) => (
                    <Badge key={evidence} className="rounded-full" variant="outline">
                      {evidence}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-stone-500">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

function LabelSummaryCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; summary: string; evidence?: string[] }>;
}) {
  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.label} className="rounded-2xl border border-stone-200 p-4">
              <p className="font-semibold text-stone-950">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-stone-700">{item.summary}</p>
              {item.evidence && item.evidence.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.evidence.map((evidence) => (
                    <Badge key={`${item.label}-${evidence}`} className="rounded-full" variant="outline">
                      {evidence}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-stone-500">还没有内容。</p>
        )}
      </CardContent>
    </Card>
  );
}

function StringListCard({
  title,
  lists,
}: {
  title: string;
  lists: Array<{ label: string; items: string[] }>;
}) {
  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {lists.map((list) => (
          <div key={list.label} className="rounded-2xl border border-stone-200 p-4">
            <p className="font-semibold text-stone-950">{list.label}</p>
            {list.items.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-stone-700">
                {list.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-stone-500">还没有内容。</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CollapsibleReportSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-[2rem]">
      <details className="group" open={defaultOpen}>
        <summary className="list-none cursor-pointer px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xl font-semibold text-stone-950">{title}</p>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">{description}</p>
            </div>
            <Badge className="rounded-full" variant="outline">
              展开 / 收起
            </Badge>
          </div>
        </summary>
        <div className="border-t border-stone-200 px-6 py-6">
          <div className="grid gap-6">{children}</div>
        </div>
      </details>
    </Card>
  );
}

function formatDateRange(
  overview:
    | {
        date_from: string | null;
        date_to: string | null;
      }
    | undefined,
) {
  if (!overview?.date_from && !overview?.date_to) {
    return "-";
  }

  if (overview.date_from && overview.date_to) {
    return `${overview.date_from} -> ${overview.date_to}`;
  }

  return overview.date_from ?? overview.date_to ?? "-";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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
