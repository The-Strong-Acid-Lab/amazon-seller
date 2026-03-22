import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-stone-900 text-stone-50",
  secondary: "bg-stone-200 text-stone-800",
  outline: "border border-stone-300 text-stone-700",
};

export function Badge({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: BadgeVariant;
}) {
  const variant = (props as { variant?: BadgeVariant }).variant ?? "default";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
