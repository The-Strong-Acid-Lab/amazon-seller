import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type AlertVariant = "default" | "destructive" | "warning";

const variantClasses: Record<AlertVariant, string> = {
  default: "border-stone-200 bg-stone-50 text-stone-900",
  destructive: "border-rose-200 bg-rose-50 text-rose-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

export function Alert({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
}) {
  const variant = (props as { variant?: AlertVariant }).variant ?? "default";

  return (
    <div
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />;
}
