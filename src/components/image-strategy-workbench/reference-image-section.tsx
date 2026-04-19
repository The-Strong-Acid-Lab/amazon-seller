"use client";

import { useState } from "react";

import { ImageLightbox } from "@/components/image-lightbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductReferenceImage } from "@/components/image-strategy-workbench/types";

export function ReferenceImageSection({
  title,
  description,
  uploadLabel,
  images,
  isUploading,
  uploadingFileCount,
  updatingReferenceId,
  deletingReferenceId,
  showMainImagePin,
  emptyMessage,
  onUpload,
  onUpdateMetadata,
  onRequestDelete,
}: {
  title: string;
  description: string;
  uploadLabel: string;
  images: ProductReferenceImage[];
  isUploading: boolean;
  uploadingFileCount: number;
  updatingReferenceId: string | null;
  deletingReferenceId: string | null;
  showMainImagePin?: boolean;
  emptyMessage: string;
  onUpload: (filesOrUrl: FileList | File[] | string | null) => void | Promise<void>;
  onUpdateMetadata: (
    image: ProductReferenceImage,
    updates: {
      referenceKind?: ProductReferenceImage["reference_kind"];
      pinnedForMain?: boolean;
    },
  ) => void | Promise<void>;
  onRequestDelete: (image: ProductReferenceImage) => void;
}) {
  const [imageUrl, setImageUrl] = useState("");

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-stone-900">{title}</p>
          <p className="mt-1 text-xs text-stone-500">{description}</p>
        </div>
        <div className="grid w-full max-w-md gap-2">
          <input
            accept="image/*"
            className="block w-full max-w-xs cursor-pointer text-xs text-stone-700 file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium"
            disabled={isUploading}
            multiple
            onChange={(event) => {
              void onUpload(event.target.files);
              event.currentTarget.value = "";
            }}
            type="file"
          />
          <div className="flex gap-2">
            <Input
              className="h-9 text-xs"
              disabled={isUploading}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="粘贴图片 URL，例如 https://..."
              type="url"
              value={imageUrl}
            />
            <Button
              disabled={isUploading || imageUrl.trim().length === 0}
              onClick={async () => {
                await onUpload(imageUrl.trim());
                setImageUrl("");
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              导入 URL
            </Button>
          </div>
          <p className="text-[11px] text-stone-500">{uploadLabel}</p>
        </div>
      </div>
      {isUploading ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-medium text-amber-800">
            正在上传 {uploadingFileCount} 张素材图...
          </p>
        </div>
      ) : null}
      <div className="grid gap-2">
        {images.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="rounded-lg border border-stone-200 bg-white p-2"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-stone-500">
                    #{index + 1}
                  </span>
                  {showMainImagePin && image.pinned_for_main ? (
                    <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-medium text-white">
                      主图
                    </span>
                  ) : null}
                </div>
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
                <div className="mt-2 grid gap-2">
                  {showMainImagePin ? (
                    <Button
                      className="w-full"
                      disabled={updatingReferenceId === image.id}
                      onClick={() =>
                        void onUpdateMetadata(image, {
                          pinnedForMain: !image.pinned_for_main,
                        })
                      }
                      size="sm"
                      variant={image.pinned_for_main ? "secondary" : "outline"}
                    >
                      {updatingReferenceId === image.id
                        ? "更新中..."
                        : image.pinned_for_main
                          ? "当前主图参考"
                          : "设为主图参考"}
                    </Button>
                  ) : null}
                </div>
                <Button
                  className="mt-2 w-full"
                  disabled={
                    deletingReferenceId === image.id ||
                    updatingReferenceId === image.id
                  }
                  onClick={() => onRequestDelete(image)}
                  size="sm"
                  variant="outline"
                >
                  {deletingReferenceId === image.id ? "删除中..." : "删除"}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-500">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}
