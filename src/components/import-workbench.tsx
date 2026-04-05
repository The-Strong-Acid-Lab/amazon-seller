"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ImportPreviewPanel } from "@/components/import-workbench/preview-panel";
import { ProductSourceGrid } from "@/components/import-workbench/product-source-grid";
import { FieldError, SectionCard } from "@/components/import-workbench/ui-blocks";
import type {
  CompetitorDraft,
  ImportFormValues,
  ImportPreviewResponse,
  PreviewSourceSnapshot,
  SourcePreviewEntry,
  UploadResponse,
} from "@/components/import-workbench/types";

function toFileStem(fileName?: string | null) {
  if (!fileName) {
    return "";
  }

  return fileName.replace(/\.[^.]+$/, "").trim();
}

function deriveSourceName({
  role,
  asin,
  url,
  fileName,
}: {
  role: "target" | "competitor";
  asin?: string | null;
  url?: string | null;
  fileName?: string | null;
}) {
  const normalizedAsin = asin?.trim();

  if (normalizedAsin) {
    return `ASIN ${normalizedAsin}`;
  }

  const normalizedUrl = url?.trim();

  if (normalizedUrl) {
    return normalizedUrl;
  }

  const stem = toFileStem(fileName);

  if (stem) {
    return stem;
  }

  return role === "target" ? "我的商品" : "未命名竞品";
}

