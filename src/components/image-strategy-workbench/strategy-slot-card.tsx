"use client";

import { ImageLightbox } from "@/components/image-lightbox";
import { Badge } from "@/components/ui/badge";
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
  expandedAssetIds,
  keepingAssetId,
  deletingAssetId,
  modelOptions,
  selectedModelId,
  onToggleExpand,
  onSave,
  onGenerate,
  onPromptDeltaChange,
  onResetPrompt,
  onResetAnalysis,
  onModelChange,
  onPromptChange,
  onSelectBaseAsset,
  onClearBaseAsset,
  onToggleAssetPrompt,
  onKeepAsset,
  onDeleteAsset,
  promptDeltaValue,
  selectedBaseAssetId,
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
  expandedAssetIds: Record<string, boolean>;
  keepingAssetId: string | null;
  deletingAssetId: string | null;
  modelOptions: ImageModelOption[];
  selectedModelId: string;
  onToggleExpand: () => void;
  onSave: () => void | Promise<void>;
  onGenerate: () => void | Promise<void>;
  onPromptDeltaChange: (value: string) => void;
  onResetPrompt: () => void;
  onResetAnalysis: () => void | Promise<void>;
  onModelChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onSelectBaseAsset: (assetId: string) => void;
  onClearBaseAsset: () => void;
  onToggleAssetPrompt: (assetId: string) => void;
  onKeepAsset: (asset: ImageAsset) => void | Promise<void>;
  onDeleteAsset: (asset: ImageAsset) => void;
  promptDeltaValue: string;
  selectedBaseAssetId: string | null;
}) {
  const hasConsistencyWarning =
    generationRun?.error_message?.startsWith("商品一致性提醒");
  const latestAsset = slotAssets[0] ?? null;
  const olderAssets = slotAssets.slice(1);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4">
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
            <Button onClick={onToggleExpand} size="lg" variant="outline">
              {isExpanded ? "收起策略" : "查看策略"}
            </Button>
            <Button
              disabled={isSaving}
              onClick={() => void onSave()}
              size="lg"
              variant="outline"
            >
              {isSaving ? "保存中..." : "保存槽位"}
            </Button>
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

          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
            <span>
              当前生成基底：
              {selectedBaseAssetId
                ? ` v${slotAssets.find((asset) => asset.id === selectedBaseAssetId)?.version ?? "?"}`
                : " 自动选择"}
            </span>
            {selectedBaseAssetId ? (
              <Button onClick={onClearBaseAsset} size="sm" variant="ghost">
                清除基底
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-6 grid gap-4">
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(320px,1.08fr)]">
            <div className="grid self-start gap-4">
              <div className="flex h-[520px] flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-900">
                    生成Prompt
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => void onResetAnalysis()}
                      size="sm"
                      variant="outline"
                    >
                      重置为最新分析结果
                    </Button>
                    <Button onClick={onResetPrompt} size="sm" variant="outline">
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
                  这里只保留最终生图指令，避免和分析过程信息重复。
                </p>
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
                    onChange={(event) =>
                      onPromptDeltaChange(event.target.value)
                    }
                    placeholder="例如：保持脚托和椅背结构不变，仅更换场景光线与背景元素。"
                    value={promptDeltaValue}
                  />
                </div>
              </div>

              <div className="flex h-[360px] self-start flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
                <p className="text-sm font-semibold text-stone-900">
                  主图合规要求
                </p>
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
            </div>

            <div className="grid self-start content-start gap-4">
              <div className="flex h-[520px] flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-900">
                    最新生成图片
                  </p>
                  <p className="text-xs text-stone-500">
                    {latestAsset ? `v${latestAsset.version}` : "还没有结果"}
                  </p>
                </div>
                {latestAsset?.image_url ? (
                  <>
                    <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                      <ImageLightbox
                        alt={`${slot.title} v${latestAsset.version}`}
                        caption={`${slot.title} · v${latestAsset.version}`}
                        src={latestAsset.image_url}
                        thumbnailClassName="h-full bg-white"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={
                          latestAsset.is_kept ||
                          keepingAssetId === latestAsset.id
                        }
                        onClick={() => void onKeepAsset(latestAsset)}
                        size="sm"
                        variant="outline"
                      >
                        {keepingAssetId === latestAsset.id
                          ? "处理中..."
                          : "保留这个版本"}
                      </Button>
                      <Button
                        disabled={deletingAssetId === latestAsset.id}
                        onClick={() => onDeleteAsset(latestAsset)}
                        size="sm"
                        variant="destructive"
                      >
                        {deletingAssetId === latestAsset.id
                          ? "删除中..."
                          : "删除方案图"}
                      </Button>
                      <Button
                        onClick={() => onToggleAssetPrompt(latestAsset.id)}
                        size="sm"
                        variant="secondary"
                      >
                        {expandedAssetIds[latestAsset.id]
                          ? "收起提示词"
                          : "查看提示词"}
                      </Button>
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
                    生成图片将显示在这里
                  </div>
                )}
              </div>

              {olderAssets.length > 0 ? (
                <div className="flex h-[360px] flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-900">
                      历史版本
                    </p>
                    <p className="text-xs text-stone-500">
                      {slotAssets.length} 个版本
                    </p>
                  </div>
                  <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
                    {slotAssets.map((asset, index) => (
                      <div
                        className="flex min-h-[68px] items-center justify-between gap-3 rounded-xl border border-stone-200 px-3 py-2"
                        key={asset.id}
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
                            <p className="text-sm font-medium text-stone-900">
                              v{asset.version}
                              {index === 0 ? "  当前版本" : ""}
                            </p>
                            <p className="text-xs text-stone-500">
                              {asset.is_kept ? "已保留" : "已生成"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {asset.is_kept ? (
                            <Badge className="rounded-full" variant="secondary">
                              当前
                            </Badge>
                          ) : null}
                          <Button
                            onClick={() => onSelectBaseAsset(asset.id)}
                            size="sm"
                            variant={
                              selectedBaseAssetId === asset.id
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {selectedBaseAssetId === asset.id
                              ? "已设为基底"
                              : "基于此版本生成"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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
      ) : slotAssets.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {slotAssets.map((asset) => (
            <ImageConceptCard
              asset={asset}
              deletingAssetId={deletingAssetId}
              expandedAssetIds={expandedAssetIds}
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
