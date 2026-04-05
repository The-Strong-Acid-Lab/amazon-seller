import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ProjectProductCard({
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

export function AnalysisInputsCard({
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
    import_status: "uploaded" | "parsed" | "normalized" | "failed";
    error_message: string | null;
    sheet_name: string | null;
  }>;
  productNameById: Map<string, string>;
}) {
  const latestImports = importFiles.slice(0, 6);

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>本次分析输入</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="rounded-2xl border border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-900">我的商品输入</p>
            {targetProduct ? (
              <div className="mt-4 grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full" variant="default">
                    target
                  </Badge>
                  <Badge className="rounded-full" variant="outline">
                    {hasListingInput(targetProduct)
                      ? "已填 listing"
                      : "未填 listing"}
                  </Badge>
                  <Badge className="rounded-full" variant="outline">
                    {reviewCountByProduct.get(targetProduct.id) ?? 0} reviews
                  </Badge>
                  <Badge className="rounded-full" variant="outline">
                    {importCountByProduct.get(targetProduct.id) ?? 0} imports
                  </Badge>
                </div>
                <p className="text-base font-semibold text-stone-950">
                  {targetProduct.name ?? "未命名我的商品"}
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
              <p className="mt-4 text-sm text-stone-500">
                当前项目还没有我的商品。
              </p>
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
                        {hasListingInput(product)
                          ? "已填 listing"
                          : "未填 listing"}
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
                      归属商品：
                      {item.project_product_id
                        ? (productNameById.get(item.project_product_id) ??
                          "未知商品")
                        : "未关联商品"}
                    </p>
                    {item.error_message ? (
                      <p className="mt-1 text-sm text-rose-700">
                        失败原因：{item.error_message}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full" variant="outline">
                      {item.row_count} rows
                    </Badge>
                    <Badge
                      className={cn(
                        "rounded-full",
                        getImportStatusBadgeClass(item.import_status),
                      )}
                      variant={getImportStatusBadgeVariant(item.import_status)}
                    >
                      {formatImportStatus(item.import_status)}
                    </Badge>
                    {item.sheet_name ? (
                      <Badge className="rounded-full" variant="outline">
                        {item.sheet_name}
                      </Badge>
                    ) : null}
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

export function ReportVersionCard({
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
          <MetricCard
            label="已纳入评论文件"
            value={String(context.reportInputFileCount)}
          />
          <MetricCard
            label="已纳入竞品"
            value={String(context.reportCompetitorCount)}
          />
          <MetricCard
            label="已纳入 listing"
            value={String(context.reportListingInputCount)}
          />
          <MetricCard
            label="当时我的商品评论"
            value={String(context.reportTargetReviewCount)}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-900">
              分析后新增评论导入
            </p>
            <div className="mt-4 grid gap-3">
              {context.addedImportsAfterReport.length > 0 ? (
                context.addedImportsAfterReport.map((item) => (
                  <div
                    key={`${item.label}-${item.created_at}`}
                    className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <p className="text-sm font-medium text-stone-950">
                      {item.label}
                    </p>
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
            <p className="text-sm font-semibold text-stone-900">
              分析后新增 listing 修改
            </p>
            <div className="mt-4 grid gap-3">
              {context.updatedListingsAfterReport.length > 0 ? (
                context.updatedListingsAfterReport.map((item) => (
                  <div
                    key={`${item.label}-${item.updated_at}`}
                    className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <p className="text-sm font-medium text-stone-950">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      修改时间：{formatDateTime(item.updated_at)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-500">
                  当前没有新增 listing 修改。
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function hasListingInput(product: {
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

export function sortVocResponseItems(
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

function formatImportStatus(status: "uploaded" | "parsed" | "normalized" | "failed") {
  switch (status) {
    case "uploaded":
      return "仅上传";
    case "parsed":
      return "已解析";
    case "normalized":
      return "已入库";
    case "failed":
      return "失败";
    default:
      return status;
  }
}

function getImportStatusBadgeVariant(status: "uploaded" | "parsed" | "normalized" | "failed") {
  switch (status) {
    case "normalized":
      return "default" as const;
    case "parsed":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function getImportStatusBadgeClass(status: "uploaded" | "parsed" | "normalized" | "failed") {
  if (status === "failed") {
    return "border-rose-200 text-rose-700";
  }

  return "";
}

export function formatPriority(priority?: string) {
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

export function formatExecutionArea(area?: string) {
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

export function MetricCard({ label, value }: { label: string; value: string }) {
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

export function TaskListCard({
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

export function ListingDraftCard({
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

export function ImageBriefCard({
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

export function APlusBriefCard({
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

export function PersonaCard({
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

export function OverviewCard({
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

export function InsightListCard({
  title,
  description,
  items,
  emptyLabel = "还没有可展示的主题。",
}: {
  title: string;
  description?: string;
  items: Array<{ theme: string; summary: string; evidence: string[] }>;
  emptyLabel?: string;
}) {
  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
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

export function LabelSummaryCard({
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

export function StringListCard({
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

export function CollapsibleReportSection({
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

export function formatDateTime(value: string | null) {
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
