"use client";

/* eslint-disable @next/next/no-img-element */

import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ImageLightbox({
  src,
  alt,
  caption,
  thumbnailClassName,
  fullImageClassName,
}: {
  src: string;
  alt: string;
  caption?: string;
  thumbnailClassName?: string;
  fullImageClassName?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          aria-label={`查看大图: ${alt}`}
          className="group relative block w-full cursor-zoom-in overflow-hidden rounded-md"
          type="button"
        >
          <img
            alt={alt}
            className={cn(
              "aspect-square w-full rounded-md border border-stone-200 object-cover transition group-hover:scale-[1.01]",
              thumbnailClassName,
            )}
            src={src}
          />
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white">
            点击查看
          </span>
        </button>
      </DialogTrigger>
      <DialogOverlay />
      <DialogContent className="max-w-[min(98vw,1400px)] overflow-visible rounded-none bg-transparent p-0 shadow-none">
        <div className="relative flex max-h-[92vh] flex-col items-center justify-center gap-3">
          <DialogClose className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-xl text-white transition hover:bg-black">
            ×
          </DialogClose>
          <img
            alt={alt}
            className={cn(
              "max-h-[88vh] w-auto max-w-[96vw] rounded-lg border border-stone-700 bg-black object-contain shadow-[0_18px_60px_rgba(0,0,0,0.45)]",
              fullImageClassName,
            )}
            src={src}
          />
          {caption ? (
            <p className="max-w-[96vw] truncate text-xs text-stone-200">{caption}</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