export function ImportWorkbench() {
  const router = useRouter();
  const [sourceFiles, setSourceFiles] = useState<Record<string, File | null>>(
    {},
  );
  const [previewCache, setPreviewCache] = useState<
    Record<string, SourcePreviewEntry>
  >({});
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
      targetProductAsin: "",
      targetProductUrl: "",
      targetMarket: "US",
      targetIsLaunched: false,
    },
  });

  const projectName = watch("projectName");
  const targetProductAsin = watch("targetProductAsin");
  const targetProductUrl = watch("targetProductUrl");
  const targetMarket = watch("targetMarket");
  const targetIsLaunched = watch("targetIsLaunched");
  const activeFile = sourceFiles[selectedReviewSourceId] ?? null;
  const sourceFileEntries = Object.entries(sourceFiles).filter(
    (entry): entry is [string, File] => Boolean(entry[1]),
  );
  const parsedSourceEntries = Object.entries(previewCache);

  function resolveSourceSnapshotById(sourceId: string): PreviewSourceSnapshot {
    if (sourceId === "target") {
      return {
        sourceId: "target",
        role: "target",
        name: deriveSourceName({
          role: "target",
          asin: targetProductAsin,
          url: targetProductUrl,
          fileName: sourceFiles.target?.name,
        }),
        market: (targetMarket || "US").trim() || "US",
      };
    }

    const selectedCompetitor = competitorPool.find(
      (item) => item.id === sourceId,
    );

    if (!selectedCompetitor) {
      return {
        sourceId: "target",
        role: "target",
        name: deriveSourceName({
          role: "target",
          asin: targetProductAsin,
          url: targetProductUrl,
          fileName: sourceFiles.target?.name,
        }),
        market: (targetMarket || "US").trim() || "US",
      };
    }

    return {
      sourceId: selectedCompetitor.id,
      role: "competitor",
      name: deriveSourceName({
        role: "competitor",
        asin: selectedCompetitor.asin,
        url: selectedCompetitor.url,
        fileName: sourceFiles[selectedCompetitor.id]?.name,
      }),
      market:
        (selectedCompetitor.market || targetMarket || "US").trim() || "US",
    };
  }

  function handleSourceFileChange(sourceId: string, nextFile: File | null) {
    setSelectedReviewSourceId(sourceId);
    setSourceFiles((previous) => ({ ...previous, [sourceId]: nextFile }));
    setPreviewCache((previous) => {
      const nextCache = { ...previous };
      delete nextCache[sourceId];
      return nextCache;
    });
    setSaveMessage(null);
    setSavedProjectId(null);
    setError(null);
  }

  function addCompetitorCard() {
    setCompetitorPool((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        asin: "",
        url: "",
        market: (targetMarket || "US").trim() || "US",
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
    setSourceFiles((previous) => {
      const nextFiles = { ...previous };
      delete nextFiles[id];
      return nextFiles;
    });
    setPreviewCache((previous) => {
      const nextCache = { ...previous };
      delete nextCache[id];
      return nextCache;
    });

    if (removedIsSource) {
      setSelectedReviewSourceId("target");
    }
  }

  useEffect(() => {
    if (!activeFile) {
      return;
    }

    const suggestedName = activeFile.name.replace(/\.[^.]+$/, "").trim();

    if (!projectName) {
      setValue("projectName", suggestedName, { shouldDirty: true });
    }
  }, [activeFile, projectName, setValue]);

  useEffect(() => {
    if (
      selectedReviewSourceId !== "target" &&
      !competitorPool.some((item) => item.id === selectedReviewSourceId)
    ) {
      setSelectedReviewSourceId("target");
    }
  }, [competitorPool, selectedReviewSourceId]);

  async function handlePreview() {
    if (sourceFileEntries.length === 0) {
      setError("先在至少一个商品卡片上传 Excel 或 CSV 文件。");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSaveMessage(null);

    try {
      const nextCache: Record<string, SourcePreviewEntry> = {};

      await Promise.all(
        sourceFileEntries.map(async ([sourceId, sourceFile]) => {
          const sourceSnapshot = resolveSourceSnapshotById(sourceId);
          const formData = new FormData();
          formData.append("file", sourceFile);
          formData.append("mode", "preview");

          const response = await fetch("/api/import", {
            method: "POST",
            body: formData,
          });

          const payload = (await response.json()) as ImportPreviewResponse;

          if (!response.ok) {
            throw new Error(
              `${sourceSnapshot.name}: ${payload.error ?? "文件解析失败。"}`,
            );
          }

          nextCache[sourceId] = {
            preview: payload,
            snapshot: sourceSnapshot,
          };
        }),
      );

      const activeSourceId = nextCache[selectedReviewSourceId]
        ? selectedReviewSourceId
        : sourceFileEntries[0][0];

      setPreviewCache(nextCache);
      setSelectedReviewSourceId(activeSourceId);
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
    if (sourceFileEntries.length === 0) {
      setError("请先上传至少一个来源文件。");
      return;
    }

    const fieldsToValidate: Array<keyof ImportFormValues> = ["projectName"];

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
      const cleanedPresetCompetitors = competitorPool
        .map((item) => ({
          localId: item.id,
          name: deriveSourceName({
            role: "competitor",
            asin: item.asin,
            url: item.url,
            fileName: sourceFiles[item.id]?.name,
          }),
          asin: item.asin.trim(),
          url: item.url.trim(),
          market: item.market.trim(),
        }))
        .filter(
          (item) =>
            item.asin ||
            item.url ||
            Boolean(sourceFiles[item.localId]),
        );
      const orderedSourceEntries = [...sourceFileEntries].sort(([leftId], [rightId]) => {
        if (leftId === "target") return -1;
        if (rightId === "target") return 1;
        return 0;
      });
      const sourceProductIdByRef = new Map<string, string>();
      let existingProjectId = "";
      let targetProductId = "";
      let dedupedCount = 0;
      let uploadedCount = 0;

      for (const [sourceId, sourceFile] of orderedSourceEntries) {
        const sourceMeta =
          sourceId === "target"
            ? {
                role: "target" as const,
                name: deriveSourceName({
                  role: "target",
                  asin: targetProductAsin,
                  url: targetProductUrl,
                  fileName: sourceFile.name,
                }),
                asin: targetProductAsin.trim(),
                url: targetProductUrl.trim(),
                market: (targetMarket || "US").trim() || "US",
              }
            : (() => {
                const competitor = competitorPool.find((item) => item.id === sourceId);

                if (!competitor) {
                  throw new Error("检测到无效竞品来源，请刷新后重试。");
                }

                return {
                  role: "competitor" as const,
                  name: deriveSourceName({
                    role: "competitor",
                    asin: competitor.asin,
                    url: competitor.url,
                    fileName: sourceFile.name,
                  }),
                  asin: competitor.asin.trim(),
                  url: competitor.url.trim(),
                  market: (competitor.market || targetMarket || "US").trim() || "US",
                };
              })();

        const formData = new FormData();
        formData.append("file", sourceFile);
        formData.append("mode", "upload");
        formData.append("reviewSourceRole", sourceMeta.role);
        formData.append("reviewSourceName", sourceMeta.name);
        formData.append("reviewSourceAsin", sourceMeta.asin);
        formData.append("reviewSourceUrl", sourceMeta.url);
        formData.append("reviewSourceMarket", sourceMeta.market);

        if (existingProjectId) {
          formData.append("existingProjectId", existingProjectId);
          if (targetProductId) {
            formData.append("targetProductId", targetProductId);
          }
          const mappedSourceProductId = sourceProductIdByRef.get(sourceId);
          if (mappedSourceProductId) {
            formData.append("reviewSourceProductId", mappedSourceProductId);
          }
        } else {
          formData.append("projectName", projectName.trim());
          formData.append(
            "targetProductName",
            deriveSourceName({
              role: "target",
              asin: targetProductAsin,
              url: targetProductUrl,
              fileName: sourceFiles.target?.name,
            }),
          );
          formData.append("targetProductAsin", targetProductAsin.trim());
          formData.append("targetProductUrl", targetProductUrl.trim());
          formData.append("targetMarket", targetMarket.trim());
          formData.append("targetIsLaunched", String(targetIsLaunched));
          formData.append("selectedReviewSourceId", sourceId);
          formData.append(
            "presetCompetitors",
            JSON.stringify(cleanedPresetCompetitors),
          );
        }

        const response = await fetch("/api/import", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as UploadResponse;

        if (!response.ok || !payload.persisted) {
          throw new Error(payload.error ?? `${sourceMeta.name}: 上传到 Supabase 失败。`);
        }

        existingProjectId = payload.persisted.projectId;
        targetProductId = payload.persisted.targetProductId;
        sourceProductIdByRef.set("target", payload.persisted.targetProductId);
        sourceProductIdByRef.set(sourceId, payload.persisted.reviewSourceProductId);

        if (payload.persisted.deduplicated) {
          dedupedCount += 1;
        }
        uploadedCount += 1;
      }

      setSavedProjectId(existingProjectId || null);
      setSaveMessage(
        dedupedCount > 0
          ? `已处理 ${uploadedCount} 个来源，其中 ${dedupedCount} 个命中去重并复用记录。`
          : `已上传 ${uploadedCount} 个来源文件已上传，后续可按需解析。`,
      );
      if (existingProjectId) {
        router.push(`/projects/${existingProjectId}`);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "上传到 Supabase 失败。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="overflow-hidden rounded-xl border border-[var(--page-border)] bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(255,255,255,0.82))] shadow-[0_20px_70px_rgba(54,40,24,0.08)] lg:col-span-2">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="mt-3">上传信息</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <form
            className="grid gap-5"
            onSubmit={handleFormSubmit(handlePreview)}
          >
            <SectionCard title="项目名称">
              <Input
                placeholder="例如: meditation-chair"
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
              sourceFiles={sourceFiles}
              onSourceFileChange={handleSourceFileChange}
              register={register}
              removeCompetitorCard={removeCompetitorCard}
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
            </div>

            {error ? (
              <Alert className="rounded-2xl" variant="destructive">
                <AlertTitle>导入失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {saveMessage ? (
              <Alert className="rounded-2xl">
                <AlertTitle>上传成功</AlertTitle>
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

      <ImportPreviewPanel
        canStartAnalysis={sourceFileEntries.length > 0 && !isLoading}
        isSaving={isSaving}
        onStartAnalysis={handleSaveToSupabase}
        parsedSourceEntries={parsedSourceEntries}
        sourceFileCount={sourceFileEntries.length}
      />
    </div>
  );
}
