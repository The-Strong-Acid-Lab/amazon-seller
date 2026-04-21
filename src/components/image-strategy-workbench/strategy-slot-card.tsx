"use client";

import { useState } from "react";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type {
  ImageAsset,
  ImageGenerationRun,
  ImageModelOption,
  PromptRebuildRun,
  ProductReferenceImage,
  SlotDraftFields,
} from "@/components/image-strategy-workbench/types";
import { formatDateTime } from "@/components/image-strategy-workbench/types";
import type { ImageStrategySlotPlan } from "@/lib/image-strategy";

export function StrategySlotCard({
  slot,
  draft,
  slotAssets,
  isGenerating,
  isRebuildingPrompt,
  canGenerate,
  generationRun,
  promptRebuildRun,
  promptValue,
  deletingAssetId,
  modelOptions,
  selectedModelId,
  onGenerate,
  onPromptDeltaChange,
  onResetPrompt,
  onRebuildPrompt,
  onModelChange,
  onPromptChange,
  onDeleteAsset,
  promptDeltaValue,
  slotReferenceImage,
}: {
  slot: ImageStrategySlotPlan;
  draft: SlotDraftFields;
  slotAssets: ImageAsset[];
  isGenerating: boolean;
  isRebuildingPrompt: boolean;
  canGenerate: boolean;
  generationRun: ImageGenerationRun | null;
  promptRebuildRun: PromptRebuildRun | null;
  promptValue: string;
  deletingAssetId: string | null;
  modelOptions: ImageModelOption[];
  selectedModelId: string;
  onGenerate: () => void | Promise<void>;
  onPromptDeltaChange: (value: string) => void;
  onResetPrompt: () => void;
  onRebuildPrompt: () => void | Promise<void>;
  onModelChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onDeleteAsset: (asset: ImageAsset) => void;
  promptDeltaValue: string;
  slotReferenceImage: ProductReferenceImage | null;
}) {
  const hasConsistencyWarning =
    generationRun?.error_message?.startsWith("商品一致性提醒");
  const latestAsset = slotAssets[0] ?? null;
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const selectedAsset = selectedAssetId
    ? (slotAssets.find((asset) => asset.id === selectedAssetId) ?? null)
    : null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                slot.section === "main"
                  ? "bg-stone-900 text-white"
                  : "border border-stone-300 text-stone-700"
              }`}
            >
              {slot.audienceLabel}
            </span>
            {generationRun ? (
              <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                {generationRun.status === "queued"
                  ? "排队中"
                  : generationRun.status === "running"
                    ? `生成中 ${generationRun.progress}%`
                    : generationRun.status === "completed"
                      ? "最近已完成"
                      : "最近失败"}
              </span>
            ) : null}
            {slot.sourceBriefSlot ? (
              <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                来自分析槽位：{slot.sourceBriefSlot}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-lg font-semibold text-stone-950">
            {slot.title}
          </p>
          <p className="mt-1 text-sm text-stone-600">{draft.purpose}</p>
          {generationRun?.error_message ? (
            <p
              className={
                hasConsistencyWarning
                  ? "mt-2 text-xs leading-5 text-amber-800"
                  : "mt-2 text-xs leading-5 text-rose-700"
              }
            >
              {generationRun.error_message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="flex flex-wrap items-start gap-2">
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
            <div className="w-[11rem]">
              <Button
                className="w-full"
                disabled={isGenerating || !canGenerate}
                onClick={() => void onGenerate()}
                size="lg"
              >
                {isGenerating
                  ? "生成中..."
                  : slotAssets.length > 0
                    ? "再生成一版"
                    : "生成方案图"}
              </Button>
            </div>
          </div>

          {generationRun ? (
            <div className="grid w-full gap-1">
              <div className="flex items-center justify-between gap-2 text-[11px] text-stone-500">
                <span>{generationRun.stage}</span>
                <span>{generationRun.progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-stone-900 transition-all"
                  style={{ width: `${generationRun.progress}%` }}
                />
              </div>
            </div>
          ) : null}

        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="flex min-h-[520px] flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-stone-900">生成Prompt</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onResetPrompt} size="sm" variant="outline">
                恢复建议提示词
              </Button>
              <Button
                disabled={isRebuildingPrompt}
                onClick={() => void onRebuildPrompt()}
                size="sm"
                variant="outline"
              >
                {isRebuildingPrompt ? "重建中..." : "重建该图Prompt"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-stone-600">
            这里只保留最终生图指令，避免和分析过程信息重复。
          </p>
          {promptRebuildRun ? (
            <div className="grid w-full gap-1">
              <div className="flex items-center justify-between gap-2 text-[11px] text-stone-500">
                <span>
                  {promptRebuildRun.status === "queued"
                    ? "queued"
                    : promptRebuildRun.status === "running"
                      ? promptRebuildRun.stage
                      : promptRebuildRun.status}
                </span>
                <span>{promptRebuildRun.progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-stone-900 transition-all"
                  style={{ width: `${promptRebuildRun.progress}%` }}
                />
              </div>
              {promptRebuildRun.error_message ? (
                <p className="text-xs text-rose-700">
                  {promptRebuildRun.error_message}
                </p>
              ) : null}
            </div>
          ) : null}
          <Textarea
            className="h-full min-h-0 flex-1 resize-none overflow-y-auto bg-white font-mono text-xs leading-6"
            onChange={(event) => onPromptChange(event.target.value)}
            value={promptValue}
          />
          <div className="grid gap-1">
            <p className="text-xs font-medium text-stone-600">
              本次修改（可选）
            </p>
            <Textarea
              className="min-h-[84px] resize-y bg-white text-xs leading-5"
              onChange={(event) => onPromptDeltaChange(event.target.value)}
              value={promptDeltaValue}
            />
          </div>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <div className="flex h-[520px] flex-col rounded-2xl border border-stone-200 bg-white p-3">
            <div className="flex h-11 shrink-0 items-center justify-between gap-2 px-1">
              <p className="text-sm font-semibold text-stone-900">
                对应图片（参考）
              </p>
              <p className="text-xs text-stone-500">我的素材 # {slot.order}</p>
            </div>
            {slotReferenceImage?.image_url ? (
              <div className="min-h-0 flex-1 overflow-hidden rounded-xl">
                <img
                  alt={`${slot.title} my reference #${slot.order}`}
                  className="h-full w-full rounded-xl object-cover"
                  src={slotReferenceImage.image_url}
                />
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
                还没有对应的我的素材图（第 {slot.order} 张）
              </div>
            )}
          </div>

          <div className="flex h-[520px] flex-col rounded-2xl border border-stone-200 bg-white p-3">
            <div className="flex h-11 shrink-0 items-center justify-between gap-2 px-1">
              <p className="text-sm font-semibold text-stone-900">新生成图片</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-stone-500">
                  {latestAsset ? `v${latestAsset.version}` : "即将生成"}
                </p>
                {latestAsset ? (
                  <Button
                    className="h-7 px-2"
                    disabled={deletingAssetId === latestAsset.id}
                    onClick={() => onDeleteAsset(latestAsset)}
                    size="sm"
                    variant="destructive"
                  >
                    {deletingAssetId === latestAsset.id ? "删除中..." : "删除"}
                  </Button>
                ) : null}
              </div>
            </div>
            {latestAsset?.image_url ? (
              <>
                <div className="min-h-0 flex-1 overflow-hidden rounded-xl">
                  <button
                    className="group relative h-full w-full cursor-zoom-in overflow-hidden rounded-xl"
                    onClick={() => setSelectedAssetId(latestAsset.id)}
                    type="button"
                  >
                    <img
                      alt={`${slot.title} v${latestAsset.version}`}
                      className="h-full w-full object-cover"
                      src={latestAsset.image_url}
                    />
                    <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white">
                      点击查看
                    </span>
                  </button>
                </div>
                {latestAsset.error_message ? (
                  <p
                    className={
                      latestAsset.error_message.startsWith("商品一致性提醒")
                        ? "text-xs leading-5 text-amber-800"
                        : "text-xs leading-5 text-rose-700"
                    }
                  >
                    {latestAsset.error_message}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
                即将生成的图片会显示在这里
              </div>
            )}
          </div>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <div className="flex h-[360px] self-start flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-sm font-semibold text-stone-900">主图合规要求</p>
            <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
              {slot.complianceNotes
                .split(/[，。]/)
                .map((item) => item.trim())
                .filter(Boolean)
                .map((item) => (
                  <div
                    className="flex min-h-[44px] items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-700"
                    key={item}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex h-[360px] flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-stone-900">历史版本</p>
              <p className="text-xs text-stone-500">
                {slotAssets.length} 个版本
              </p>
            </div>
            <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
              {slotAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex h-20 cursor-pointer items-center justify-between gap-3 rounded-xl bg-stone-100 px-3 py-2 transition-colors hover:bg-stone-200/60"
                  onClick={() => setSelectedAssetId(asset.id)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                      {asset.image_url ? (
                        <img
                          alt={`${slot.title} v${asset.version}`}
                          className="h-full w-full object-cover"
                          src={asset.image_url}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-stone-400">
                          无图
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900">v{asset.version}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-stone-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Accordion
          className="w-full"
          collapsible
          defaultValue="analysis"
          type="single"
        >
          <AccordionItem className="border-none" value="analysis">
            <AccordionTrigger className="py-0">
              <span>查看分析依据</span>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="grid gap-3 rounded-2xl bg-stone-50 p-4 content-start">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                    策略建议
                  </p>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium text-stone-500">
                      图片任务
                    </p>
                    <p className="text-sm leading-6 text-stone-800">
                      {draft.purpose}
                    </p>
                  </div>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium text-stone-500">
                      转化目标
                    </p>
                    <p className="text-sm leading-6 text-stone-800">
                      {draft.conversionGoal}
                    </p>
                  </div>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium text-stone-500">
                      图上文案
                    </p>
                    <p className="text-sm leading-6 text-stone-600">
                      {draft.recommendedOverlayCopy || "当前留空。"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl bg-amber-50/60 p-4 content-start">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                    Reasoning
                  </p>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium text-stone-500">
                      为什么这样建议
                    </p>
                    <p className="text-sm leading-6 text-stone-800">
                      {slot.evidence}
                    </p>
                  </div>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium text-stone-500">
                      为什么这样处理画面
                    </p>
                    <p className="text-sm leading-6 text-stone-800">
                      {slot.visualDirection}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl bg-emerald-50/60 p-4 content-start">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                    VOC 买家洞察
                  </p>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium text-stone-500">
                      买家想要什么
                    </p>
                    <p className="text-sm leading-6 text-stone-800">
                      {draft.conversionGoal}
                    </p>
                  </div>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium text-stone-500">
                      证据依据
                    </p>
                    <p className="text-sm leading-6 text-stone-800">
                      {slot.evidence}
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <Dialog
        open={Boolean(selectedAsset)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAssetId(null);
          }
        }}
      >
        <DialogOverlay />
        <DialogContent className="max-w-[min(95vw,1200px)]">
          <DialogHeader>
            <DialogTitle>
              图片详情
              {selectedAsset
                ? ` · v${selectedAsset.version}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedAsset ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                {selectedAsset.image_url ? (
                  <img
                    alt={`${slot.title} v${selectedAsset.version}`}
                    className="h-full w-full object-cover"
                    src={selectedAsset.image_url}
                  />
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center text-sm text-stone-500">
                    该版本无图片
                  </div>
                )}
              </div>
              <div className="grid max-h-[420px] grid-rows-[auto_auto_minmax(0,1fr)] gap-2 overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs text-stone-600">
                  时间：{formatDateTime(selectedAsset.created_at)}
                </p>
                <p className="text-xs text-stone-600">
                  模型：{selectedAsset.model_name || "unknown"}
                </p>
                <div className="overflow-y-auto">
                <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-stone-800">
                  {selectedAsset.prompt_en ||
                    selectedAsset.prompt_zh ||
                    "无 Prompt"}
                </pre>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
