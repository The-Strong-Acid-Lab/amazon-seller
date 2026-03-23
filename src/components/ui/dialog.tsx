"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { createContext, useContext } from "react";

import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useDialogContext();

  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          context.onOpenChange(true);
        }
      }}
    />
  );
}

export function DialogPortal({ children }: { children: ReactNode }) {
  const context = useDialogContext();

  if (!context.open) {
    return null;
  }

  return children;
}

export function DialogOverlay({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const context = useDialogContext();

  if (!context.open) {
    return null;
  }

  return (
    <div
      className={cn("fixed inset-0 z-40 bg-stone-950/50 backdrop-blur-sm", className)}
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          context.onOpenChange(false);
        }
      }}
    />
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <DialogPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
        <div
          className={cn(
            "w-full max-w-lg rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_20px_80px_rgba(15,23,42,0.18)]",
            className,
          )}
          {...props}
          onClick={(event) => {
            event.stopPropagation();
            props.onClick?.(event);
          }}
        >
          {children}
        </div>
      </div>
    </DialogPortal>
  );
}

export function DialogHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-2", className)} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-xl font-semibold tracking-tight text-stone-950", className)} {...props} />
  );
}

export function DialogDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-7 text-stone-600", className)} {...props} />;
}

export function DialogFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex flex-wrap justify-end gap-3", className)} {...props} />;
}

export function DialogClose(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useDialogContext();

  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          context.onOpenChange(false);
        }
      }}
    />
  );
}

function useDialogContext() {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error("Dialog components must be used within Dialog.");
  }

  return context;
}
