"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm, type UseFormRegister } from "react-hook-form";

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
    targetProductId: string;
    reviewSourceProductId: string;
    importFileId: string;
    importedReviews: number;
  };
};

type ImportFormValues = {
  projectName: string;
  targetProductName: string;
  targetProductAsin: string;
  targetProductUrl: string;
  targetMarket: string;
  targetIsLaunched: boolean;
  reviewSourceRole: "target" | "competitor";
  reviewSourceName: string;
  reviewSourceAsin: string;
  reviewSourceUrl: string;
  reviewSourceMarket: string;
};

type CompetitorDraft = {
  id: string;
  name: string;
  asin: string;
  url: string;
  market: string;
};

export function ImportWorkbench() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [competitorPool, setCompetitorPool] = useState<CompetitorDraft[]>([]);
  const [selectedReviewSourceId, setSelectedReviewSourceId] =
    useState<string>("target");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const {
    register,
    handleSubmit: handleFormSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<ImportFormValues>({
    defaultValues: {
      projectName: "",
      targetProductName: "",
      targetProductAsin: "",
      targetProductUrl: "",
      targetMarket: "US",
      targetIsLaunched: false,
      reviewSourceRole: "target",
      reviewSourceName: "",
      reviewSourceAsin: "",
      reviewSourceUrl: "",
      reviewSourceMarket: "US",
    },
  });

  const projectName = watch("projectName");
  const targetProductName = watch("targetProductName");
  const targetProductAsin = watch("targetProductAsin");
  const targetProductUrl = watch("targetProductUrl");
  const targetMarket = watch("targetMarket");
  const targetIsLaunched = watch("targetIsLaunched");
  const reviewSourceRole = watch("reviewSourceRole");
  const reviewSourceName = watch("reviewSourceName");
  const reviewSourceAsin = watch("reviewSourceAsin");
  const reviewSourceUrl = watch("reviewSourceUrl");
  const reviewSourceMarket = watch("reviewSourceMarket");

  function handleSourceFileChange(sourceId: string, nextFile: File | null) {
    setSelectedReviewSourceId(sourceId);
    setFile(nextFile);
    setResult(null);
    setSaveMessage(null);
    setSavedProjectId(null);
    setError(null);
  }

  function addCompetitorCard() {
    setCompetitorPool((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        name: "",
        asin: "",
        url: "",
        market: (reviewSourceMarket || targetMarket || "US").trim() || "US",
      },
    ]);
  }

  function updateCompetitorCard(
    id: string,
    updates: Partial<Omit<CompetitorDraft, "id">>,
  ) {
    setCompetitorPool((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  }

  function removeCompetitorCard(id: string) {
    const removedIsSource = selectedReviewSourceId === id;

    setCompetitorPool((previous) => previous.filter((item) => item.id !== id));

    if (removedIsSource) {
      setSelectedReviewSourceId("target");
    }
  }

  useEffect(() => {
    if (!file) {
      return;
    }

    const suggestedName = file.name.replace(/\.[^.]+$/, "").trim();

    if (!projectName) {
      setValue("projectName", suggestedName, { shouldDirty: true });
    }
  }, [file, projectName, setValue]);

  useEffect(() => {
    if (selectedReviewSourceId === "target") {
      setValue("reviewSourceRole", "target", { shouldDirty: true });
      setValue("reviewSourceName", targetProductName, { shouldDirty: true });
      setValue("reviewSourceAsin", targetProductAsin, { shouldDirty: true });
      setValue("reviewSourceUrl", targetProductUrl, { shouldDirty: true });
      setValue("reviewSourceMarket", targetMarket || "US", {
        shouldDirty: true,
      });
      return;
    }

    const selectedCompetitor = competitorPool.find(
      (item) => item.id === selectedReviewSourceId,
    );

    if (!selectedCompetitor) {
      setSelectedReviewSourceId("target");
      return;
    }

    setValue("reviewSourceRole", "competitor", { shouldDirty: true });
    setValue("reviewSourceName", selectedCompetitor.name, {
      shouldDirty: true,
    });
    setValue("reviewSourceAsin", selectedCompetitor.asin, {
      shouldDirty: true,
    });
    setValue("reviewSourceUrl", selectedCompetitor.url, { shouldDirty: true });
    setValue(
      "reviewSourceMarket",
      selectedCompetitor.market || targetMarket || "US",
      {
        shouldDirty: true,
      },
    );
  }, [
    competitorPool,
    setValue,
    selectedReviewSourceId,
    targetMarket,
    targetProductAsin,
    targetProductName,
    targetProductUrl,
  ]);

  async function handlePreview() {
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

    const fieldsToValidate: Array<keyof ImportFormValues> = ["projectName"];

    const isValid = await trigger(fieldsToValidate, { shouldFocus: true });

    if (!isValid) {
      setError("请先补全标红的必填字段。");
      return;
    }

    if (reviewSourceRole === "competitor") {
      if (!reviewSourceName.trim() || !reviewSourceMarket.trim()) {
        setError("请先选择一个竞品作为本次评论来源，并补全竞品名称与市场。");
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    setSaveMessage(null);
    setSavedProjectId(null);

    try {
      const cleanedPresetCompetitors = competitorPool
        .map((item) => ({
          localId: item.id,
          name: item.name.trim(),
          asin: item.asin.trim(),
          url: item.url.trim(),
          market: item.market.trim(),
        }))
        .filter((item) => item.name || item.asin || item.url || item.market);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "import");
      formData.append("projectName", projectName.trim());
      formData.append("targetProductName", targetProductName.trim());
      formData.append("targetProductAsin", targetProductAsin.trim());
      formData.append("targetProductUrl", targetProductUrl.trim());
      formData.append("targetMarket", targetMarket.trim());
      formData.append("targetIsLaunched", String(targetIsLaunched));
      formData.append("selectedReviewSourceId", selectedReviewSourceId);
      formData.append("reviewSourceRole", reviewSourceRole);
      formData.append(
        "reviewSourceName",
        reviewSourceRole === "target"
          ? (targetProductName || reviewSourceName).trim()
          : reviewSourceName.trim(),
      );
      formData.append(
        "reviewSourceAsin",
        reviewSourceRole === "target"
          ? (targetProductAsin || reviewSourceAsin).trim()
          : reviewSourceAsin.trim(),
      );
      formData.append(
        "reviewSourceUrl",
        reviewSourceRole === "target"
          ? (targetProductUrl || reviewSourceUrl).trim()
          : reviewSourceUrl.trim(),
      );
      formData.append(
        "reviewSourceMarket",
        reviewSourceRole === "target"
          ? (targetMarket || reviewSourceMarket).trim()
          : reviewSourceMarket.trim(),
      );
      formData.append(
        "presetCompetitors",
        JSON.stringify(cleanedPresetCompetitors),
      );

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
      <Card className="overflow-hidden rounded-xl border border-[var(--page-border)] bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(255,255,255,0.82))] shadow-[0_20px_70px_rgba(54,40,24,0.08)] lg:col-span-2">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--page-muted)]">
              Import Workbench
            </p>
            <CardTitle className="mt-3">上传信息</CardTitle>
            <CardDescription className="mt-3 max-w-2xl leading-7 text-[var(--page-muted)]">
              把我的商品与竞品的评论证据、来源关系和项目上下文归位。这里先把输入整理干净，后面分析才会可信。
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="rounded-md border-[var(--page-border)] bg-white/75 px-2.5 py-1 font-mono text-[11px] text-[var(--page-muted)]"
          >
            V1 / Preview
          </Badge>
        </CardHeader>

        <CardContent>
          <form
            className="grid gap-5"
            onSubmit={handleFormSubmit(handlePreview)}
          >
            <SectionCard
              description="这是这次商品研究任务的名字。后面你会在项目列表和详情页里用它区分不同商品。"
              title="项目名称"
            >
              <Input
                placeholder="例如: meditation-chair-us-2025-11"
                {...register("projectName", {
                  required: "请填写项目名称。",
                })}
                aria-invalid={Boolean(errors.projectName)}
              />
              <FieldError message={errors.projectName?.message} />
            </SectionCard>

            <ProductSourceGrid
              addCompetitorCard={addCompetitorCard}
              competitorPool={competitorPool}
              file={file}
              onSourceFileChange={handleSourceFileChange}
              register={register}
              removeCompetitorCard={removeCompetitorCard}
              reviewSourceName={reviewSourceName}
              reviewSourceRole={reviewSourceRole}
              selectedReviewSourceId={selectedReviewSourceId}
              targetProductName={targetProductName}
              updateCompetitorCard={updateCompetitorCard}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="rounded-full px-5"
                disabled={isLoading}
                type="submit"
              >
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

      {result ? (
        <Card className="overflow-hidden rounded-xl border border-[var(--page-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,250,242,0.86))] shadow-[0_20px_70px_rgba(54,40,24,0.08)] lg:col-span-2">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-5 space-y-0">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--page-muted)]">
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
                文件类型:{" "}
                <span className="font-medium text-stone-900">
                  {result.fileType}
                </span>
              </span>
              <span>
                评论行数:{" "}
                <span className="font-medium text-stone-900">
                  {result.totalRows}
                </span>
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
              <StatCard
                label="Unique ASINs"
                value={String(result.stats.uniqueAsins)}
              />
              <StatCard
                label="Image Reviews"
                value={String(result.stats.reviewsWithImages)}
              />
              <StatCard
                label="Video Reviews"
                value={String(result.stats.reviewsWithVideos)}
              />
              <StatCard
                label="Date From"
                value={result.stats.dateRange.from ?? "-"}
              />
              <StatCard
                label="Date To"
                value={result.stats.dateRange.to ?? "-"}
              />
              <StatCard
                label="Countries"
                value={String(
                  Object.keys(result.stats.countryDistribution).length,
                )}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <InfoCard
                title="用于分析的关键字段"
                description="这是后续 VOC 提炼、痛点归类和策略生成真正会用到的字段。"
                items={ANALYSIS_FIELDS.map((field) =>
                  result.header.includes(field)
                    ? field
                    : `${field}（未检测到）`,
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

            <details className="rounded-[1.5rem] border border-[var(--page-border)] bg-white/72 px-4 py-4">
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

            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--page-border)] bg-white/86">
              <div className="border-b border-[var(--page-border)] bg-[rgba(154,100,55,0.06)] px-4 py-3">
                <h4 className="text-sm font-semibold text-stone-900">
                  标准化样例评论
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
                  {result.sampleRows.map((row, index) => (
                    <TableRow key={`${row.asin}-${row.reviewTitle}-${index}`}>
                      <TableCell>{row.asin || "-"}</TableCell>
                      <TableCell className="max-w-[26rem]">
                        {row.reviewTitle || "-"}
                      </TableCell>
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

function ProductSourceGrid({
  competitorPool,
  register,
  file,
  selectedReviewSourceId,
  reviewSourceRole,
  reviewSourceName,
  targetProductName,
  onSourceFileChange,
  addCompetitorCard,
  updateCompetitorCard,
  removeCompetitorCard,
}: {
  competitorPool: CompetitorDraft[];
  register: UseFormRegister<ImportFormValues>;
  file: File | null;
  selectedReviewSourceId: string;
  reviewSourceRole: "target" | "competitor";
  reviewSourceName: string;
  targetProductName: string;
  onSourceFileChange: (sourceId: string, nextFile: File | null) => void;
  addCompetitorCard: () => void;
  updateCompetitorCard: (
    id: string,
    updates: Partial<Omit<CompetitorDraft, "id">>,
  ) => void;
  removeCompetitorCard: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ProductSourceCard
        file={file}
        isActiveSource={selectedReviewSourceId === "target"}
        onFileChange={(nextFile) => onSourceFileChange("target", nextFile)}
        reviewSourceLabel={
          reviewSourceRole === "target"
            ? `我的商品（${targetProductName || "未命名"}）`
            : `竞品（${reviewSourceName || "未命名竞品"}）`
        }
        title="我的商品"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FieldBlock label="商品名（可空）">
            <Input
              placeholder="例如: 冥想椅首发款"
              {...register("targetProductName")}
            />
          </FieldBlock>
          <FieldBlock label="市场（可空）">
            <Input placeholder="例如: US" {...register("targetMarket")} />
          </FieldBlock>
          <FieldBlock label="ASIN（可空）">
            <Input
              placeholder="已上架再填"
              {...register("targetProductAsin")}
            />
          </FieldBlock>
          <FieldBlock label="URL（可空）">
            <Input
              placeholder="https://www.amazon.com/..."
              {...register("targetProductUrl")}
            />
          </FieldBlock>
        </div>
      </ProductSourceCard>

      {competitorPool.map((competitor, index) => (
        <ProductSourceCard
          key={competitor.id}
          actions={
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => removeCompetitorCard(competitor.id)}
            >
              删除
            </Button>
          }
          file={file}
          isActiveSource={selectedReviewSourceId === competitor.id}
          onFileChange={(nextFile) =>
            onSourceFileChange(competitor.id, nextFile)
          }
          reviewSourceLabel={
            reviewSourceRole === "competitor" &&
            selectedReviewSourceId === competitor.id
              ? `竞品（${reviewSourceName || `竞品 ${index + 1}`}）`
              : `竞品（${competitor.name || `竞品 ${index + 1}`}）`
          }
          title={`竞品 ${index + 1}`}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock label="商品名（建议填写）">
              <Input
                placeholder="例如: 某竞品冥想椅"
                value={competitor.name}
                onChange={(event) =>
                  updateCompetitorCard(competitor.id, {
                    name: event.target.value,
                  })
                }
              />
            </FieldBlock>
            <FieldBlock label="市场（建议填写）">
              <Input
                placeholder="例如: US"
                value={competitor.market}
                onChange={(event) =>
                  updateCompetitorCard(competitor.id, {
                    market: event.target.value,
                  })
                }
              />
            </FieldBlock>
            <FieldBlock label="ASIN（可空）">
              <Input
                placeholder="如果文件本身有，也可以不填"
                value={competitor.asin}
                onChange={(event) =>
                  updateCompetitorCard(competitor.id, {
                    asin: event.target.value,
                  })
                }
              />
            </FieldBlock>
            <FieldBlock label="URL（可空）">
              <Input
                placeholder="https://www.amazon.com/..."
                value={competitor.url}
                onChange={(event) =>
                  updateCompetitorCard(competitor.id, {
                    url: event.target.value,
                  })
                }
              />
            </FieldBlock>
          </div>
        </ProductSourceCard>
      ))}

      <button
        type="button"
        onClick={addCompetitorCard}
        className="grid min-h-[20rem] place-items-center rounded-2xl border border-dashed border-[var(--page-border)] bg-[rgba(255,249,240,0.65)] text-center transition hover:border-stone-400 hover:bg-[rgba(255,249,240,0.92)]"
      >
        <div className="grid gap-2 px-4 py-6">
          <p className="text-3xl font-light leading-none text-stone-500">+</p>
          <p className="text-sm font-semibold text-stone-900">新建竞品</p>
        </div>
      </button>
    </div>
  );
}

function ProductSourceCard({
  title,
  reviewSourceLabel,
  isActiveSource,
  onFileChange,
  file,
  actions,
  children,
}: {
  title: string;
  reviewSourceLabel: string;
  isActiveSource: boolean;
  onFileChange: (nextFile: File | null) => void;
  file: File | null;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 rounded-2xl border bg-white/88 p-4",
        isActiveSource ? "border-stone-900" : "border-[var(--page-border)]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        {actions}
      </div>

      {children}

      <div className="grid gap-3 rounded-xl border border-dashed border-[var(--page-border)] bg-[rgba(255,249,240,0.78)] p-4">
        <div className="grid gap-1">
          <p className="text-sm font-medium text-stone-900">
            上传当前来源商品评论文件
          </p>
          <p className="text-xs leading-6 text-[var(--page-muted)]">
            该文件会绑定到当前卡片商品。支持 Excel `.xlsx` 和 `.csv`。
          </p>
        </div>
        <Input
          accept={ACCEPTED_FILE_TYPES}
          className="cursor-pointer border-[var(--page-border)] bg-white/90 file:mr-4 file:rounded-md file:bg-[rgba(154,100,55,0.08)] file:px-3 file:py-1.5 hover:file:bg-[rgba(154,100,55,0.14)]"
          type="file"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        {isActiveSource ? (
          <p className="text-xs text-[var(--page-muted)]">
            当前评论来源:{" "}
            <span className="font-medium text-stone-900">
              {reviewSourceLabel}
            </span>
            {file ? (
              <>
                {" "}
                | 文件:{" "}
                <span className="font-medium text-stone-900">{file.name}</span>
              </>
            ) : null}
          </p>
        ) : (
          <p className="text-xs text-[var(--page-muted)]">
            点击选择文件后会切换到此商品来源。
          </p>
        )}
      </div>
    </div>
  );
}

function FieldBlock({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <p className={cn("text-sm font-medium", error ? "text-rose-700" : "text-stone-900")}>
        {label}
        {required ? <span className="ml-1 text-rose-700">*</span> : null}
      </p>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs leading-5 text-rose-700">{message}</p>;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 rounded-lg border border-[var(--page-border)] bg-white/78 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
      <div className="grid gap-1">
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        <p className="text-xs leading-6 text-[var(--page-muted)]">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-[1.5rem] border border-[var(--page-border)] bg-white/76 shadow-none">
      <CardContent className="px-4 !py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-muted)]">
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
    <Card className="rounded-[1.5rem] border border-[var(--page-border)] bg-white/76 shadow-none">
      <CardContent className="!p-4">
        <h4 className="text-sm font-semibold text-stone-900">{title}</h4>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-[var(--page-muted)]">
            {description}
          </p>
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
