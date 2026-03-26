"use client";

import { useState } from "react";

import { ImportWorkbench } from "@/components/import-workbench";
import { type ProjectListItem, ProjectsList } from "@/components/projects-list";
import { Badge } from "@/components/ui/badge";
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

export function HomeConsole({ projects }: { projects: ProjectListItem[] }) {
  const analyzedCount = projects.filter(
    (project) => project.latestReportAt,
  ).length;
  const [showCreateProject, setShowCreateProject] = useState(
    projects.length === 0,
  );
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  return (
    <main className="min-h-screen px-4 py-8 text-stone-950 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-[88rem] gap-6">
        <section>
          <div className="overflow-hidden rounded-xl border border-[var(--page-border)] bg-white/78 shadow-[0_20px_70px_rgba(41,33,23,0.08)] backdrop-blur">
            <div className="grid gap-6 px-6 py-6 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Badge
                  variant="outline"
                  className="rounded-md border-[var(--page-border)] bg-white/75 px-2.5 py-1 font-mono text-[11px] tracking-[0.2em] text-[var(--page-muted)]"
                >
                  AMAZON SELLER RESEARCH CONSOLE
                </Badge>
                <div className="rounded-md border border-[var(--page-border)] bg-[var(--page-accent-soft)] px-3 py-1.5 font-mono text-[11px] text-[#8d5b32]">
                  MODE: SINGLE USER
                </div>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                控制台总览
              </h1>
              <p className="max-w-4xl text-sm leading-7 text-[var(--page-muted)]">
                一个项目只服务一个目标商品。先导入评论与竞品，再输出
                listing、图片和 A+ 的执行方案。
              </p>

              <div className="grid gap-3 md:grid-cols-3">
                <ConsoleStat label="总项目数" value={String(projects.length)} />
                <ConsoleStat label="已分析项目" value={String(analyzedCount)} />
                <ConsoleStat
                  label="待分析项目"
                  value={String(projects.length - analyzedCount)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-[var(--page-border)] bg-white/68 px-5 py-4 shadow-[0_12px_40px_rgba(54,40,24,0.06)] backdrop-blur">
            <div>
              <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--page-muted)]">
                PROJECT INDEX
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">
                项目列表
              </h2>
              <p className="mt-1 text-sm leading-7 text-[var(--page-muted)]">
                先在这里管理项目，后面可以直接接会员配额。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <SummaryPill label="总项目数" value={String(projects.length)} />
              <SummaryPill label="已分析项目" value={String(analyzedCount)} />
            </div>
          </div>

          <ProjectsList
            projects={projects}
            onCreateProject={() => setShowCreateProject(true)}
          />
        </section>

        {showCreateProject ? (
          <section className="grid gap-4 rounded-xl border border-[var(--page-border)] bg-[linear-gradient(180deg,rgba(255,251,245,0.9),rgba(255,255,255,0.72))] px-4 py-4 shadow-[0_20px_70px_rgba(54,40,24,0.08)] sm:px-6 sm:py-6">
            <div className="flex flex-wrap items-start justify-between gap-3 px-2">
              <div>
                <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--page-muted)]">
                  NEW PROJECT
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">
                  新建项目
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--page-muted)]">
                  这里负责创建新项目并导入第一份评论。后续追加竞品评论在项目详情页里做。
                </p>
              </div>
              <Button
                className="rounded-md"
                onClick={() => setConfirmCloseOpen(true)}
                type="button"
                variant="destructive"
              >
                取消
              </Button>
            </div>
            <ImportWorkbench />
          </section>
        ) : null}
      </div>

      <Dialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>关闭新建项目区域？</DialogTitle>
            <DialogDescription>
              关闭后将收起“新建项目”区域，已填写但未保存的内容会丢失。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setConfirmCloseOpen(false)}
              type="button"
              variant="outline"
            >
              继续编辑
            </Button>
            <Button
              onClick={() => {
                setShowCreateProject(false);
                setConfirmCloseOpen(false);
              }}
              type="button"
              variant="destructive"
            >
              确认关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--page-border)] bg-white/78 px-3 py-2 text-sm text-[var(--page-muted)] backdrop-blur">
      <span className="font-medium text-stone-900">{label}</span>: {value}
    </div>
  );
}

function ConsoleStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--page-border)] bg-[var(--page-surface-strong)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--page-muted)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}
