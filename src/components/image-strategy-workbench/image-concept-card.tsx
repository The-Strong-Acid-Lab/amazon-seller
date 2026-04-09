"use client";

import { ImageLightbox } from "@/components/image-lightbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatDateTime,
  type ImageAsset,
} from "@/components/image-strategy-workbench/types";

export function ImageConceptCard({
  asset,
  slotTitle,
  keepingAssetId,
  deletingAssetId,
  expandedAssetId,
  onKeep,
  onDelete,
  onTogglePrompt,
}: {
  asset: ImageAsset;
  slotTitle: string;
  keepingAssetId: string | null;
  deletingAssetId: string | null;
  expandedAssetId: string | null;
  onKeep: (asset: ImageAsset) => void | Promise<void>;
  onDelete: (asset: ImageAsset) => void;
  onTogglePrompt: (assetId: string) => void;
}) {
  const isPromptExpanded = expandedAssetId === asset.id;

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-stone-600">
          v{asset.version} · {formatDateTime(asset.created_at)}
        </p>
        {asset.status === "failed" ? (
          <Badge
            className="rounded-full border border-rose-200 bg-rose-50 text-rose-700"
            variant="outline"
          >
            一致性未通过
          </Badge>
        ) : asset.is_kept ? (
          <Badge className="rounded-full" variant="default">
            已保留
          </Badge>
        ) : (
          <Badge className="rounded-full" variant="outline">
            方案图
          </Badge>
        )}
      </div>

      {asset.image_url ? (
        <div className="mt-3">
          <ImageLightbox
            alt={`${slotTitle} v${asset.version}`}
            caption={`${slotTitle} · v${asset.version}`}
            src={asset.image_url}
            thumbnailClassName="rounded-lg bg-white"
          />
        </div>
      ) : (
        <div className="mt-3 flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-stone-300 text-xs text-stone-500">
          无预览图
        </div>
      )}

      <div className="mt-3 grid gap-2">
        <Button
          className="px-4"
          disabled={asset.is_kept || keepingAssetId === asset.id || asset.status === "failed"}
          onClick={() => void onKeep(asset)}
          size="sm"
          variant="outline"
        >
          {keepingAssetId === asset.id ? "处理中..." : "保留这个版本"}
        </Button>
        <Button
          className="px-4"
          disabled={deletingAssetId === asset.id}
          onClick={() => onDelete(asset)}
          size="sm"
          variant="destructive"
        >
          {deletingAssetId === asset.id ? "删除中..." : "删除方案图"}
        </Button>
        <Button
          className="px-4"
          onClick={() => onTogglePrompt(asset.id)}
          size="sm"
          variant="secondary"
        >
          {isPromptExpanded ? "收起提示词" : "查看提示词"}
        </Button>
        <p className="text-xs text-stone-600">模型: {asset.model_name}</p>
        {asset.error_message ? (
          <p className="text-xs leading-5 text-rose-700">{asset.error_message}</p>
        ) : null}
      </div>

      {isPromptExpanded ? (
        <div className="mt-3 rounded-xl border border-stone-200 bg-white p-3">
          {asset.prompt_zh && asset.prompt_en && asset.prompt_zh !== asset.prompt_en ? (
            <div className="grid gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                  原始提示词
                </p>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">
                  {asset.prompt_zh}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                  实际执行提示词
                </p>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">
                  {asset.prompt_en}
                </pre>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                已使用提示词
              </p>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">
                {asset.prompt_en || asset.prompt_zh || "未记录提示词"}
              </pre>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
