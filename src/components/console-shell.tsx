"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

const NAV_ITEMS: ReadonlyArray<{
  label: string;
  href: string;
  description: string;
  disabled?: boolean;
}> = [
  {
    label: "Projects",
    href: "/console",
    description: "项目与工作台",
  },
  {
    label: "Templates",
    href: "#",
    description: "后续开放",
    disabled: true,
  },
  {
    label: "Assets",
    href: "#",
    description: "后续开放",
    disabled: true,
  },
  {
    label: "Settings",
    href: "#",
    description: "后续开放",
    disabled: true,
  },
] as const;

export function ConsoleShell({
  children,
  title,
  description,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen text-stone-950">
      <SidebarProvider>
        <Sidebar>
          <div className="flex h-full flex-col">
            <SidebarHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-stone-950">
                    Console
                  </p>
                </div>
                <Badge className="rounded-full" variant="outline">
                  Beta
                </Badge>
              </div>
              <Button
                asChild
                className="w-full rounded-xl justify-start px-4"
                variant="outline"
              >
                <Link href="/">返回官网占位页</Link>
              </Button>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {NAV_ITEMS.map((item) => {
                      const active = !item.disabled && pathname === item.href;

                      return (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton
                            href={item.disabled ? undefined : item.href}
                            isActive={active}
                            disabled={item.disabled}
                          >
                            <p className="font-medium">{item.label}</p>
                            <p
                              className={`mt-1 text-xs ${
                                active
                                  ? "text-white/70"
                                  : "text-[var(--page-muted)]"
                              }`}
                            >
                              {item.description}
                            </p>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
              <div className="rounded-2xl border border-[var(--page-border)] bg-[var(--page-surface-strong)] p-4">
                <p className="mt-3 text-sm font-medium text-stone-900">
                  Single User
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--page-muted)]">
                  后续这里替换成登录用户、套餐、额度和账户入口。
                </p>
              </div>
            </SidebarFooter>
          </div>
        </Sidebar>

        <SidebarInset>
          <div className="rounded-[2rem] border border-[var(--page-border)] bg-white/80 p-6 shadow-[0_20px_70px_rgba(41,33,23,0.08)] backdrop-blur sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--page-border)] pb-6">
              <div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                  {title}
                </h1>
                {description ? (
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--page-muted)]">
                    {description}
                  </p>
                ) : null}
              </div>
              {actions ? (
                <div className="flex flex-wrap gap-3">{actions}</div>
              ) : null}
            </div>

            <div className="pt-6">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </main>
  );
}
