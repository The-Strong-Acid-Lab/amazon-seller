import Link from "next/link";
import { notFound } from "next/navigation";

import type { AnalysisReportShape } from "@/lib/analysis";
import { getProjectPageData } from "@/lib/projects";
import { AnalyzeProjectButton } from "@/components/analyze-project-button";
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
    positive_themes: summary.positive_themes ?? [],
    negative_themes: summary.negative_themes ?? [],
    buyer_desires: summary.buyer_desires ?? [],
    buyer_objections: summary.buyer_objections ?? [],
    usage_scenarios: summary.usage_scenarios ?? [],
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
            <MetricCard label="目标市场" value={data.project.target_market ?? "-"} />
            <MetricCard label="目标 ASIN" value={data.project.target_asin ?? "-"} />
          </div>

          {report ? (
            <div className="grid gap-6">
              <Card className="rounded-[2rem]">
                <CardHeader>
                  <CardTitle>分析总览</CardTitle>
                  <CardDescription>
                    这部分由 LLM 基于评论内容生成，但数据规模和评分结构来自真实评论。
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
                <InsightListCard
                  description="买家反复认可的价值点。"
                  items={report.positive_themes}
                  title="正向主题"
                />
                <InsightListCard
                  description="最可能阻碍转化的风险和抱怨。"
                  items={report.negative_themes}
                  title="负向主题"
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

              <Card className="rounded-[2rem]">
                <CardHeader>
                  <CardTitle>VOC 到响应策略</CardTitle>
                  <CardDescription>
                    把评论里的声音转成 listing、图片和广告的具体动作。
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {report.voc_response_matrix.length > 0 ? (
                    report.voc_response_matrix.map((item) => (
                      <div
                        key={`${item.voc_theme}-${item.buyer_signal}`}
                        className="rounded-2xl border border-stone-200 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="rounded-full" variant="outline">
                            {item.voc_theme}
                          </Badge>
                          <Badge className="rounded-full" variant="secondary">
                            {item.confidence}
                          </Badge>
                        </div>
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
