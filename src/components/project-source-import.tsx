"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ImportPreview } from "@/lib/review-import";
import { cn } from "@/lib/utils";

const ACCEPTED_FILE_TYPES = ".xlsx,.csv";

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

type SourceImportFormValues = {
  reviewSourceRole: "target" | "competitor";
  reviewSourceName: string;
  reviewSourceAsin: string;
  reviewSourceUrl: string;
  reviewSourceMarket: string;
};

export function ProjectSourceImport({
  projectId,
  targetProductId,
  targetProductName,
  targetMarket,
  targetProductAsin,
  targetProductUrl,
}: {
  projectId: string;
  targetProductId: string;
  targetProductName: string;
  targetMarket: string;
  targetProductAsin?: string | null;
  targetProductUrl?: string | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const {
    register,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<SourceImportFormValues>({
    defaultValues: {
      reviewSourceRole: "competitor",
      reviewSourceName: "",
      reviewSourceAsin: "",
      reviewSourceUrl: "",
      reviewSourceMarket: targetMarket || "US",
    },
  });

  const reviewSourceRole = watch("reviewSourceRole");
  const reviewSourceName = watch("reviewSourceName");
  const reviewSourceAsin = watch("reviewSourceAsin");
  const reviewSourceUrl = watch("reviewSourceUrl");
  const reviewSourceMarket = watch("reviewSourceMarket");

  useEffect(() => {
    if (!file || reviewSourceRole !== "competitor" || reviewSourceName) {
      return;
    }

    setValue("reviewSourceName", file.name.replace(/\.[^.]+$/, "").trim(), {
      shouldDirty: true,
    });
  }, [file, reviewSourceName, reviewSourceRole, setValue]);

  async function handlePreview() {
    if (!file) {
      setError("请先选择要追加的评论文件。");
      return;
    }

    setIsPreviewLoading(true);
    setError(null);
    setSaveMessage(null);

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

      setPreview(payload);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "文件解析失败。");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleSave() {
    if (!file) {
      setError("请先选择要追加的评论文件。");
      return;
    }

    if (reviewSourceRole === "competitor") {
      const isValid = await trigger(["reviewSourceName", "reviewSourceMarket"], {
        shouldFocus: true,
      });

      if (!isValid) {
        setError("请先补全标红的竞品字段。");
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "import");
      formData.append("existingProjectId", projectId);
      formData.append("targetProductId", targetProductId);
      formData.append("reviewSourceRole", reviewSourceRole);
      formData.append(
        "reviewSourceName",
        reviewSourceRole === "target" ? targetProductName : reviewSourceName.trim(),
      );
      formData.append(
        "reviewSourceAsin",
        reviewSourceRole === "target"
          ? (targetProductAsin ?? "").trim()
          : reviewSourceAsin.trim(),
      );
      formData.append(
        "reviewSourceUrl",
        reviewSourceRole === "target"
          ? (targetProductUrl ?? "").trim()
          : reviewSourceUrl.trim(),
      );
      formData.append(
        "reviewSourceMarket",
        reviewSourceRole === "target" ? targetMarket.trim() : reviewSourceMarket.trim(),
      );

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ImportResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "追加评论失败。");
      }

      setPreview(payload);
      setSaveMessage(`已追加 ${payload.persisted?.importedReviews ?? 0} 条评论。`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "追加评论失败。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>追加评论来源</CardTitle>
        <CardDescription>
          在当前项目里继续挂目标商品评论或新的竞品评论，不再新建 project。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <Tabs value={reviewSourceRole}>
          <TabsList className="w-fit">
            <TabsTrigger
              active={reviewSourceRole === "target"}
              value="target"
              onClick={() => setValue("reviewSourceRole", "target", { shouldDirty: true })}
            >
              目标商品评论
            </TabsTrigger>
            <TabsTrigger
              active={reviewSourceRole === "competitor"}
              value="competitor"
              onClick={() => setValue("reviewSourceRole", "competitor", { shouldDirty: true })}
            >
              竞品评论
            </TabsTrigger>
          </TabsList>

          <TabsContent value="target">
            <div className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-2">
              <ReadOnlyField label="来源商品名称" value={targetProductName} />
              <ReadOnlyField label="来源市场" value={targetMarket} />
              <ReadOnlyField label="来源 ASIN" value={targetProductAsin || "未填写"} />
              <ReadOnlyField label="来源 URL" value={targetProductUrl || "未填写"} />
            </div>
          </TabsContent>

          <TabsContent value="competitor">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldBlock error={errors.reviewSourceName?.message} label="竞品名称" required>
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
              <FieldBlock error={errors.reviewSourceMarket?.message} label="竞品市场" required>
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
                <Input placeholder="如果文件本身有，也可以不填" {...register("reviewSourceAsin")} />
              </FieldBlock>
              <FieldBlock label="竞品 URL（可空）">
                <Input placeholder="https://www.amazon.com/..." {...register("reviewSourceUrl")} />
              </FieldBlock>
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid gap-3 rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-5">
          <div className="grid gap-1">
            <p className="text-sm font-medium text-stone-900">评论文件</p>
            <p className="text-sm leading-6 text-stone-600">
              先解析预览，再保存到当前项目。追加完成后项目页会自动刷新。
            </p>
          </div>
          <Input
            accept={ACCEPTED_FILE_TYPES}
            className="cursor-pointer border-stone-200 bg-white file:mr-4 file:rounded-md file:bg-stone-100 file:px-3 file:py-1.5 hover:file:bg-stone-200"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button className="rounded-full px-5" disabled={isPreviewLoading} onClick={handlePreview}>
            {isPreviewLoading ? "正在解析..." : "解析预览"}
          </Button>
          <Button
            className="rounded-full px-5"
            disabled={!preview || !file || isSaving}
            variant="outline"
            onClick={handleSave}
          >
            {isSaving ? "正在写入..." : "追加到当前项目"}
          </Button>
          {file ? <p className="text-sm text-stone-600">{file.name}</p> : null}
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>追加失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {saveMessage ? (
          <Alert>
            <AlertTitle>追加成功</AlertTitle>
            <AlertDescription>{saveMessage}</AlertDescription>
          </Alert>
        ) : null}

        {preview ? (
          <div className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-4">
            <PreviewStat label="评论数" value={String(preview.totalRows)} />
            <PreviewStat label="ASIN 数" value={String(preview.stats.uniqueAsins)} />
            <PreviewStat label="起始日期" value={preview.stats.dateRange.from ?? "-"} />
            <PreviewStat label="结束日期" value={preview.stats.dateRange.to ?? "-"} />
          </div>
        ) : null}
      </CardContent>
    </Card>
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
      {error ? <p className="text-xs leading-5 text-rose-700">{error}</p> : null}
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

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-3 text-lg font-semibold text-stone-900">{value}</p>
    </div>
  );
}
