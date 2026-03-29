"use client";

import { useEffect, useMemo, useState } from "react";

import type { CompetitorInsightShape } from "@/lib/analysis";
import { InsightListCard, LabelSummaryCard } from "@/components/project-page/sections";
import { ProductListingEditor } from "@/components/product-listing-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type CompetitorProduct = {
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
};

type CompetitorReview = {
  id: string;
  project_product_id: string | null;
  review_title: string;
  review_body: string;
  rating: number | null;
  review_date: string | null;
  country: string | null;
  image_count: number;
  has_video: boolean;
};

export function CompetitorListModal({
  projectId,
  competitors,
  reviews,
  importCountByProduct,
}: {
  projectId: string;
  competitors: CompetitorProduct[];
  reviews: CompetitorReview[];
  importCountByProduct: Record<string, number>;
}) {
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
  const selectedCompetitor = competitors.find((item) => item.id === selectedCompetitorId) ?? null;

  const reviewsByProduct = useMemo(() => {
    const grouped = new Map<string, CompetitorReview[]>();

    for (const review of reviews) {
      if (!review.project_product_id) {
        continue;
      }

      const current = grouped.get(review.project_product_id) ?? [];
      current.push(review);
      grouped.set(review.project_product_id, current);
    }

    return grouped;
  }, [reviews]);

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>竞品列表</CardTitle>
        <CardDescription>
          先看所有竞品，再点开某个竞品看详情、评论概览和 listing。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {competitors.length > 0 ? (
          competitors.map((competitor) => {
            const competitorReviews = reviewsByProduct.get(competitor.id) ?? [];
            const hasListing =
              Boolean(competitor.current_title) ||
              Boolean(competitor.current_bullets) ||
              Boolean(competitor.current_description);

            return (
              <Dialog
                key={competitor.id}
                open={selectedCompetitorId === competitor.id}
                onOpenChange={(open) => setSelectedCompetitorId(open ? competitor.id : null)}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 p-4">
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full" variant="outline">
                        {competitor.market ?? "-"}
                      </Badge>
                      <Badge className="rounded-full" variant="outline">
                        {competitorReviews.length} reviews
                      </Badge>
                      <Badge className="rounded-full" variant="outline">
                        {importCountByProduct[competitor.id] ?? 0} imports
                      </Badge>
                      <Badge className="rounded-full" variant={hasListing ? "secondary" : "outline"}>
                        {hasListing ? "有 listing" : "缺 listing"}
                      </Badge>
                    </div>
                    <p className="text-base font-semibold text-stone-950">
                      {competitor.name ?? "未命名竞品"}
                    </p>
                    <p className="text-sm text-stone-600">ASIN: {competitor.asin ?? "-"}</p>
                  </div>
                  <DialogTrigger asChild>
                    <Button className="rounded-full" variant="outline">
                      查看竞品详情
                    </Button>
                  </DialogTrigger>
                </div>

                <DialogOverlay />
                <DialogContent className="max-w-[min(96vw,1440px)] p-0">
                  {selectedCompetitor ? (
                    <CompetitorDetailContent
                      competitor={selectedCompetitor}
                      projectId={projectId}
                      reviews={reviewsByProduct.get(selectedCompetitor.id) ?? []}
                      importCount={importCountByProduct[selectedCompetitor.id] ?? 0}
                    />
                  ) : null}
                </DialogContent>
              </Dialog>
            );
          })
        ) : (
          <p className="text-sm text-stone-500">当前还没有挂载竞品商品。</p>
        )}
      </CardContent>
    </Card>
  );
}

