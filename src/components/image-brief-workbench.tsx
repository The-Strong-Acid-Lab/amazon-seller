"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageLightbox } from "@/components/image-lightbox";

type ImageBriefItem = {
  slot: string;
  goal: string;
  message: string;
  supporting_proof: string;
  visual_direction: string;
};

type ImageStrategy = {
  hero_image: string;
  feature_callouts: string[];
  objection_handling_images: string[];
  lifestyle_scenes: string[];
};

type ImageAsset = {
  id: string;
  slot: string;
  goal: string;
  message: string;
  supporting_proof: string;
  visual_direction: string;
  prompt_zh: string;
  prompt_en: string;
  model_name: string;
  status: "generated" | "failed";
  image_url: string | null;
  error_message: string | null;
  is_kept: boolean;
  version: number;
  created_at: string;
};

type ActionResponse = {
  error?: string;
};

type ProductReferenceImage = {
  id: string;
  project_product_id: string;
  role: "target" | "competitor";
  file_name: string;
  image_url: string | null;
  created_at: string;
};

type ProductOption = {
  id: string;
  name: string | null;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ImageBriefWorkbench({
  projectId,
  brief,
  strategy,
  assets,
  targetProduct,
  competitorProducts,
  referenceImages,
}: {
  projectId: string;
  brief: ImageBriefItem[];
  strategy: ImageStrategy | undefined;
  assets: ImageAsset[];
  targetProduct: ProductOption | null;
  competitorProducts: ProductOption[];
  referenceImages: ProductReferenceImage[];
}) {
  const router = useRouter();
  const [generatingSlot, setGeneratingSlot] = useState<string | null>(null);
  const [keepingAssetId, setKeepingAssetId] = useState<string | null>(null);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const [deletingReferenceId, setDeletingReferenceId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        productImages.sort((left, right) => right.created_at.localeCompare(left.created_at)),
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

  async function handleReferenceUpload(projectProductId: string, file: File | null) {
    if (!file) {
      return;
    }

    setUploadingProductId(projectProductId);
    setError(null);
    setMessage(null);

    try {
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
        throw new Error(payload.error ?? "上传素材图片失败。");
      }

      setMessage(
        payload.deduplicated
          ? "检测到重复素材，已复用已有图片。"
          : "素材图片上传成功。",
      );
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上传素材图片失败。");
    } finally {
      setUploadingProductId(null);
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

  async function handleGenerate(item: ImageBriefItem) {
    if (targetReferenceCount === 0) {
      setError("请先上传至少 1 张我的商品图片，再生成草图。");
      return;
    }

    setGeneratingSlot(item.slot);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/image-assets/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slot: item.slot,
          goal: item.goal,
          message: item.message,
          supportingProof: item.supporting_proof,
          visualDirection: item.visual_direction,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ActionResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "生成失败。");
      }

      setMessage(`${item.slot} 已生成新草图。`);
      router.refresh();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "生成失败。");
    } finally {
      setGeneratingSlot(null);
    }
  }

  async function handleKeep(asset: ImageAsset) {
    setKeepingAssetId(asset.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/image-assets/${asset.id}/keep`,
        { method: "POST" },
      );
      const payload = (await response.json().catch(() => ({}))) as ActionResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "操作失败。");
      }

      setMessage(`${asset.slot} 已保留 v${asset.version}。`);
      router.refresh();
    } catch (keepError) {
      setError(keepError instanceof Error ? keepError.message : "操作失败。");
    } finally {
      setKeepingAssetId(null);
    }
  }

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>Image Brief 与草图生成</CardTitle>
        <CardDescription>
          先上传商品素材图（我的商品必传），再基于 Image Brief 生成草图并保留版本。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-4 rounded-2xl border border-stone-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-stone-900">素材输入</p>
            <Badge className="rounded-full" variant={targetReferenceCount > 0 ? "default" : "outline"}>
              我的商品素材 {targetReferenceCount > 0 ? "已就绪" : "未上传"}
            </Badge>
          </div>

          {targetProduct ? (
            <div className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-stone-900">
                  我的商品：{targetProduct.name ?? "未命名我的商品"}
                </p>
                <input
                  accept="image/*"
                  className="block w-full max-w-xs cursor-pointer text-xs text-stone-700 file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium"
                  disabled={uploadingProductId === targetProduct.id}
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    void handleReferenceUpload(targetProduct.id, nextFile);
                    event.currentTarget.value = "";
                  }}
                  type="file"
                />
              </div>
              <div className="grid gap-2">
                {(referenceImagesByProduct.get(targetProduct.id) ?? []).length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {(referenceImagesByProduct.get(targetProduct.id) ?? []).map((image) => (
                      <div key={image.id} className="rounded-lg border border-stone-200 bg-white p-2">
                        {image.image_url ? (
                          <ImageLightbox
                            alt={image.file_name}
                            caption={image.file_name}
                            src={image.image_url}
                          />
                        ) : (
                          <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-stone-300 text-xs text-stone-500">
                            无预览图
                          </div>
                        )}
                        <p className="mt-2 truncate text-xs text-stone-600">{image.file_name}</p>
                        <Button
                          className="mt-2 w-full rounded-full"
                          disabled={deletingReferenceId === image.id}
                          onClick={() => handleDeleteReference(image)}
                          size="sm"
                          variant="outline"
                        >
                          {deletingReferenceId === image.id ? "删除中..." : "删除"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-rose-700">
                    还没有上传我的商品素材图。生成草图前必须先上传至少 1 张。
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-rose-700">当前项目没有“我的商品”，无法上传必需素材。</p>
          )}

          {competitorProducts.length > 0 ? (
            <div className="grid gap-3">
              <p className="text-xs font-medium text-stone-700">
                竞品素材（可选，建议上传用于后续风格/构图对比）
              </p>
              <div className="grid gap-3">
                {competitorProducts.map((competitor) => {
                  const competitorImages = referenceImagesByProduct.get(competitor.id) ?? [];

                  return (
                    <div
                      key={competitor.id}
                      className="grid gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-stone-900">
                          竞品：{competitor.name ?? "未命名竞品"}
                        </p>
                        <input
                          accept="image/*"
                          className="block w-full max-w-xs cursor-pointer text-xs text-stone-700 file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium"
                          disabled={uploadingProductId === competitor.id}
                          onChange={(event) => {
                            const nextFile = event.target.files?.[0] ?? null;
                            void handleReferenceUpload(competitor.id, nextFile);
                            event.currentTarget.value = "";
                          }}
                          type="file"
                        />
                      </div>
                      {competitorImages.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {competitorImages.map((image) => (
                            <div key={image.id} className="rounded-lg border border-stone-200 bg-white p-2">
                              {image.image_url ? (
                                <ImageLightbox
                                  alt={image.file_name}
                                  caption={image.file_name}
                                  src={image.image_url}
                                />
                              ) : (
                                <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-stone-300 text-xs text-stone-500">
                                  无预览图
                                </div>
                              )}
                              <p className="mt-2 truncate text-xs text-stone-600">{image.file_name}</p>
                              <Button
                                className="mt-2 w-full rounded-full"
                                disabled={deletingReferenceId === image.id}
                                onClick={() => handleDeleteReference(image)}
                                size="sm"
                                variant="outline"
                              >
                                {deletingReferenceId === image.id ? "删除中..." : "删除"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-500">该竞品还未上传素材。</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {brief.length > 0 ? (
          <div className="grid gap-4">
            {brief.map((item) => {
              const slotAssets = assetsBySlot.get(item.slot) ?? [];
              const latestAsset = slotAssets[0];

              return (
                <div key={`${item.slot}-${item.goal}`} className="rounded-2xl border border-stone-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge className="rounded-full" variant="outline">
                      {item.slot}
                    </Badge>
                    <Button
                      className="rounded-full px-4"
                      disabled={generatingSlot === item.slot || targetReferenceCount === 0}
                      onClick={() => handleGenerate(item)}
                      size="sm"
                    >
                      {generatingSlot === item.slot
                        ? "生成中..."
                        : latestAsset
                          ? "重生成"
                          : "生成草图"}
                    </Button>
                  </div>
                  {targetReferenceCount === 0 ? (
                    <p className="mt-2 text-xs text-rose-700">
                      请先上传我的商品素材图，再生成该槽位草图。
                    </p>
                  ) : null}

                  <div className="mt-3 grid gap-2 text-sm text-stone-700">
                    <p>
                      <span className="font-medium text-stone-900">目标:</span> {item.goal}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">核心信息:</span> {item.message}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">支撑证据:</span>{" "}
                      {item.supporting_proof}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">视觉方向:</span>{" "}
                      {item.visual_direction}
                    </p>
                  </div>

                  {slotAssets.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {slotAssets.map((asset) => (
                        <div key={asset.id} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-stone-600">
                              v{asset.version} · {formatDateTime(asset.created_at)}
                            </p>
                            {asset.is_kept ? (
                              <Badge className="rounded-full" variant="default">
                                已保留
                              </Badge>
                            ) : (
                              <Badge className="rounded-full" variant="outline">
                                草图
                              </Badge>
                            )}
                          </div>
                          {asset.image_url ? (
                            <div className="mt-3">
                              <ImageLightbox
                                alt={`${asset.slot} v${asset.version}`}
                                caption={`${asset.slot} · v${asset.version}`}
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
                              className="rounded-full px-4"
                              disabled={asset.is_kept || keepingAssetId === asset.id}
                              onClick={() => handleKeep(asset)}
                              size="sm"
                              variant="outline"
                            >
                              {keepingAssetId === asset.id ? "处理中..." : "保留这个版本"}
                            </Button>
                            <p className="text-xs text-stone-600">模型: {asset.model_name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-stone-500">该槽位还没有生成草图。</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-stone-500">还没有 Image Brief 数据，请先完成分析。</p>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-900">图片策略补充</p>
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
      </CardContent>
    </Card>
  );
}
