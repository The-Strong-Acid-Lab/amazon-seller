"use client";

import { useState } from "react";
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
  reviewSourceAsin: string;
  reviewSourceUrl: string;
  reviewSourceMarket: string;
};

export function ProjectSourceImport({
  projectId,
  targetProductId,
  targetMarket,
}: {
  projectId: string;
  targetProductId: string;
  targetMarket: string;
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
    trigger,
    watch,
    formState: { errors },
  } = useForm<SourceImportFormValues>({
    defaultValues: {
      reviewSourceAsin: "",
      reviewSourceUrl: "",
      reviewSourceMarket: targetMarket || "US",
    },
  });

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

    const isValid = await trigger(["reviewSourceMarket"], {
      shouldFocus: true,
    });

    if (!isValid) {
      setError("请先补全标红的竞品字段。");
      return;
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
      formData.append("reviewSourceRole", "competitor");
      const reviewSourceAsin = watch("reviewSourceAsin").trim();
      const reviewSourceUrl = watch("reviewSourceUrl").trim();
      const reviewSourceMarket = watch("reviewSourceMarket").trim();
      const reviewSourceName =
        reviewSourceAsin ||
        reviewSourceUrl ||
        file.name.replace(/\.[^.]+$/, "").trim() ||
        "未命名竞品";
      formData.append("reviewSourceName", reviewSourceName);
      formData.append("reviewSourceAsin", reviewSourceAsin);
      formData.append("reviewSourceUrl", reviewSourceUrl);
      formData.append("reviewSourceMarket", reviewSourceMarket);

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
        <CardTitle>追加竞品</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldBlock label="竞品 ASIN（可空）">
            <Input
              placeholder="如果文件本身有，也可以不填"
              {...register("reviewSourceAsin")}
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
                required: "请填写竞品市场。",
                validate: (value) =>
                  value.trim().length > 0 || "请填写竞品市场。",
              })}
              aria-invalid={Boolean(errors.reviewSourceMarket)}
            />
          </FieldBlock>
          <FieldBlock className="md:col-span-2" label="竞品 URL（可空）">
            <Input
              placeholder="https://www.amazon.com/..."
              {...register("reviewSourceUrl")}
            />
          </FieldBlock>
        </div>

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
          <Button
            className="px-5"
            disabled={isPreviewLoading}
            onClick={handlePreview}
          >
            {isPreviewLoading ? "正在解析..." : "解析预览"}
          </Button>
          <Button
            className="px-5"
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
            <PreviewStat
              label="ASIN 数"
              value={String(preview.stats.uniqueAsins)}
            />
            <PreviewStat
              label="起始日期"
              value={preview.stats.dateRange.from ?? "-"}
            />
            <PreviewStat
              label="结束日期"
              value={preview.stats.dateRange.to ?? "-"}
            />
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
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <p className={cn("text-sm font-medium", error ? "text-rose-700" : "text-stone-900")}>
        {label}
        {required ? <span className="ml-1 text-rose-700">*</span> : null}
      </p>
      {children}
      {error ? <p className="text-xs leading-5 text-rose-700">{error}</p> : null}
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
