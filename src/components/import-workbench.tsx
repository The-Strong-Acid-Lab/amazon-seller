"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";

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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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

export function ImportWorkbench() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
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
      reviewSourceRole: "competitor",
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

  useEffect(() => {
    if (!file) {
      return;
    }

    const suggestedName = file.name.replace(/\.[^.]+$/, "").trim();

    if (!projectName) {
      setValue("projectName", suggestedName, { shouldDirty: true });
    }

    if (!reviewSourceName) {
      setValue("reviewSourceName", suggestedName, { shouldDirty: true });
    }
  }, [file, projectName, reviewSourceName, setValue]);

  useEffect(() => {
    if (reviewSourceRole !== "target") {
      return;
    }

    setValue("reviewSourceName", targetProductName);
    setValue("reviewSourceAsin", targetProductAsin);
    setValue("reviewSourceUrl", targetProductUrl);
    setValue("reviewSourceMarket", targetMarket);
  }, [
    reviewSourceRole,
    setValue,
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

    const fieldsToValidate: Array<keyof ImportFormValues> = [
      "projectName",
      "targetProductName",
      "targetMarket",
    ];

    if (reviewSourceRole === "competitor") {
      fieldsToValidate.push("reviewSourceName", "reviewSourceMarket");
    }

    const isValid = await trigger(fieldsToValidate, { shouldFocus: true });

    if (!isValid) {
      setError("请先补全标红的必填字段。");
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
      formData.append("targetProductName", targetProductName.trim());
      formData.append("targetProductAsin", targetProductAsin.trim());
      formData.append("targetProductUrl", targetProductUrl.trim());
      formData.append("targetMarket", targetMarket.trim());
      formData.append("targetIsLaunched", String(targetIsLaunched));
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
          <form className="grid gap-5" onSubmit={handleFormSubmit(handlePreview)}>
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

            <SectionCard
              description="一个项目只服务一个目标商品。它可以已经上线，也可以还在筹划中。"
              title="目标商品"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock
                  error={errors.targetProductName?.message}
                  label="目标商品名称"
                  required
                >
                  <Input
                    placeholder="例如: 冥想椅首发款"
                    {...register("targetProductName", {
                      required: "请填写目标商品名称。",
                    })}
                    aria-invalid={Boolean(errors.targetProductName)}
                  />
                </FieldBlock>
                <FieldBlock
                  error={errors.targetMarket?.message}
                  label="目标市场"
                  required
                >
                  <Input
                    placeholder="例如: US"
                    {...register("targetMarket", {
                      required: "请填写目标市场。",
                    })}
                    aria-invalid={Boolean(errors.targetMarket)}
                  />
                </FieldBlock>
                <FieldBlock label="目标商品 ASIN（可空）">
                  <Input
                    placeholder="已上架再填"
                    {...register("targetProductAsin")}
                  />
                </FieldBlock>
                <FieldBlock label="目标商品 URL（可空）">
                  <Input
                    placeholder="https://www.amazon.com/..."
                    {...register("targetProductUrl")}
                  />
                </FieldBlock>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="rounded-full"
                  type="button"
                  variant={targetIsLaunched ? "secondary" : "default"}
                  onClick={() =>
                    setValue("targetIsLaunched", false, { shouldDirty: true })
                  }
                >
                  还未上线
                </Button>
                <Button
                  className="rounded-full"
                  type="button"
                  variant={targetIsLaunched ? "default" : "outline"}
                  onClick={() =>
                    setValue("targetIsLaunched", true, { shouldDirty: true })
                  }
                >
                  已上线
                </Button>
              </div>
            </SectionCard>

            <SectionCard
              description="这次上传的评论可以属于目标商品，也可以属于某个竞品。只有这里需要区分来源角色。"
              title="评论来源"
            >
              <Tabs value={reviewSourceRole}>
                <TabsList className="w-fit">
                  <TabsTrigger
                    active={reviewSourceRole === "target"}
                    value="target"
                    onClick={() => {
                      setValue("reviewSourceRole", "target", { shouldDirty: true });
                      setValue(
                        "reviewSourceName",
                        targetProductName || reviewSourceName,
                        { shouldDirty: true },
                      );
                      setValue(
                        "reviewSourceAsin",
                        targetProductAsin || reviewSourceAsin,
                        { shouldDirty: true },
                      );
                      setValue(
                        "reviewSourceUrl",
                        targetProductUrl || reviewSourceUrl,
                        { shouldDirty: true },
                      );
                      setValue(
                        "reviewSourceMarket",
                        targetMarket || reviewSourceMarket,
                        { shouldDirty: true },
                      );
                    }}
                  >
                    自己的商品
                  </TabsTrigger>
                  <TabsTrigger
                    active={reviewSourceRole === "competitor"}
                    value="competitor"
                    onClick={() =>
                      setValue("reviewSourceRole", "competitor", {
                        shouldDirty: true,
                      })
                    }
                  >
                    竞品
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="target">
                  <div className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                    <p className="text-sm leading-6 text-stone-600">
                      这份评论会直接挂到目标商品下，不再单独填写一套来源商品字段。
                      保存时会直接使用下面这些目标商品信息。
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ReadOnlyField
                        label="评论来源商品名称"
                        value={targetProductName || "将使用上方目标商品名称"}
                      />
                      <ReadOnlyField
                        label="评论来源市场"
                        value={targetMarket || "将使用上方目标市场"}
                      />
                      <ReadOnlyField
                        label="评论来源 ASIN"
                        value={targetProductAsin || "未填写也可以保存"}
                      />
                      <ReadOnlyField
                        label="评论来源 URL"
                        value={targetProductUrl || "未填写也可以保存"}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="competitor">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldBlock
                      error={errors.reviewSourceName?.message}
                      label="竞品名称"
                      required
                    >
                      <Input
                        placeholder="例如: 某竞品冥想椅"
                        {...register("reviewSourceName", {
                          validate: (value) => {
                            if (watch("reviewSourceRole") === "competitor" && !value.trim()) {
                              return "请填写竞品名称。";
                            }
                            return true;
                          },
                        })}
                        aria-invalid={Boolean(errors.reviewSourceName)}
                      />
                    </FieldBlock>
                    <FieldBlock
                      error={errors.reviewSourceMarket?.message}
                      label="竞品市场"
                      required
                    >
                      <Input
                        placeholder="例如: US"
                        {...register("reviewSourceMarket", {
                          validate: (value) => {
                            if (watch("reviewSourceRole") === "competitor" && !value.trim()) {
                              return "请填写竞品市场。";
                            }
                            return true;
                          },
                        })}
                        aria-invalid={Boolean(errors.reviewSourceMarket)}
                      />
                    </FieldBlock>
                    <FieldBlock label="竞品 ASIN（可空）">
                      <Input
                        placeholder="如果文件本身有，也可以不填"
                        {...register("reviewSourceAsin")}
                      />
                    </FieldBlock>
                    <FieldBlock label="竞品 URL（可空）">
                      <Input
                        placeholder="https://www.amazon.com/..."
                        {...register("reviewSourceUrl")}
                      />
                    </FieldBlock>
                  </div>
                </TabsContent>
              </Tabs>
            </SectionCard>

            <SectionCard
              description="评论文件本身只是证据载体。先解析预览，确认字段和样例没问题，再保存入库。"
              title="评论文件"
            >
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
            </SectionCard>

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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-stone-900">{label}</p>
      <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-600">
        {value}
      </div>
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
    <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-5">
      <div className="grid gap-1">
        <p className="text-sm font-medium text-stone-900">{title}</p>
        <p className="text-xs leading-5 text-stone-500">{description}</p>
      </div>
      {children}
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
