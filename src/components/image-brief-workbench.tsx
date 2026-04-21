"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/image-strategy-workbench/delete-confirm-dialog";
import { ReferenceImageSection } from "@/components/image-strategy-workbench/reference-image-section";
import { StrategySlotCard } from "@/components/image-strategy-workbench/strategy-slot-card";
import type {
  ActionResponse,
  DeleteTarget,
  ImageAsset,
  ImageGenerationRun,
  ImageModelOption,
  PromptRebuildRun,
  ProductOption,
  ProductReferenceImage,
  SlotDraftFields,
} from "@/components/image-strategy-workbench/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  buildEditableImagePrompt,
  buildImageStrategySlots,
  mergePersistedImageStrategySlots,
  type ImageBriefInput,
  type ImageStrategyInput,
  type ImageStrategySlotPlan,
  type PersistedImageStrategySlot,
} from "@/lib/image-strategy";

const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  {
    id: "openai:gpt-image-1.5",
    label: "GPT Image 1.5",
    provider: "openai",
    model: "gpt-image-1.5",
  },
  {
    id: "gemini:gemini-2.5-flash-image",
    label: "Nano Banana 2",
    provider: "gemini",
    model: "gemini-2.5-flash-image",
  },
];

export function ImageBriefWorkbench({
  projectId,
  brief,
  strategy,
  assets,
  generationRuns,
  promptRebuildRuns,
  savedSlots,
  defaultImageProvider,
  defaultImageModel,
  targetProduct,
  competitorProducts,
  referenceImages,
}: {
  projectId: string;
  brief: ImageBriefInput[];
  strategy: ImageStrategyInput | undefined;
  assets: ImageAsset[];
  generationRuns: ImageGenerationRun[];
  promptRebuildRuns: PromptRebuildRun[];
  savedSlots: PersistedImageStrategySlot[];
  defaultImageProvider: "openai" | "gemini";
  defaultImageModel: string;
  targetProduct: ProductOption | null;
  competitorProducts: ProductOption[];
  referenceImages: ProductReferenceImage[];
}) {
  const router = useRouter();
  const [generatingSlot, setGeneratingSlot] = useState<string | null>(null);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const [uploadingFileCount, setUploadingFileCount] = useState(0);
  const [updatingReferenceId, setUpdatingReferenceId] = useState<string | null>(null);
  const [deletingReferenceId, setDeletingReferenceId] = useState<string | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [slotDrafts, setSlotDrafts] = useState<Record<string, SlotDraftFields>>({});
  const [promptOverrides, setPromptOverrides] = useState<Record<string, string>>({});
  const [promptDeltas, setPromptDeltas] = useState<Record<string, string>>({});
  const [slotReferenceBindings, setSlotReferenceBindings] = useState<Record<string, string | null>>({});
  const [selectedModelBySlot, setSelectedModelBySlot] = useState<Record<string, string>>({});
  const [runStateBySlot, setRunStateBySlot] = useState<Record<string, ImageGenerationRun>>({});
  const [promptRunStateBySlot, setPromptRunStateBySlot] = useState<Record<string, PromptRebuildRun>>({});
  const [rebuildingPromptSlotId, setRebuildingPromptSlotId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const defaultImageModelOptionId = `${defaultImageProvider}:${defaultImageModel}`;

  const baseStrategySlots = useMemo(() => {
    return buildImageStrategySlots({ brief, strategy });
  }, [brief, strategy]);

  const strategySlots = useMemo(() => {
    const slots = baseStrategySlots;
    return mergePersistedImageStrategySlots({
      slots,
      persistedSlots: savedSlots,
    });
  }, [baseStrategySlots, savedSlots]);

  useEffect(() => {
    setSlotDrafts((current) => {
      const next = { ...current };

      for (const slot of strategySlots) {
        if (typeof next[slot.id] === "undefined") {
          next[slot.id] = {
            purpose: slot.purpose,
            conversionGoal: slot.conversionGoal,
            recommendedOverlayCopy: slot.recommendedOverlayCopy,
          };
        }
      }

      return next;
    });
  }, [strategySlots]);

  useEffect(() => {
    setSelectedModelBySlot((current) => {
      const next = { ...current };

      for (const slot of strategySlots) {
        if (!next[slot.id]) {
          next[slot.id] = defaultImageModelOptionId;
        }
      }

      return next;
    });
  }, [defaultImageModelOptionId, strategySlots]);

  useEffect(() => {
    setSlotReferenceBindings((current) => {
      const next = { ...current };

      for (const slot of strategySlots) {
        if (typeof next[slot.id] === "undefined") {
          next[slot.id] = slot.referenceImageId ?? null;
        }
      }

      return next;
    });
  }, [strategySlots]);

  useEffect(() => {
    const nextRuns = generationRuns.reduce<Record<string, ImageGenerationRun>>((accumulator, run) => {
      if (!accumulator[run.slot]) {
        accumulator[run.slot] = run;
      }

      return accumulator;
    }, {});

    setRunStateBySlot(nextRuns);
  }, [generationRuns]);

  useEffect(() => {
    const nextRuns = promptRebuildRuns.reduce<Record<string, PromptRebuildRun>>(
      (accumulator, run) => {
        if (!accumulator[run.slot]) {
          accumulator[run.slot] = run;
        }

        return accumulator;
      },
      {},
    );

    setPromptRunStateBySlot(nextRuns);
  }, [promptRebuildRuns]);

  const assetsBySlot = useMemo(() => {
    const mapping = new Map<string, ImageAsset[]>();

    for (const asset of assets) {
      const current = mapping.get(asset.slot) ?? [];
      current.push(asset);
      mapping.set(asset.slot, current);
    }

    for (const [slot, slotAssets] of mapping.entries()) {
      mapping.set(
        slot,
        slotAssets.sort((left, right) => right.version - left.version),
      );
    }

    return mapping;
  }, [assets]);

  const referenceImagesByProduct = useMemo(() => {
    const mapping = new Map<string, ProductReferenceImage[]>();

    for (const image of referenceImages) {
      const current = mapping.get(image.project_product_id) ?? [];
      current.push(image);
      mapping.set(image.project_product_id, current);
    }

    for (const [productId, productImages] of mapping.entries()) {
      mapping.set(
        productId,
        productImages.sort((left, right) => {
          if (left.pinned_for_main !== right.pinned_for_main) {
            return left.pinned_for_main ? -1 : 1;
          }

          return right.created_at.localeCompare(left.created_at);
        }),
      );
    }

    return mapping;
  }, [referenceImages]);

  const targetReferenceCount = useMemo(() => {
    if (!targetProduct) {
      return 0;
    }

    return (referenceImagesByProduct.get(targetProduct.id) ?? []).length;
  }, [referenceImagesByProduct, targetProduct]);

  const competitorReferenceCount = useMemo(
    () =>
      competitorProducts.reduce((count, competitor) => {
        return count + (referenceImagesByProduct.get(competitor.id) ?? []).length;
      }, 0),
    [competitorProducts, referenceImagesByProduct],
  );

  const generationMode = useMemo(() => {
    if (targetReferenceCount > 0) {
      return "precise";
    }

    if (competitorReferenceCount > 0) {
      return "concept";
    }

    return "disabled";
  }, [competitorReferenceCount, targetReferenceCount]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`image-generation-runs:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "image_generation_runs",
          filter: `project_id=eq.${projectId}`,
        },
        (payload: { new: unknown }) => {
          const run = payload.new as ImageGenerationRun | undefined;

          if (!run?.slot) {
            return;
          }

          setRunStateBySlot((current) => ({
            ...current,
            [run.slot]: run,
          }));

          if (run.status === "completed" || run.status === "failed") {
            router.refresh();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`prompt-rebuild-runs:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "prompt_rebuild_runs",
          filter: `project_id=eq.${projectId}`,
        },
        (payload: { new: unknown }) => {
          const run = payload.new as PromptRebuildRun | undefined;

          if (!run?.slot) {
            return;
          }

          setPromptRunStateBySlot((current) => ({
            ...current,
            [run.slot]: run,
          }));

          if (run.status === "completed" && run.result_prompt) {
            setPromptOverrides((current) => ({
              ...current,
              [run.slot]: run.result_prompt || current[run.slot] || "",
            }));

            const slot = strategySlots.find((item) => item.id === run.slot);
            const suffix =
              typeof run.match_score === "number"
                ? `（槽位匹配度 ${run.match_score}/100）`
                : "";
            setMessage(
              `${slot?.title ?? "该槽位"} 的 Prompt 已重建${suffix}${
                run.canonical_prompt_en ? "，已生成执行基准。" : ""
              }。`,
            );
            setRebuildingPromptSlotId((current) =>
              current === run.slot ? null : current,
            );
          }

          if (run.status === "failed") {
            setError(run.error_message || "重建提示词失败。");
            setRebuildingPromptSlotId((current) =>
              current === run.slot ? null : current,
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, strategySlots]);

  function getSlotDraft(slotId: string, slot: ImageStrategySlotPlan) {
    return (
      slotDrafts[slotId] ?? {
        purpose: slot.purpose,
        conversionGoal: slot.conversionGoal,
        recommendedOverlayCopy: slot.recommendedOverlayCopy,
      }
    );
  }

  function buildSuggestedPrompt(slot: ImageStrategySlotPlan) {
    const draft = getSlotDraft(slot.id, slot);

    return buildEditableImagePrompt({
      ...slot,
      purpose: draft.purpose,
      conversionGoal: draft.conversionGoal,
      recommendedOverlayCopy: draft.recommendedOverlayCopy,
    });
  }

  function isSlotFieldsDirty(slot: ImageStrategySlotPlan) {
    const draft = getSlotDraft(slot.id, slot);

    return (
      draft.purpose !== slot.purpose ||
      draft.conversionGoal !== slot.conversionGoal ||
      draft.recommendedOverlayCopy !== slot.recommendedOverlayCopy
    );
  }

  function getPromptOverrideForGeneration(slot: ImageStrategySlotPlan) {
    const currentPrompt = getPromptValue(slot);
    const suggestedPrompt = buildSuggestedPrompt(slot);

    if (!currentPrompt || currentPrompt === suggestedPrompt) {
      return undefined;
    }

    return currentPrompt;
  }

  function getPromptValue(slot: ImageStrategySlotPlan) {
    const override = promptOverrides[slot.id];

    if (typeof override === "string") {
      return override;
    }

    if (isSlotFieldsDirty(slot)) {
      return buildSuggestedPrompt(slot);
    }

    return slot.defaultPrompt;
  }

  function getPromptDelta(slotId: string) {
    return promptDeltas[slotId] ?? "";
  }

  function resolveSlotAssets(slotId: string, sourceBriefSlot: string | null) {
    const exactAssets = assetsBySlot.get(slotId) ?? [];

    if (exactAssets.length > 0) {
      return exactAssets;
    }

    const legacyTokens = [
      slotId,
      sourceBriefSlot ?? "",
      slotId === "main_image" ? "hero" : "",
      slotId === "core_value" ? "image 2" : "",
      slotId === "primary_lifestyle" ? "image 3" : "",
      slotId === "secondary_lifestyle" ? "image 4" : "",
      slotId === "feature_proof" ? "image 5" : "",
      slotId === "material_detail" ? "image 6" : "",
    ]
      .map((token) => token.toLowerCase().trim())
      .filter(Boolean);

    return assets
      .filter((asset) => {
        const normalizedSlot = asset.slot.toLowerCase();
        return legacyTokens.some((token) => normalizedSlot.includes(token));
      })
      .sort((left, right) => right.version - left.version);
  }

  function buildSlotPayload(slotId: string) {
    const slot = strategySlots.find((item) => item.id === slotId);

    if (!slot) {
      return null;
    }

    const draft = getSlotDraft(slot.id, slot);

    const fallbackReferenceImageId =
      targetProduct
        ? (referenceImagesByProduct.get(targetProduct.id) ?? [])[slot.order - 1]?.id ?? null
        : null;

    return {
      slotKey: slot.id,
      order: slot.order,
      section: slot.section,
      title: slot.title,
      purpose: draft.purpose,
      conversionGoal: draft.conversionGoal,
      recommendedOverlayCopy: draft.recommendedOverlayCopy,
      evidence: slot.evidence,
      visualDirection: slot.visualDirection,
      complianceNotes: slot.complianceNotes,
      promptText: getPromptValue(slot),
      sourceBriefSlot: slot.sourceBriefSlot,
      referenceImageId: slotReferenceBindings[slot.id] ?? fallbackReferenceImageId,
    };
  }

  async function saveSlots(slotIds: string[], options?: { silent?: boolean }) {
    const payloadSlots = slotIds
      .map((slotId) => buildSlotPayload(slotId))
      .filter((item): item is NonNullable<ReturnType<typeof buildSlotPayload>> => Boolean(item));

    if (payloadSlots.length === 0) {
      return false;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/image-strategy-slots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slots: payloadSlots,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as ActionResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "保存图片策略失败。");
      }

      if (!options?.silent) {
        setMessage(
          payloadSlots.length === 1 ? "当前槽位策略已保存。" : "全部图片策略已保存。",
        );
        router.refresh();
      }

      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存图片策略失败。");
      return false;
    }
  }

  async function handleReferenceUpload(
    projectProductId: string,
    filesOrUrl: FileList | File[] | string | null,
  ) {
    const imageUrl = typeof filesOrUrl === "string" ? filesOrUrl.trim() : "";
    const nextFiles =
      !imageUrl && filesOrUrl ? Array.from(filesOrUrl as FileList | File[]) : [];

    if (!imageUrl && nextFiles.length === 0) {
      return;
    }

    setUploadingProductId(projectProductId);
    setUploadingFileCount(imageUrl ? 1 : nextFiles.length);
    setError(null);
    setMessage(null);

    try {
      let deduplicatedCount = 0;

      if (imageUrl) {
        const response = await fetch(`/api/projects/${projectId}/reference-images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectProductId,
            imageUrl,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as ActionResponse & {
          deduplicated?: boolean;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "URL 导入失败。");
        }

        if (payload.deduplicated) {
          deduplicatedCount += 1;
        }
      } else {
        for (const file of nextFiles) {
          const formData = new FormData();
          formData.append("projectProductId", projectProductId);
          formData.append("file", file);

          const response = await fetch(`/api/projects/${projectId}/reference-images`, {
            method: "POST",
            body: formData,
          });

          const payload = (await response.json().catch(() => ({}))) as ActionResponse & {
            deduplicated?: boolean;
          };

          if (!response.ok) {
            throw new Error(payload.error ?? `上传失败：${file.name}`);
          }

          if (payload.deduplicated) {
            deduplicatedCount += 1;
          }
        }
      }

      setMessage(
        imageUrl
          ? deduplicatedCount > 0
            ? "这张图片 URL 已存在，已按重复素材处理。"
            : "已通过 URL 导入 1 张素材图片。"
          : deduplicatedCount > 0
            ? `已处理 ${nextFiles.length} 张图片，其中 ${deduplicatedCount} 张检测为重复素材。`
            : `已上传 ${nextFiles.length} 张素材图片。`,
      );
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "上传或导入素材图片失败。",
      );
    } finally {
      setUploadingProductId(null);
      setUploadingFileCount(0);
    }
  }

  async function handleDeleteReference(image: ProductReferenceImage) {
    setDeletingReferenceId(image.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/reference-images/${image.id}`,
        { method: "DELETE" },
      );
      const payload = (await response.json().catch(() => ({}))) as ActionResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "删除素材失败。");
      }

      setMessage("素材图片已删除。");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除素材失败。");
    } finally {
      setDeletingReferenceId(null);
    }
  }

  async function handleUpdateReferenceMetadata(
    image: ProductReferenceImage,
    updates: {
      referenceKind?: ProductReferenceImage["reference_kind"];
      pinnedForMain?: boolean;
    },
  ) {
    const hasReferenceKindUpdate =
      typeof updates.referenceKind === "string" &&
      updates.referenceKind !== image.reference_kind;
    const hasPinnedUpdate =
      typeof updates.pinnedForMain === "boolean" &&
      updates.pinnedForMain !== image.pinned_for_main;

    if (!hasReferenceKindUpdate && !hasPinnedUpdate) {
      return;
    }

    setUpdatingReferenceId(image.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/reference-images/${image.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as ActionResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "更新参考图标签失败。");
      }

      setMessage("参考图标记已更新。");
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "更新参考图标签失败。",
      );
    } finally {
      setUpdatingReferenceId(null);
    }
  }

  async function handleDeleteAsset(asset: ImageAsset) {
    setDeletingAssetId(asset.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/image-assets/${asset.id}`,
        { method: "DELETE" },
      );
      const payload = (await response.json().catch(() => ({}))) as ActionResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "删除方案图失败。");
      }

      setMessage("已删除方案图。");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除方案图失败。");
    } finally {
      setDeletingAssetId(null);
    }
  }

  async function handleGenerate(slotId: string, options?: { force?: boolean }) {
    const slot = strategySlots.find((item) => item.id === slotId);

    if (!slot) {
      return;
    }

    const draft = getSlotDraft(slot.id, slot);
    const selectedModelId = selectedModelBySlot[slot.id] ?? defaultImageModelOptionId;
    const selectedModel =
      IMAGE_MODEL_OPTIONS.find((option) => option.id === selectedModelId) ??
      IMAGE_MODEL_OPTIONS[0];
    const promptDelta = getPromptDelta(slot.id).trim();

    if (generationMode === "disabled") {
      setError("请至少上传 1 张我的商品图或竞品参考图，再生成方案图。");
      return;
    }

    setGeneratingSlot(slot.id);
    setError(null);
    setMessage(null);

    try {
      const saved = await saveSlots([slot.id], { silent: true });

      if (!saved) {
        return;
      }

      const response = await fetch(`/api/projects/${projectId}/image-assets/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slot: slot.id,
          goal: draft.purpose,
          message: draft.conversionGoal,
          supportingProof: slot.evidence,
          recommendedOverlayCopy: draft.recommendedOverlayCopy,
          visualDirection: slot.visualDirection,
          complianceNotes: slot.complianceNotes,
          promptOverride: getPromptOverrideForGeneration(slot),
          promptDelta: promptDelta || undefined,
          imageProvider: selectedModel.provider,
          imageModel: selectedModel.model,
          force: Boolean(options?.force),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ActionResponse & {
        runId?: string;
        runStatus?: ImageGenerationRun["status"];
        runStage?: ImageGenerationRun["stage"];
        runProgress?: number;
        deduplicated?: boolean;
      };

      if (payload.runId && payload.runStatus) {
        setRunStateBySlot((current) => ({
          ...current,
          [slot.id]: {
            ...(current[slot.id] ?? {
              project_id: projectId,
              slot: slot.id,
              model_name: null,
              error_message: null,
              started_at: null,
              completed_at: null,
              image_asset_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
            id: payload.runId,
            status: payload.runStatus,
            stage: payload.runStage ?? "queued",
            progress: payload.runProgress ?? 0,
            model_name: selectedModel.model,
          } as ImageGenerationRun,
        }));
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "生成失败。");
      }

      setMessage(
        payload.deduplicated
          ? `${slot.title} 已有后台生成任务在进行中。`
          : options?.force
            ? `${slot.title} 已解除卡住任务并重新加入后台生成队列。`
            : `${slot.title} 已加入后台生成队列。`,
      );
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "生成失败。");
    } finally {
      setGeneratingSlot(null);
    }
  }

  async function handleRebuildPrompt(slot: ImageStrategySlotPlan) {
    const draft = getSlotDraft(slot.id, slot);
    const currentPrompt = getPromptValue(slot);
    const slotReferenceImageUrl =
      targetProduct
        ? (referenceImagesByProduct.get(targetProduct.id) ?? [])[slot.order - 1]?.image_url ?? ""
        : "";

    setRebuildingPromptSlotId(slot.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/image-strategy-slots/rebuild-prompt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slotKey: slot.id,
            slotTitle: slot.title,
            purpose: draft.purpose,
            conversionGoal: draft.conversionGoal,
            recommendedOverlayCopy: draft.recommendedOverlayCopy,
            evidence: slot.evidence,
            visualDirection: slot.visualDirection,
            complianceNotes: slot.complianceNotes,
            currentPrompt,
            referenceImageUrl: slotReferenceImageUrl,
            language: "zh-CN",
          }),
        },
      );

      const payload = (await response.json().catch(() => ({}))) as ActionResponse & {
        runId?: string;
        runStatus?: PromptRebuildRun["status"];
        runStage?: PromptRebuildRun["stage"];
        runProgress?: number;
        deduplicated?: boolean;
      };

      if (payload.runId && payload.runStatus) {
        setPromptRunStateBySlot((current) => ({
          ...current,
          [slot.id]: {
            ...(current[slot.id] ?? {
              project_id: projectId,
              slot: slot.id,
              error_message: null,
              result_prompt: null,
              canonical_prompt_en: null,
              mismatch_notes: null,
              match_score: null,
              started_at: null,
              completed_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
            id: payload.runId,
            status: payload.runStatus,
            stage: payload.runStage ?? "queued",
            progress: payload.runProgress ?? 0,
          } as PromptRebuildRun,
        }));
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "重建提示词失败。");
      }

      setMessage(
        payload.deduplicated
          ? `${slot.title} 已有后台 Prompt 重建任务在进行中。`
          : `${slot.title} 已加入后台 Prompt 重建队列。`,
      );
    } catch (rebuildError) {
      setError(rebuildError instanceof Error ? rebuildError.message : "重建提示词失败。");
      setRebuildingPromptSlotId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    if (deleteTarget.kind === "reference") {
      await handleDeleteReference(deleteTarget.item);
    } else {
      await handleDeleteAsset(deleteTarget.item);
    }

    setDeleteTarget(null);
  }

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>图片策略</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-4 rounded-2xl border border-stone-200 p-4">
          {targetProduct ? (
            <ReferenceImageSection
              deletingReferenceId={deletingReferenceId}
              description="上传后系统会自动判断哪些图更适合主图、结构锁定或忽略；你只需要在明显不对时调整。"
              emptyMessage="还没有上传我的商品素材图。没有我的图时，系统仍可用竞品图先生成概念方向。"
              images={referenceImagesByProduct.get(targetProduct.id) ?? []}
              isUploading={uploadingProductId === targetProduct.id}
              key={targetProduct.id}
              updatingReferenceId={updatingReferenceId}
              onRequestDelete={(image) =>
                setDeleteTarget({
                  kind: "reference",
                  id: image.id,
                  title: "删除这张参考图？",
                  description:
                    "删除后，这张图片会从 Supabase Storage 和当前项目的参考素材里一起移除。",
                  confirmLabel: "确认删除",
                  item: image,
                })
              }
              onUpdateMetadata={handleUpdateReferenceMetadata}
              onUpload={(files) =>
                handleReferenceUpload(targetProduct.id, files)
              }
              showMainImagePin
              title={`我的商品素材库：${targetProduct.name ?? "未命名我的商品"}`}
              uploadingFileCount={uploadingFileCount}
              uploadLabel="支持 PNG、JPG/JPEG、WEBP，也支持直接导入图片 URL"
            />
          ) : (
            <p className="text-sm text-rose-700">
              当前项目没有“我的商品”，无法上传必需素材。
            </p>
          )}

          {competitorProducts.length > 0 ? (
            <div className="grid gap-3 rounded-lg border border-stone-200 p-3">
              <p className="text-xs font-medium text-stone-700">
                竞品图片库（可选，但建议上传用于构图/信息层级/画面套路对比）
              </p>
              <div className="grid gap-3">
                {competitorProducts.map((competitor) => (
                  <ReferenceImageSection
                    deletingReferenceId={deletingReferenceId}
                    description="同一竞品可上传多张，系统会自动把它们当作构图和表达灵感，而不是你的商品真值。"
                    emptyMessage="该竞品还未上传参考图。"
                    images={referenceImagesByProduct.get(competitor.id) ?? []}
                    isUploading={uploadingProductId === competitor.id}
                    key={competitor.id}
                    updatingReferenceId={updatingReferenceId}
                    onRequestDelete={(image) =>
                      setDeleteTarget({
                        kind: "reference",
                        id: image.id,
                        title: "删除这张参考图？",
                        description:
                          "删除后，这张图片会从 Supabase Storage 和当前项目的参考素材里一起移除。",
                        confirmLabel: "确认删除",
                        item: image,
                      })
                    }
                    onUpdateMetadata={handleUpdateReferenceMetadata}
                    onUpload={(files) =>
                      handleReferenceUpload(competitor.id, files)
                    }
                    title={`竞品：${competitor.name ?? "未命名竞品"}`}
                    uploadingFileCount={uploadingFileCount}
                    uploadLabel="支持 PNG、JPG/JPEG、WEBP，也支持直接导入图片 URL"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <Alert>
          <AlertTitle>
            {generationMode === "precise"
              ? "当前为精确模式"
              : generationMode === "concept"
                ? "当前为概念模式"
                : "当前还不能生成"}
          </AlertTitle>
          <AlertDescription>
            {generationMode === "precise"
              ? "检测到我的商品参考图。系统会优先锁定商品身份、结构和材质，再生成方案图。"
              : generationMode === "concept"
                ? "当前没有我的商品参考图，将只把竞品图当作构图和表达灵感，输出概念方向，不承诺商品精准还原。"
                : "请至少上传 1 张我的商品图或竞品参考图。没有任何参考图时，系统不会发起生成。"}
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          {strategySlots.map((slot) => (
            <StrategySlotCard
              canGenerate={generationMode !== "disabled"}
              deletingAssetId={deletingAssetId}
              draft={getSlotDraft(slot.id, slot)}
              isGenerating={
                generatingSlot === slot.id ||
                runStateBySlot[slot.id]?.status === "queued" ||
                runStateBySlot[slot.id]?.status === "running"
              }
              isRebuildingPrompt={
                rebuildingPromptSlotId === slot.id ||
                promptRunStateBySlot[slot.id]?.status === "queued" ||
                promptRunStateBySlot[slot.id]?.status === "running"
              }
              key={slot.id}
              modelOptions={IMAGE_MODEL_OPTIONS}
              onDeleteAsset={(asset) =>
                setDeleteTarget({
                  kind: "asset",
                  id: asset.id,
                  title: "删除这个方案图？",
                  description:
                    "删除后，这张生成图片会从 Supabase Storage 和当前槽位的方案图历史里一起移除。",
                  confirmLabel: "确认删除",
                  item: asset,
                })
              }
              onGenerate={() => handleGenerate(slot.id)}
              onPromptDeltaChange={(value) =>
                setPromptDeltas((current) => ({
                  ...current,
                  [slot.id]: value,
                }))
              }
              onModelChange={(value) =>
                setSelectedModelBySlot((current) => ({
                  ...current,
                  [slot.id]: value,
                }))
              }
              onPromptChange={(value) =>
                setPromptOverrides((current) => {
                  const suggestedPrompt = buildSuggestedPrompt(slot);

                  if (value === suggestedPrompt) {
                    const next = { ...current };
                    delete next[slot.id];
                    return next;
                  }

                  return {
                    ...current,
                    [slot.id]: value,
                  };
                })
              }
              onResetPrompt={() =>
                setPromptOverrides((current) => ({
                  ...current,
                  [slot.id]: buildSuggestedPrompt(slot),
                }))
              }
              onRebuildPrompt={() => handleRebuildPrompt(slot)}
              promptValue={getPromptValue(slot)}
              promptRebuildRun={promptRunStateBySlot[slot.id] ?? null}
              promptDeltaValue={getPromptDelta(slot.id)}
              selectedModelId={selectedModelBySlot[slot.id] ?? defaultImageModelOptionId}
              slotReferenceImage={(() => {
                if (!targetProduct) {
                  return null;
                }

                const targetImages = referenceImagesByProduct.get(targetProduct.id) ?? [];
                const boundReferenceId = slotReferenceBindings[slot.id] ?? slot.referenceImageId ?? null;

                if (boundReferenceId) {
                  const boundImage = targetImages.find((image) => image.id === boundReferenceId);
                  if (boundImage) {
                    return boundImage;
                  }
                }

                return targetImages[slot.order - 1] ?? null;
              })()}
              slot={slot}
              generationRun={runStateBySlot[slot.id] ?? null}
              slotAssets={resolveSlotAssets(slot.id, slot.sourceBriefSlot)}
            />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-900">策略补充输入</p>
            <div className="mt-3 grid gap-2 text-sm text-stone-700">
              <p>
                <span className="font-medium text-stone-900">Hero:</span>{" "}
                {strategy?.hero_image || "-"}
              </p>
              <p>
                <span className="font-medium text-stone-900">Feature:</span>{" "}
                {(strategy?.feature_callouts ?? []).join("；") || "-"}
              </p>
              <p>
                <span className="font-medium text-stone-900">Objection:</span>{" "}
                {(strategy?.objection_handling_images ?? []).join("；") || "-"}
              </p>
              <p>
                <span className="font-medium text-stone-900">Lifestyle:</span>{" "}
                {(strategy?.lifestyle_scenes ?? []).join("；") || "-"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-900">当前起步规则</p>
            <div className="mt-3 grid gap-2 text-sm text-stone-700">
              <p>
                1. 所有图片策略都围绕固定 8 槽位，而不是零散 Image 2 / Image 3。
              </p>
              <p>2. 提示词先可见、可改，再调用生成模型。</p>
              <p>3. 主图和副图使用不同的合规约束。</p>
              <p>4. 后续会再把文案叠加、尺寸线和 icon 渲染从生图流程里拆开。</p>
            </div>
          </div>
        </div>

        {message ? (
          <Alert>
            <AlertTitle>已完成</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>操作失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <DeleteConfirmDialog
          deletingAssetId={deletingAssetId}
          deletingReferenceId={deletingReferenceId}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          target={deleteTarget}
        />
      </CardContent>
    </Card>
  );
}
