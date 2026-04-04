"use client";

import { ImageLightbox } from "@/components/image-lightbox";
import { Button } from "@/components/ui/button";
import type { ProductReferenceImage } from "@/components/image-strategy-workbench/types";

export function ReferenceImageSection({
  title,
  description,
  uploadLabel,
  images,
  isUploading,
  uploadingFileCount,
  deletingReferenceId,
  emptyMessage,
  onUpload,
  onRequestDelete,
}: {
  title: string;
  description: string;
  uploadLabel: string;
  images: ProductReferenceImage[];
  isUploading: boolean;
  uploadingFileCount: number;
  deletingReferenceId: string | null;
  emptyMessage: string;
  onUpload: (files: FileList | File[] | null) => void | Promise<void>;
  onRequestDelete: (image: ProductReferenceImage) => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-stone-900">{title}</p>
          <p className="mt-1 text-xs text-stone-500">{description}</p>
        </div>
        <div className="grid gap-2">
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
            {images.map((image) => (
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
