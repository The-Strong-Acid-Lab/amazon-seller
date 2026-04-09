"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductListingEditor } from "@/components/product-listing-editor";

type EditableProduct = {
  id: string;
  role: "target" | "competitor";
  name: string | null;
  asin: string | null;
  product_url: string | null;
  market: string | null;
  current_title: string | null;
  current_bullets: string | null;
  current_description: string | null;
  notes: string | null;
};

export function ProductListingEditorModal({
  projectId,
  product,
  triggerLabel,
}: {
  projectId: string;
  product: EditableProduct;
  triggerLabel?: string;
}) {
  const roleLabel = product.role === "target" ? "我的商品" : "竞品";
  const title = `${roleLabel}信息编辑`;
  const description =
    product.role === "target"
      ? "更新我的商品名称、基础信息和 listing 输入（标题、bullets、描述）。"
      : "更新该竞品名称、基础信息和 listing 输入（标题、bullets、描述）。";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          {triggerLabel ?? `编辑${roleLabel}`}
        </Button>
      </DialogTrigger>
      <DialogOverlay />
      <DialogContent className="max-w-[min(96vw,1280px)] p-0">
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-6 md:px-8">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <DialogClose className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900">
              ×
            </DialogClose>
          </div>

          <div className="scrollbar-hidden flex-1 overflow-y-auto px-6 py-6 md:px-8">
            <ProductListingEditor
              mode="embedded"
              product={product}
              projectId={projectId}
            />
          </div>

          <DialogFooter className="border-t border-stone-200 px-6 py-4 md:px-8">
            <DialogClose className="inline-flex h-10 items-center justify-center rounded-full border border-stone-300 bg-white px-4 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-100">
              关闭
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
