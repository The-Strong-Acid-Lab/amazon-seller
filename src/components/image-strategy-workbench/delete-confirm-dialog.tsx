"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DeleteTarget } from "@/components/image-strategy-workbench/types";

export function DeleteConfirmDialog({
  target,
  deletingReferenceId,
  deletingAssetId,
  onClose,
  onConfirm,
}: {
  target: DeleteTarget | null;
  deletingReferenceId: string | null;
  deletingAssetId: string | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={Boolean(target)}
    >
      <DialogOverlay />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{target?.title ?? "确认删除？"}</DialogTitle>
          <DialogDescription>
            {target?.description ?? "这个操作无法撤销。"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            取消
          </Button>
          <Button
            disabled={
              !target ||
              deletingReferenceId === target.id ||
              deletingAssetId === target.id
            }
            onClick={() => void onConfirm()}
            variant="destructive"
          >
            {target?.kind === "reference"
              ? deletingReferenceId === target.id
                ? "删除中..."
                : target?.confirmLabel
              : deletingAssetId === target?.id
                ? "删除中..."
                : target?.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