function CompetitorDetailContent({
  projectId,
  competitor,
  reviews,
  importCount,
}: {
  projectId: string;
  competitor: CompetitorProduct;
  reviews: CompetitorReview[];
  importCount: number;
}) {
  const stats = buildReviewStats(reviews);
  const [insight, setInsight] = useState<CompetitorInsightShape | null>(null);
  const [cachedUpdatedAt, setCachedUpdatedAt] = useState<string | null>(null);
  const [isLoadingCached, setIsLoadingCached] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const positiveSamples = reviews
    .filter((review) => (review.rating ?? 0) >= 4)
    .slice(0, 3);
  const negativeSamples = reviews
    .filter((review) => (review.rating ?? 0) <= 2)
    .slice(0, 3);

  useEffect(() => {
    let isCancelled = false;

    async function loadCachedInsight() {
      setIsLoadingCached(true);
      setError(null);
      setInsight(null);
      setCachedUpdatedAt(null);

      try {
        const response = await fetch(
          `/api/projects/${projectId}/products/${competitor.id}/analyze`,
        );

        if (response.status === 404) {
          return;
        }

        const payload = (await response.json()) as {
          error?: string;
          insight?: CompetitorInsightShape;
          updatedAt?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "读取竞品洞察失败。");
        }

        if (!isCancelled) {
          setInsight(payload.insight ?? null);
          setCachedUpdatedAt(payload.updatedAt ?? null);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "读取竞品洞察失败。");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingCached(false);
        }
      }
    }

    void loadCachedInsight();

    return () => {
      isCancelled = true;
    };
  }, [competitor.id, projectId]);

  async function handleAnalyzeCompetitor() {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/products/${competitor.id}/analyze`,
        {
          method: "POST",
        },
      );
      const payload = (await response.json()) as {
        error?: string;
        insight?: CompetitorInsightShape;
        updatedAt?: string;
      };

      if (!response.ok || !payload.insight) {
        throw new Error(payload.error ?? "生成竞品洞察失败。");
      }

      setInsight(payload.insight);
      setCachedUpdatedAt(payload.updatedAt ?? null);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error ? analysisError.message : "生成竞品洞察失败。",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="flex max-h-[90vh] flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-6 md:px-8">
        <DialogHeader>
          <DialogTitle>{competitor.name ?? "未命名竞品"}</DialogTitle>
          <DialogDescription>
            先看这个竞品自己的评论结构和 listing，再决定它对我的商品的参考价值。
          </DialogDescription>
        </DialogHeader>
        <DialogClose className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900">
          ×
        </DialogClose>
      </div>

      <div className="scrollbar-hidden flex-1 overflow-y-auto px-6 py-6 md:px-8">
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniMetric label="评论数" value={String(reviews.length)} />
            <MiniMetric label="导入次数" value={String(importCount)} />
            <MiniMetric
              label="评分分布"
              value={formatRatingDistribution(stats.ratingDistribution)}
            />
            <MiniMetric
              label="时间范围"
              value={formatDateRange(stats.dateFrom, stats.dateTo)}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <Card className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle>基础信息</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-stone-700">
                <p>
                  <span className="font-medium text-stone-900">ASIN:</span>{" "}
                  {competitor.asin ?? "-"}
                </p>
                <p>
                  <span className="font-medium text-stone-900">市场:</span>{" "}
                  {competitor.market ?? "-"}
                </p>
                <p>
                  <span className="font-medium text-stone-900">状态:</span>{" "}
                  {competitor.is_launched ? "已上线" : "未上线"}
                </p>
                <p className="break-all">
                  <span className="font-medium text-stone-900">URL:</span>{" "}
                  {competitor.product_url ?? "-"}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle>评论信号</CardTitle>
                <CardDescription>
                  这里先展示这个竞品自己的评论样本，帮助你快速感知它被夸和被骂的点。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <ReviewSampleGroup
                  title="高分样本"
                  items={positiveSamples}
                  emptyLabel="暂无高分样本。"
                />
                <ReviewSampleGroup
                  title="低分样本"
                  items={negativeSamples}
                  emptyLabel="暂无低分样本。"
                />
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[1.5rem]">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>竞品洞察</CardTitle>
                  <CardDescription>
                    单独分析这个竞品的评论和
                    listing，看看它强在哪、弱在哪，以及对 target 有什么启发。
                  </CardDescription>
                </div>
                <Button
                  className="rounded-full"
                  disabled={isAnalyzing || isLoadingCached}
                  onClick={handleAnalyzeCompetitor}
                  variant="outline"
                >
                  {isLoadingCached
                    ? "正在读取..."
                    : isAnalyzing
                      ? "正在生成..."
                      : insight
                        ? "重新生成洞察"
                        : "生成竞品洞察"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6">
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>生成失败</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {cachedUpdatedAt ? (
                <p className="text-sm text-stone-500">
                  当前展示的是已保存洞察，更新时间：
                  {formatDateTime(cachedUpdatedAt)}
                </p>
              ) : null}

              {isLoadingCached ? (
                <p className="text-sm text-stone-500">
                  正在读取已保存的竞品洞察...
                </p>
              ) : insight ? (
                <div className="grid gap-6">
                  <div className="grid gap-6 xl:grid-cols-2">
                    <InsightListCard
                      description="这个竞品被买家反复认可的主题。"
                      items={insight.positive_themes}
                      title="竞品正向主题"
                    />
                    <InsightListCard
                      description="这个竞品当前最明显的负面反馈。"
                      items={insight.negative_themes}
                      title="竞品负向主题"
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <LabelSummaryCard
                      items={insight.purchase_drivers}
                      title="它为什么会被买"
                    />
                    <LabelSummaryCard
                      items={insight.negative_opinions}
                      title="它为什么会让人犹豫"
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <LabelSummaryCard
                      items={insight.listing_angles}
                      title="它现在页面在讲什么"
                    />
                    <LabelSummaryCard
                      items={insight.inspiration_for_target}
                      title="对我的商品的启发"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-stone-500">
                  当前还没有已保存的竞品洞察。先点上面的“生成竞品洞察”，再看这个竞品自己的主题、驱动因素和对
                  target 的启发。
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <Card className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle>Listing 录入说明</CardTitle>
                <CardDescription>
                  这里先手动粘贴该竞品的标题、bullets
                  和描述。重新分析后，系统会把评论和 listing 一起看。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-7 text-stone-700">
                <p>1. 先补标题，明确竞品在主打什么。</p>
                <p>2. 再补 bullets，看它如何组织卖点顺序。</p>
                <p>3. 描述和备注用于补充页面表达或你观察到的定位信息。</p>
              </CardContent>
            </Card>

            <ProductListingEditor projectId={projectId} product={competitor} />
          </div>
        </div>
      </div>

      <DialogFooter className="border-t border-stone-200 px-6 py-4 md:px-8">
        <DialogClose className="inline-flex h-10 items-center justify-center rounded-full border border-stone-300 bg-white px-4 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-100">
          关闭
        </DialogClose>
      </DialogFooter>
    </div>
  );
}

function ReviewSampleGroup({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: CompetitorReview[];
  emptyLabel: string;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold text-stone-900">{title}</p>
      {items.length > 0 ? (
        items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-stone-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full" variant="outline">
                {item.rating ?? "-"} 星
              </Badge>
              <Badge className="rounded-full" variant="outline">
                {item.review_date ?? "-"}
              </Badge>
            </div>
            <p className="mt-2 text-sm font-medium text-stone-900">{item.review_title || "无标题"}</p>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              {item.review_body.slice(0, 220) || "无正文"}
            </p>
          </div>
        ))
      ) : (
        <p className="text-sm text-stone-500">{emptyLabel}</p>
      )}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-3 text-sm font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function buildReviewStats(reviews: CompetitorReview[]) {
  const ratingDistribution: Record<string, number> = {};
  let dateFrom: string | null = null;
  let dateTo: string | null = null;

  for (const review of reviews) {
    if (review.rating !== null) {
      const key = String(review.rating);
      ratingDistribution[key] = (ratingDistribution[key] ?? 0) + 1;
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

  return { ratingDistribution, dateFrom, dateTo };
}

function formatRatingDistribution(distribution: Record<string, number>) {
  const entries = Object.entries(distribution);

  if (entries.length === 0) {
    return "-";
  }

  return entries
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([rating, count]) => `${rating}:${count}`)
    .join(" / ");
}

function formatDateRange(dateFrom: string | null, dateTo: string | null) {
  if (!dateFrom && !dateTo) {
    return "-";
  }

  if (dateFrom && dateTo) {
    return `${dateFrom} -> ${dateTo}`;
  }

  return dateFrom ?? dateTo ?? "-";
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
