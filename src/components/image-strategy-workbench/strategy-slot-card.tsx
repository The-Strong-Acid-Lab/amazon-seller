"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageConceptCard } from "@/components/image-strategy-workbench/image-concept-card";
import type {
  ImageAsset,
  ImageGenerationRun,
  ImageModelOption,
  SlotDraftFields,
} from "@/components/image-strategy-workbench/types";
import type { ImageStrategySlotPlan } from "@/lib/image-strategy";

export function StrategySlotCard({
  slot,
  draft,
  slotAssets,
  isExpanded,
  isSaving,
  isGenerating,
  canGenerate,
  generationRun,
  promptValue,
  expandedAssetId,
  keepingAssetId,
  deletingAssetId,
  modelOptions,
  selectedModelId,
  onToggleExpand,
  onSave,
  onGenerate,
  onResetPrompt,
  onModelChange,
  onDraftChange,
  onPromptChange,
  onToggleAssetPrompt,
  onKeepAsset,
  onDeleteAsset,
}: {
  slot: ImageStrategySlotPlan;
  draft: SlotDraftFields;
  slotAssets: ImageAsset[];
  isExpanded: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  generationRun: ImageGenerationRun | null;
  promptValue: string;
  expandedAssetId: string | null;
  keepingAssetId: string | null;
  deletingAssetId: string | null;
  modelOptions: ImageModelOption[];
  selectedModelId: string;
  onToggleExpand: () => void;
  onSave: () => void | Promise<void>;
  onGenerate: () => void | Promise<void>;
  onResetPrompt: () => void;
  onModelChange: (value: string) => void;
  onDraftChange: (field: keyof SlotDraftFields, value: string) => void;
  onPromptChange: (value: string) => void;
  onToggleAssetPrompt: (assetId: string) => void;
  onKeepAsset: (asset: ImageAsset) => void | Promise<void>;
  onDeleteAsset: (asset: ImageAsset) => void;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className="rounded-full"
              variant={slot.section === "main" ? "default" : "outline"}
            >
              {slot.audienceLabel}
            </Badge>
            {generationRun ? (
              <Badge className="rounded-full" variant="secondary">
                {generationRun.status === "queued"
                  ? "排队中"
                  : generationRun.status === "running"
                    ? `生成中 ${generationRun.progress}%`
                    : generationRun.status === "completed"
                      ? "最近已完成"
                      : "最近失败"}
              </Badge>
            ) : null}
            {slot.sourceBriefSlot ? (
              <Badge className="rounded-full" variant="secondary">
                来自分析槽位：{slot.sourceBriefSlot}
              </Badge>
            ) : null}
          </div>
          <p className="mt-3 text-lg font-semibold text-stone-950">
            {slot.title}
          </p>
          <p className="mt-1 text-sm text-stone-600">{draft.purpose}</p>
          {generationRun?.error_message ? (
            <p className="mt-2 text-xs leading-5 text-rose-700">
              {generationRun.error_message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select onValueChange={onModelChange} value={selectedModelId}>
            <SelectTrigger className="h-9 min-w-[10.5rem] rounded-md border-stone-300 bg-white px-3 text-sm text-stone-900 focus-visible:border-stone-400 focus-visible:ring-0">
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent align="end">
              {modelOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={onToggleExpand}
            size="sm"
            variant="outline"
          >
            {isExpanded ? "收起策略" : "查看策略"}
          </Button>
          <Button
            disabled={isSaving}
            onClick={() => void onSave()}
            size="sm"
            variant="outline"
          >
            {isSaving ? "保存中..." : "保存槽位"}
          </Button>
          <Button
            disabled={isGenerating || !canGenerate}
            onClick={() => void onGenerate()}
            size="sm"
          >
            {isGenerating
              ? "生成中..."
              : slotAssets.length > 0
                ? "再生成一版"
                : "生成方案图"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            转化目标
          </p>
          <p className="mt-2 text-sm text-stone-900">{draft.conversionGoal}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            证据依据
          </p>
          <p className="mt-2 text-sm text-stone-900">{slot.evidence}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            建议图上文案
          </p>
          <p className="mt-2 text-sm text-stone-900">
            {draft.recommendedOverlayCopy}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            合规限制
          </p>
          <p className="mt-2 text-sm text-stone-900">{slot.complianceNotes}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 md:col-span-2 xl:col-span-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              后台任务进度
            </p>
            <p className="text-sm text-stone-700">
              {generationRun
                ? `${generationRun.stage} · ${generationRun.progress}%`
                : "当前没有任务"}
            </p>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-stone-900 transition-all"
              style={{ width: `${generationRun?.progress ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-stone-900">
                槽位编辑与提示词
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={onResetPrompt}
                  size="sm"
                  variant="outline"
                >
                  恢复建议提示词
                </Button>
                <Button
                  disabled={isSaving}
                  onClick={() => void onSave()}
                  size="sm"
                  variant="secondary"
                >
                  {isSaving ? "保存中..." : "保存当前策略"}
                </Button>
              </div>
            </div>
            <p className="text-sm text-stone-600">
              先改槽位内容，再决定要不要同步到建议提示词。这里改的是当前槽位的业务定义，不只是文案表面。提示词支持中文输入，后台会自动整理成英文执行版。你手动补充的提示词会作为“附加要求”叠加在系统策略后面，不会整段覆盖基础约束。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                图片任务
              </label>
              <Textarea
                className="min-h-[120px] bg-white text-sm leading-6"
                onChange={(event) =>
                  onDraftChange("purpose", event.target.value)
                }
                value={draft.purpose}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                转化目标
              </label>
              <Textarea
                className="min-h-[120px] bg-white text-sm leading-6"
                onChange={(event) =>
                  onDraftChange("conversionGoal", event.target.value)
                }
                value={draft.conversionGoal}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              建议图上文案
            </label>
            <Input
              className="bg-white"
              onChange={(event) =>
                onDraftChange("recommendedOverlayCopy", event.target.value)
              }
              value={draft.recommendedOverlayCopy}
            />
          </div>
          <Textarea
            className="min-h-[360px] bg-white font-mono text-xs leading-6"
            onChange={(event) => onPromptChange(event.target.value)}
            value={promptValue}
          />
          <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              视觉方向
            </p>
            <p className="mt-2 text-sm text-stone-700">
              {slot.visualDirection}
            </p>
          </div>
        </div>
      ) : null}

      {slotAssets.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {slotAssets.map((asset) => (
            <ImageConceptCard
              asset={asset}
              deletingAssetId={deletingAssetId}
              expandedAssetId={expandedAssetId}
              keepingAssetId={keepingAssetId}
              key={asset.id}
              onDelete={onDeleteAsset}
              onKeep={onKeepAsset}
              onTogglePrompt={onToggleAssetPrompt}
              slotTitle={slot.title}
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-stone-500">
          该槽位还没有生成方案图。先检查策略和提示词，再决定是否生成。
        </p>
      )}
    </div>
  );
}
