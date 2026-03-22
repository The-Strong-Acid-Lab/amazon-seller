"use client";

import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { createContext, useContext, useMemo } from "react";

import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  value: string;
}) {
  const contextValue = useMemo(() => ({ value }), [value]);

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("grid gap-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex h-11 items-center rounded-xl bg-stone-100 p-1 text-stone-600",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  value,
  active,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
  active?: boolean;
}) {
  const context = useContext(TabsContext);
  const isActive = active ?? context?.value === value;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-white text-stone-950 shadow-sm"
          : "text-stone-600 hover:text-stone-900",
        className,
      )}
      type="button"
      {...props}
    />
  );
}

export function TabsContent({
  className,
  value,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  value: string;
}) {
  const context = useContext(TabsContext);

  if (context?.value !== value) {
    return null;
  }

  return <div className={cn("grid gap-4", className)} {...props} />;
}
