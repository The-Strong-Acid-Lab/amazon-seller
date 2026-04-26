"use client";

import { useState } from "react";
import Link from "next/link";

import { ConsoleShell } from "@/components/console-shell";
import { ImportWorkbench } from "@/components/import-workbench";
import { type ProjectListItem, ProjectsList } from "@/components/projects-list";
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
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const analyzedCount = projects.filter((p) => p.latestReportAt).length;
  const totalReviews = projects.reduce((sum, p) => sum + p.reviewCount, 0);
  const listingCount = projects.filter((p) => p.hasListingDraft).length;

  return (
    <ConsoleShell
      actions={
        <Button
          disabled={!canCreateProject}
          onClick={() => setShowCreateProject(true)}
          type="button"
        >
          + 新建项目
        </Button>
      }
      title="我的项目"
      userEmail={userEmail}
    >
      {/* ── API key warning ── */}
      {!canCreateProject && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-medium">⚠ 先到</span>
          <Link className="font-semibold underline" href="/dashboard/settings">
            Settings
          </Link>
          <span>保存你自己的 API Key，之后才能新建项目。</span>
        </div>
      )}

      {/* ── Stat strip ── */}
      <div className="mb-5 grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-[var(--page-border)] bg-[var(--page-border)]">
        <StatCell
          label="项目总数"
          value={String(projects.length)}
          sub={`分析中 ${projects.filter((p) => p.status === "analyzing").length} 个`}
        />
        <StatCell
          label="已分析"
          value={String(analyzedCount)}
          sub={`占比 ${projects.length ? Math.round((analyzedCount / projects.length) * 100) : 0}%`}
        />
        <StatCell
          label="评论总量"
          value={
            totalReviews >= 1000
              ? `${(totalReviews / 1000).toFixed(1)}k`
              : String(totalReviews)
          }
          sub="条已解析"
        />
        <StatCell
          label="已产出 Listing"
          value={String(listingCount)}
          sub="份草稿"
        />
      </div>

      {/* ── Projects list (handles its own filter bar + table/grid) ── */}
      <ProjectsList
        canCreateProject={canCreateProject}
        onCreateProject={() => setShowCreateProject(true)}
        projects={projects}
      />

      {/* ── New project dialog ── */}
      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogOverlay />
        <DialogContent
          className="max-h-[90vh] max-w-6xl"
          onInteractOutside={(e) => e.preventDefault()}
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
              关闭后将退出&ldquo;新建项目&rdquo;窗口，已填写但未保存的内容会丢失。
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

function StatCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--page-muted)]">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl leading-none tracking-tight text-stone-950">
        {value}
      </p>
      <p className="mt-1.5 font-mono text-[11px] text-[var(--page-muted)]">
        {sub}
      </p>
    </div>
  );
}
