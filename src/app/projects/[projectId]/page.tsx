import Link from "next/link";
import { notFound } from "next/navigation";

import type { AnalysisReportShape } from "@/lib/analysis";
import { getProjectPageData } from "@/lib/projects";
import { AnalyzeProjectButton } from "@/components/analyze-project-button";
import { ProjectSourceImport } from "@/components/project-source-import";
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
    comparison_opportunities: summary.comparison_opportunities ?? [],
    comparison_risks: summary.comparison_risks ?? [],
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

    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs text-stone-600">
                  PROJECT
                </Badge>
                <Link className="text-sm text-stone-500 hover:text-stone-900" href="/">
                  返回导入页
                </Link>
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950">
                {data.project.name}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-8 text-stone-600">
                当前项目已保存 {data.reviews.length} 条评论。下一步是把这些评论转成可操作的 VOC 洞察和转化策略。
              </p>
            </div>

            <AnalyzeProjectButton projectId={data.project.id} />
          </div>

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
                  这些商品的评论和 listing 会作为目标商品的参考证据。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {competitorProducts.length > 0 ? (
                  competitorProducts.map((product) => (
                    <ProjectProductCard
                      key={product.id}
                      asin={product.asin}
                      importCount={importCountByProduct.get(product.id) ?? 0}
                      isLaunched={product.is_launched}
                      market={product.market}
                      name={product.name ?? "未命名竞品"}
                      productUrl={product.product_url}
                      reviewCount={reviewCountByProduct.get(product.id) ?? 0}
                      role="competitor"
                    />
                  ))
                ) : (
                  <p className="text-sm text-stone-500">当前还没有挂载竞品商品。</p>
                )}
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
                  description="如果目标商品已有评论，这里反映买家对它的真实认可点。"
                  items={report.target_positive_themes}
                  title="目标商品正向主题"
                />
                <InsightListCard
                  description="如果目标商品已有评论，这里反映当前最影响转化的负面反馈。"
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
                      label: "Hero image",
                      items: report.image_strategy?.hero_image
                        ? [report.image_strategy.hero_image]
                        : [],
                    },
                    {
                      label: "Feature callouts",
                      items: report.image_strategy?.feature_callouts ?? [],
                    },
                    {
                      label: "Objection handling",
                      items: report.image_strategy?.objection_handling_images ?? [],
                    },
                    {
                      label: "Lifestyle scenes",
                      items: report.image_strategy?.lifestyle_scenes ?? [],
                    },
                  ]}
                  title="图片策略"
                />
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-[1.5rem] shadow-none">
      <CardContent className="px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          {label}
        </p>
        <p className="mt-3 text-2xl font-semibold text-stone-950">{value}</p>
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
}: {
  title: string;
  description: string;
  items: Array<{ theme: string; summary: string; evidence: string[] }>;
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
          <p className="text-sm text-stone-500">还没有可展示的主题。</p>
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
  items: Array<{ label: string; summary: string }>;
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
