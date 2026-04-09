import * as React from "react";

import { cn } from "@/lib/utils";

export function SidebarProvider({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Sidebar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        "border-r border-[var(--page-border)] bg-white/78 p-4 shadow-[0_20px_70px_rgba(41,33,23,0.06)] backdrop-blur lg:sticky lg:top-0 lg:h-screen",
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-4 border-b border-[var(--page-border)] pb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function SidebarContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-5 grid gap-5", className)} {...props}>
      {children}
    </div>
  );
}

export function SidebarFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-auto", className)} {...props}>
      {children}
    </div>
  );
}

export function SidebarGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-2", className)} {...props}>
      {children}
    </div>
  );
}

export function SidebarGroupLabel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-2 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--page-muted)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarGroupContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-2", className)} {...props}>
      {children}
    </div>
  );
}

export function SidebarMenu({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul className={cn("grid gap-2", className)} {...props}>
      {children}
    </ul>
  );
}

export function SidebarMenuItem({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li className={cn("list-none", className)} {...props}>
      {children}
    </li>
  );
}

export function SidebarMenuButton({
  className,
  isActive,
  disabled,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  isActive?: boolean;
  disabled?: boolean;
}) {
  return (
    <a
      aria-disabled={disabled}
      className={cn(
        "block rounded-2xl border px-4 py-3 transition-colors",
        isActive
          ? "border-stone-900 bg-stone-950 text-white"
          : "border-[var(--page-border)] bg-white/70 text-stone-700 hover:bg-[var(--page-surface-strong)]",
        disabled && "pointer-events-none border-dashed text-stone-400",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export function SidebarInset({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8", className)} {...props}>
      {children}
    </section>
  );
}

