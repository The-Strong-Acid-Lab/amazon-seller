"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ImportPreview } from "@/lib/review-import";
import { cn } from "@/lib/utils";

const ACCEPTED_FILE_TYPES = ".xlsx,.csv";
const ANALYSIS_FIELDS = [
  "ASIN",
  "标题",
  "内容",
  "星级",
  "型号",
  "所属国家",
  "评论时间",
  "图片数量",
  "是否有视频",
] as const;

type ImportResponse = ImportPreview & {
  error?: string;
  persisted?: {
    projectId: string;
    importFileId: string;
    importedReviews: number;
  };
};

export function ImportWorkbench() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    if (!file) {
      return;
    }

    const suggestedName = file.name.replace(/\.[^.]+$/, "").trim();

    setProjectName((currentName) => currentName || suggestedName);
  }, [file]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("先选择一个 Excel 或 CSV 文件。");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSaveMessage(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "preview");

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ImportResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "文件解析失败。");
      }

      setResult(payload);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "文件解析失败。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveToSupabase() {
    if (!file) {
      setError("请先选择要导入的文件。");
      return;
    }

    if (!projectName.trim()) {
      setError("请先填写项目名称。");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveMessage(null);
    setSavedProjectId(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "import");
      formData.append("projectName", projectName.trim());

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ImportResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "保存到 Supabase 失败。");
      }

      setResult(payload);

      if (payload.persisted) {
        setSavedProjectId(payload.persisted.projectId);
        setSaveMessage(
          `已写入 Supabase: project ${payload.persisted.projectId}，共导入 ${payload.persisted.importedReviews} 条评论。`,
        );
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存到 Supabase 失败。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="rounded-[2rem] border-stone-200 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
              Import Workbench
            </p>
            <CardTitle className="mt-3">上传卖家现有评论文件</CardTitle>
          </div>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs text-stone-600">
            V1 / Preview
          </Badge>
        </CardHeader>

        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-3 rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-5">
              <div className="grid gap-1">
                <p className="text-sm font-medium text-stone-900">
                  支持 Excel `.xlsx` 和 `.csv`
                </p>
                <CardDescription className="leading-6">
                  第一版先确保我们能稳定读懂第三方评论导出文件，再进入数据库入库和分析。
                </CardDescription>
              </div>
              <Input
                accept={ACCEPTED_FILE_TYPES}
                className="cursor-pointer border-stone-200 bg-white file:mr-4 file:rounded-md file:bg-stone-100 file:px-3 file:py-1.5 hover:file:bg-stone-200"
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="grid gap-2">
              <div className="grid gap-1">
                <p className="text-sm font-medium text-stone-900">分析项目名称</p>
                <p className="text-xs leading-5 text-stone-500">
                  这是你在系统内部给这次导入起的名字，不是 Supabase 后台里的项目名称。
                </p>
              </div>
              <Input
                placeholder="例如: meditation-chair-us-2025-11"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button className="rounded-full px-5" disabled={isLoading} type="submit">
                {isLoading ? "正在解析..." : "解析并生成预览"}
              </Button>
              <Button
                className="rounded-full px-5"
                disabled={isSaving || !file || !result}
                type="button"
                variant="outline"
                onClick={handleSaveToSupabase}
              >
                {isSaving ? "正在写入..." : "保存到 Supabase"}
              </Button>
              {file ? (
                <p className="text-sm text-stone-600">
                  当前文件:{" "}
                  <span className="font-medium text-stone-900">{file.name}</span>
                </p>
              ) : null}
            </div>

            {error ? (
              <Alert className="rounded-2xl" variant="destructive">
                <AlertTitle>导入失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {saveMessage ? (
              <Alert className="rounded-2xl">
                <AlertTitle>保存成功</AlertTitle>
                <AlertDescription>
                  <p>{saveMessage}</p>
                  {savedProjectId ? (
                    <Link
                      className="mt-2 inline-flex text-sm font-medium text-stone-900 underline"
                      href={`/projects/${savedProjectId}`}
                    >
                      查看项目详情
                    </Link>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-stone-800 bg-stone-950 text-stone-50 shadow-[0_20px_70px_rgba(15,23,42,0.16)]">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
            What This Checks
          </p>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-4 text-sm leading-6 text-stone-300">
            <li>按真实 Excel 列坐标读取，避免空单元格导致字段错位。</li>
            <li>自动忽略 `Note` 这类非数据 sheet。</li>
            <li>把评论文件标准化成后续可入库的 review 结构。</li>
            <li>先给出字段、统计和样例预览，再进入数据库和分析阶段。</li>
          </ul>
        </CardContent>
      </Card>

      {result ? (
        <Card className="rounded-[2rem] border-stone-200 shadow-[0_20px_70px_rgba(15,23,42,0.08)] lg:col-span-2">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-5 space-y-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                Import Preview
              </p>
              <CardTitle className="mt-3">{result.fileName}</CardTitle>
              <CardDescription className="mt-2">
                当前解析 sheet:{" "}
                <span className="font-medium text-stone-900">
                  {result.selectedSheet}
                </span>
              </CardDescription>
            </div>
            <div className="grid gap-2 text-right text-sm text-stone-600">
              <span>
                文件类型: <span className="font-medium text-stone-900">{result.fileType}</span>
              </span>
              <span>
                评论行数: <span className="font-medium text-stone-900">{result.totalRows}</span>
              </span>
              <span>
                Sheet 数量:{" "}
                <span className="font-medium text-stone-900">
                  {result.sheetNames.length}
                </span>
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {result.warnings.length > 0 ? (
              <Alert className="rounded-2xl" variant="warning">
                <AlertTitle>导入提醒</AlertTitle>
                <AlertDescription>{result.warnings.join(" ")}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Unique ASINs" value={String(result.stats.uniqueAsins)} />
              <StatCard
                label="Image Reviews"
                value={String(result.stats.reviewsWithImages)}
              />
              <StatCard
                label="Video Reviews"
                value={String(result.stats.reviewsWithVideos)}
              />
              <StatCard label="Date From" value={result.stats.dateRange.from ?? "-"} />
              <StatCard label="Date To" value={result.stats.dateRange.to ?? "-"} />
              <StatCard
                label="Countries"
                value={String(Object.keys(result.stats.countryDistribution).length)}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <InfoCard
                title="用于分析的关键字段"
                description="这是后续 VOC 提炼、痛点归类和策略生成真正会用到的字段。"
                items={ANALYSIS_FIELDS.map((field) =>
                  result.header.includes(field) ? field : `${field}（未检测到）`,
                )}
                emptyLabel="没有检测到可用于分析的字段"
              />
              <InfoCard
                title="评分分布"
                description="这部分是直接给人看的分析摘要，用来判断评论结构是否健康。"
                items={Object.entries(result.stats.ratingDistribution).map(
                  ([rating, count]) => `${rating} 星: ${count}`,
                )}
                emptyLabel="没有检测到评分"
              />
            </div>

            <details className="rounded-[1.5rem] border border-stone-200 bg-stone-50 px-4 py-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-stone-900">
                查看原始文件字段（{result.header.length} 列）
              </summary>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                这一部分主要用于校验导入是否读对，不是给最终分析结果看的。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.header.map((item) => (
                  <Badge
                    key={item}
                    className="rounded-full border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700"
                    variant="outline"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </details>

            <div className="overflow-hidden rounded-[1.5rem] border border-stone-200">
              <div className="border-b border-stone-200 bg-stone-100 px-4 py-3">
                <h4 className="text-sm font-semibold text-stone-900">
                  标准化样例评论
                </h4>
                <p className="mt-1 text-xs text-stone-500">
                  这里只展示给人核对用的关键列，不会把原始 19 列全部铺开。
                </p>
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
                  {result.sampleRows.map((row, index) => (
                    <TableRow key={`${row.asin}-${row.reviewTitle}-${index}`}>
                      <TableCell>{row.asin || "-"}</TableCell>
                      <TableCell className="max-w-[26rem]">{row.reviewTitle || "-"}</TableCell>
                      <TableCell>{row.rating ?? "-"}</TableCell>
                      <TableCell>{row.model || "-"}</TableCell>
                      <TableCell>{row.country || "-"}</TableCell>
                      <TableCell>{row.reviewDate || "-"}</TableCell>
                      <TableCell>{row.imageCount > 0 ? "是" : "否"}</TableCell>
                      <TableCell>{row.hasVideo ? "是" : "否"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-[1.5rem] border-stone-200 bg-stone-50 shadow-none">
      <CardContent className="px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold text-stone-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoCard({
  title,
  description,
  items,
  emptyLabel,
}: {
  title: string;
  description?: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <Card className="rounded-[1.5rem] border-stone-200 bg-stone-50 shadow-none">
      <CardContent className="p-4">
        <h4 className="text-sm font-semibold text-stone-900">{title}</h4>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {items.length > 0 ? (
            items.map((item) => {
              const isMissing = item.includes("（未检测到）");

              return (
                <Badge
                  key={item}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    isMissing
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-stone-300 bg-white text-stone-700",
                  )}
                  variant="outline"
                >
                  {item}
                </Badge>
              );
            })
          ) : (
            <p className="text-sm text-stone-500">{emptyLabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
