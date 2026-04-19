"use client";

import { useState } from "react";
import Link from "next/link";

import { ConsoleShell } from "@/components/console-shell";
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

export function HomeConsole({
  projects,
  userEmail,
  canCreateProject,
}: {
  projects: ProjectListItem[];
  userEmail?: string | null;
  canCreateProject: boolean;
}) {
  const analyzedCount = projects.filter(
    (project) => project.latestReportAt,
  ).length;
  const draftCount = projects.filter(
    (project) => !project.latestReportAt && project.status !== "analyzing",
  ).length;
  const latestProjects = [...projects]
    .sort((left, right) => {
      const leftTimestamp = new Date(
        left.latestReportAt ?? left.created_at,
      ).getTime();
      const rightTimestamp = new Date(
        right.latestReportAt ?? right.created_at,
      ).getTime();
      return rightTimestamp - leftTimestamp;
    })
    .slice(0, 3);

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  return (
    <ConsoleShell
      actions={
        <>
          <Button
            disabled={!canCreateProject}
            onClick={() => setShowCreateProject(true)}
            type="button"
          >
            新建项目
          </Button>
        </>
      }
      description="新建一个商品项目，或继续已有项目。"
      title="Projects"
      userEmail={userEmail}
    >
      <div className="grid gap-6">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
          <div className="rounded-[1.75rem] border border-[var(--page-border)] bg-[linear-gradient(180deg,rgba(255,250,242,0.98),rgba(255,255,255,0.92))] p-6 shadow-[0_18px_50px_rgba(54,40,24,0.06)]">
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-stone-950">
              管理你的商品项目。
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--page-muted)]">
              新建一个项目，上传评论和素材，然后继续生成
              Listing、图片和页面方案。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="px-5"
              disabled={!canCreateProject}
              onClick={() => setShowCreateProject(true)}
              type="button"
            >
              新建项目
            </Button>
            </div>

            {!canCreateProject ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                先到 <Link className="font-medium underline" href="/dashboard/settings">Settings</Link> 保存你自己的 API Key，之后才能新建项目。
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <ConsoleStat label="总项目数" value={String(projects.length)} />
              <ConsoleStat label="已分析项目" value={String(analyzedCount)} />
              <ConsoleStat label="草稿项目" value={String(draftCount)} />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--page-border)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(54,40,24,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-stone-950">
                  最近访问
                </h3>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {latestProjects.length > 0 ? (
                latestProjects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-[var(--page-border)] bg-[var(--page-surface-strong)] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-stone-950">
                          {project.name}
                        </p>
                        {/* <p className="mt-1 truncate text-sm text-[var(--page-muted)]">
                          {project.product_name ?? "未命名我的商品"}
                        </p> */}
                      </div>
                      <Badge className="rounded-full" variant="outline">
                        {project.target_market ?? "-"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--page-muted)]">
                      <span>
                        {project.latestReportAt ? "最近分析" : "创建时间"}
                      </span>
                      <span>·</span>
                      <span>
                        {formatDate(
                          project.latestReportAt ?? project.created_at,
                        )}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--page-border)] px-4 py-6 text-sm text-[var(--page-muted)]">
                  还没有项目。先新建第一个项目。
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <ProjectsList projects={projects} />
        </section>
      </div>

      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogOverlay />
        <DialogContent
          className="max-h-[90vh] max-w-6xl"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>新建项目</DialogTitle>
          </DialogHeader>
          <div className="-mx-4 mt-4 scrollbar-hidden max-h-[70vh] overflow-y-auto px-4">
            <ImportWorkbench />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setConfirmCloseOpen(true)}
              type="button"
              variant="destructive"
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>关闭新建项目窗口？</DialogTitle>
            <DialogDescription>
              关闭后将退出“新建项目”窗口，已填写但未保存的内容会丢失。
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
    </ConsoleShell>
  );
}

function ConsoleStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--page-border)] bg-white/78 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--page-muted)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
