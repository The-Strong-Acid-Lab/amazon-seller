"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ANALYSIS_FIELDS } from "@/components/import-workbench/constants";
import { InfoCard, StatCard } from "@/components/import-workbench/ui-blocks";
import type { SourcePreviewEntry } from "@/components/import-workbench/types";
import { cn } from "@/lib/utils";

export function ImportPreviewPanel({
  parsedSourceEntries,
  sourceFileCount,
  canStartAnalysis,
  isSaving,
  onStartAnalysis,
}: {
  parsedSourceEntries: Array<[string, SourcePreviewEntry]>;
  sourceFileCount: number;
  canStartAnalysis: boolean;
  isSaving: boolean;
  onStartAnalysis: () => void;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border border-[var(--page-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,250,242,0.86))] shadow-[0_20px_70px_rgba(54,40,24,0.08)] lg:col-span-2">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-5 space-y-0">
        <div>
          <CardTitle className="mt-3">
            {parsedSourceEntries.length > 0
              ? `已解析 ${parsedSourceEntries.length} 份评论文件`
              : "尚未生成预览"}
          </CardTitle>
          <CardDescription className="mt-2">
            {parsedSourceEntries.length > 0
              ? "下面按商品来源展示每份评论文件的质量检查和样例，方便横向比较。"
              : "先在任意商品卡片上传评论文件，然后点击“解析并生成预览”。"}
          </CardDescription>
          {parsedSourceEntries.length > 0 ? (
            <p className="mt-2 text-xs text-[var(--page-muted)]">
              所有已上传来源会一次性解析，不再只展示最后一个文件。
            </p>
          ) : null}
        </div>
        <div className="flex min-w-[12rem] flex-col items-end gap-3">
          <Button
            className="rounded-full px-5"
            disabled={!canStartAnalysis || isSaving}
            onClick={onStartAnalysis}
            type="button"
          >
            {isSaving ? "正在分析..." : "开始分析"}
          </Button>
          <div className="grid gap-2 text-right text-sm text-stone-600">
            <span>
              来源数量:{" "}
              <span className="font-medium text-stone-900">
                {parsedSourceEntries.length || "-"}
              </span>
            </span>
            <span>
              总评论行数:{" "}
              <span className="font-medium text-stone-900">
                {parsedSourceEntries.reduce(
                  (total, [, entry]) => total + entry.preview.totalRows,
                  0,
                ) || "-"}
              </span>
            </span>
            <span>
              待上传来源:{" "}
              <span className="font-medium text-stone-900">
                {sourceFileCount}
              </span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {parsedSourceEntries.length > 0 ? (
          <>
            <Alert className="rounded-2xl border-[var(--page-border)] bg-white/80">
              <AlertTitle>批量上传模式</AlertTitle>
              <AlertDescription>
                点击“开始分析”会把所有已绑定来源文件一次性处理，不需要手动切换。
              </AlertDescription>
            </Alert>

            {parsedSourceEntries.map(([sourceId, entry]) => {
              const reviewRows = entry.preview.totalRows;
              const ratings = entry.preview.stats.ratingDistribution;
              const totalRated = Object.values(ratings).reduce(
                (sum, count) => sum + count,
                0,
              );
              const weightedScore = Object.entries(ratings).reduce(
                (sum, [rating, count]) => sum + Number(rating) * count,
                0,
              );
              const averageRating =
                totalRated > 0 ? (weightedScore / totalRated).toFixed(2) : "-";
              const negativeCount = (ratings["1"] ?? 0) + (ratings["2"] ?? 0);
              const negativeRatio =
                totalRated > 0
                  ? `${Math.round((negativeCount / totalRated) * 100)}%`
                  : "-";

              return (
                <div
                  key={sourceId}
                  className="space-y-5 rounded-[1.5rem] border border-[var(--page-border)] bg-white/84 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        {entry.snapshot.role === "target" ? "我的商品" : "竞品"}
                        ：{entry.snapshot.name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--page-muted)]">
                        市场 {entry.snapshot.market} · 文件{" "}
                        {entry.preview.fileName}
                      </p>
                    </div>
                    <Badge
                      className="rounded-full border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-600"
                      variant="outline"
                    >
                      {entry.snapshot.role === "target"
                        ? "我的商品"
                        : "竞品来源"}
                    </Badge>
                  </div>

                  {entry.preview.warnings.length > 0 ? (
                    <Alert className="rounded-2xl" variant="warning">
                      <AlertTitle>导入提醒</AlertTitle>
                      <AlertDescription>
                        {entry.preview.warnings.join(" ")}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-5">
                    <StatCard label="评论行数" value={String(reviewRows)} />
                    <StatCard label="平均星级" value={averageRating} />
                    <StatCard label="低分占比(1-2星)" value={negativeRatio} />
                    <StatCard
                      label="有图评论"
                      value={String(entry.preview.stats.reviewsWithImages)}
                    />
                    <StatCard
                      label="有视频评论"
                      value={String(entry.preview.stats.reviewsWithVideos)}
                    />
                  </div>

                  <InfoCard
                    title="评分分布"
                    items={Object.entries(ratings).map(
                      ([rating, count]) => `${rating} 星: ${count}`,
                    )}
                    emptyLabel="没有检测到评分"
                  />

                  <details className="rounded-[1.25rem] border border-[var(--page-border)] bg-white/80 px-4 py-3">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-stone-900">
                      高级校验（字段识别与原始表头）
                    </summary>
                    <div className="mt-3 grid gap-5 xl:grid-cols-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          分析关键字段检查
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ANALYSIS_FIELDS.map((field) => {
                            const matched =
                              entry.preview.header.includes(field);

                            return (
                              <Badge
                                key={field}
                                className={cn(
                                  "rounded-full px-3 py-1 text-xs font-medium",
                                  matched
                                    ? "border-stone-300 bg-white text-stone-700"
                                    : "border-amber-300 bg-amber-50 text-amber-800",
                                )}
                                variant="outline"
                              >
                                {matched ? field : `${field}（未检测到）`}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          原始文件字段（{entry.preview.header.length} 列）
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {entry.preview.header.map((item) => (
                            <Badge
                              key={item}
                              className="rounded-full border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700"
                              variant="outline"
                            >
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>

                  <div className="overflow-hidden rounded-[1.25rem] border border-[var(--page-border)] bg-white">
                    <div className="border-b border-[var(--page-border)] bg-[rgba(154,100,55,0.06)] px-4 py-3">
                      <h4 className="text-sm font-semibold text-stone-900">
                        标准化样例评论（前 3 条）
                      </h4>
                    </div>
                    <Table>
                      <TableHeader className="bg-stone-50">
                        <TableRow className="hover:bg-transparent">
                          {[
                            "ASIN",
                            "标题",
                            "星级",
                            "型号",
                            "国家",
                            "时间",
                            "有图",
                            "有视频",
                          ].map((heading) => (
                            <TableHead key={heading}>{heading}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="bg-white text-stone-800">
                        {entry.preview.sampleRows
                          .slice(0, 3)
                          .map((row, index) => (
                            <TableRow key={`${sourceId}-${row.asin}-${index}`}>
                              <TableCell>{row.asin || "-"}</TableCell>
                              <TableCell className="max-w-[24rem]">
                                {row.reviewTitle || "-"}
                              </TableCell>
                              <TableCell>{row.rating ?? "-"}</TableCell>
                              <TableCell>{row.model || "-"}</TableCell>
                              <TableCell>{row.country || "-"}</TableCell>
                              <TableCell>{row.reviewDate || "-"}</TableCell>
                              <TableCell>
                                {row.imageCount > 0 ? "是" : "否"}
                              </TableCell>
                              <TableCell>
                                {row.hasVideo ? "是" : "否"}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <Alert className="rounded-2xl border-[var(--page-border)] bg-white/80">
            <AlertTitle>等待预览数据</AlertTitle>
            <AlertDescription>
              你在任意商品卡片上传评论文件并点击“解析并生成预览”后，结果会在这里更新。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
