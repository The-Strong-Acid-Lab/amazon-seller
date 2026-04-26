"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type ProjectListItem = {
  id: string;
  name: string;
  product_name: string | null;
  target_market: string | null;
  status: string;
  created_at: string;
  reviewCount: number;
  competitorCount: number;
  latestReportAt: string | null;
  reportCount: number;
  hasListingDraft: boolean;
  hasImageAssets: boolean;
  imageAssetCount: number;
  hasAPlusBrief: boolean;
};

type AnalysisState = "pending" | "analyzing" | "completed" | "failed";
type ViewMode = "table" | "grid";
type FilterTab = "all" | "analyzing" | "completed";

// ─── derive 4-phase progress (0–1) from project data ───────────────────
function getPhaseProgress(p: ProjectListItem) {
  return {
    e: p.reviewCount > 0 ? 1 : 0,
    i: p.latestReportAt ? 1 : p.status === "analyzing" ? 0.5 : 0,
    s: p.hasListingDraft || p.hasAPlusBrief ? 1 : p.latestReportAt ? 0.3 : 0,
    x: p.imageAssetCount > 0 && p.hasListingDraft ? 1 : p.hasListingDraft ? 0.5 : 0,
  };
}

function getAnalysisState(p: ProjectListItem): AnalysisState {
  if (p.status === "analyzing") return "analyzing";
  if (p.status === "failed") return "failed";
  if (p.status === "completed" || p.latestReportAt) return "completed";
  return "pending";
}

function getNextAction(p: ProjectListItem, state: AnalysisState): string {
  if (state === "analyzing") return "后台分析中，请稍候…";
  if (state === "failed") return "上次分析失败，请重新分析";
  if (p.reviewCount === 0) return "先上传评论文件再开始";
  if (!p.latestReportAt) return "评论已导入，点击开始分析";
  if (!p.hasListingDraft) return "洞察已生成，继续完善 Listing";
  if (p.imageAssetCount === 0) return "Listing 完成，前往图片方案";
  return "可继续完善或导出报告";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// ─── Status pill ────────────────────────────────────────────────────────
function StatusPill({ state }: { state: AnalysisState }) {
  const map: Record<AnalysisState, { label: string; cls: string; pulse?: boolean }> = {
    completed: { label: "已分析", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    analyzing: { label: "分析中", cls: "bg-amber-50 text-amber-700 border-amber-200", pulse: true },
    pending:   { label: "待分析", cls: "bg-stone-100 text-stone-500 border-stone-200" },
    failed:    { label: "失败",   cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const s = map[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide ${s.cls}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          state === "completed" ? "bg-emerald-500" :
          state === "analyzing" ? "bg-amber-500 animate-pulse" :
          state === "failed" ? "bg-red-500" : "bg-stone-400"
        }`}
      />
      {s.label}
    </span>
  );
}

// ─── 4-phase progress bars ──────────────────────────────────────────────
function PhaseBars({ p }: { p: ReturnType<typeof getPhaseProgress> }) {
  const phases = [
    { key: "e", label: "E", val: p.e },
    { key: "i", label: "I", val: p.i },
    { key: "s", label: "S", val: p.s },
    { key: "x", label: "X", val: p.x },
  ];
  return (
    <div className="flex gap-1.5">
      {phases.map((ph) => (
        <div key={ph.key} className="flex flex-1 flex-col gap-1">
          <div className="font-mono text-[9px] leading-none text-stone-400">{ph.label}</div>
          <div className="h-1 overflow-hidden rounded-full bg-stone-100">
            <div
              className={`h-full rounded-full transition-all ${
                ph.val === 1 ? "bg-emerald-500" :
                ph.val > 0 ? "bg-[var(--accent-blue)]" : "bg-transparent"
              }`}
              style={{ width: `${Math.max(ph.val > 0 ? 8 : 0, ph.val * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Delete dialog (shared by table + grid) ─────────────────────────────
function DeleteDialog({
  project,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  error,
}: {
  project: ProjectListItem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  error: string | null;
}) {
  const secondary = project.product_name?.trim() !== project.name.trim()
    ? project.product_name?.trim()
    : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除这个项目？</DialogTitle>
          <DialogDescription>
            删除后会连同这个项目下的我的商品、竞品、评论文件、评论内容、分析任务和分析报告一起删除，不能恢复。
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="text-sm font-medium text-stone-900">{project.name}</p>
          {secondary && <p className="mt-0.5 text-sm text-stone-500">{secondary}</p>}
        </div>
        {error && (
          <Alert className="mt-3" variant="destructive">
            <AlertTitle>删除失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="destructive" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? "正在删除…" : "确认删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════════════
export function ProjectsList({
  projects,
  canCreateProject,
  onCreateProject,
}: {
  projects: ProjectListItem[];
  canCreateProject?: boolean;
  onCreateProject?: () => void;
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("table");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [projectToDelete, setProjectToDelete] =
    useState<ProjectListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // counts for filter tabs
  const counts: Record<FilterTab, number> = {
    all: projects.length,
    analyzing: projects.filter((p) => p.status === "analyzing").length,
    completed: projects.filter((p) => getAnalysisState(p) === "completed").length,
  };

  const filtered = projects.filter((p) => {
    const matchTab =
      filter === "all" ||
      (filter === "analyzing" && p.status === "analyzing") ||
      (filter === "completed" && getAnalysisState(p) === "completed");
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.product_name ?? "").toLowerCase().includes(q) ||
      (p.target_market ?? "").toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  async function handleDelete() {
    if (!projectToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "删除失败");
      setProjectToDelete(null);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div
          className="relative flex-1"
          style={{ minWidth: 200, maxWidth: 360 }}
        >
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="6" cy="6" r="4.5" />
            <path d="M9.5 9.5L12 12" />
          </svg>
          <input
            className="h-9 w-full rounded-md border border-[var(--page-border)] bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[var(--accent-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/10"
            placeholder="搜索项目、ASIN、SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status tabs */}
        <div className="flex rounded-md border border-[var(--page-border)] bg-stone-50 p-0.5">
          {(["all", "analyzing", "completed"] as FilterTab[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === tab
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {{ all: "全部", analyzing: "分析中", completed: "已分析" }[tab]}
                <span className="font-mono text-[10px] text-stone-400">
                  {counts[tab]}
                </span>
              </button>
            ),
          )}
        </div>

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex rounded-md border border-[var(--page-border)] bg-stone-50 p-0.5">
          {(["table", "grid"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 font-mono text-[11px] font-medium rounded transition-colors ${
                view === v
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {v === "table" ? "表格" : "卡片"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table view ─────────────────────────────────────────────── */}
      {view === "table" && (
        <div className="overflow-hidden rounded-lg border border-[var(--page-border)] bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--page-border)] bg-stone-50 font-mono text-[10px] uppercase tracking-[0.1em] text-stone-400">
                <Th style={{ paddingLeft: 20, width: "34%" }}>
                  项目 / 目标产品
                </Th>
                <Th>状态</Th>
                <Th>评论</Th>
                <Th>竞品</Th>
                <Th style={{ width: 200 }}>进度</Th>
                <Th>最近更新</Th>
                <Th style={{ width: 48 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-sm text-stone-400"
                  >
                    没有符合条件的项目
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const state = getAnalysisState(p);
                const phase = getPhaseProgress(p);
                const secondary =
                  p.product_name?.trim() &&
                  p.product_name.trim() !== p.name.trim()
                    ? p.product_name.trim()
                    : null;
                return (
                  <tr
                    key={p.id}
                    className="group border-b border-[var(--page-border)] last:border-0 hover:bg-stone-50/60 transition-colors"
                  >
                    <td className="py-3.5 pl-5 pr-4">
                      <Link href={`/projects/${p.id}`} className="block">
                        <div className="font-medium text-stone-900 group-hover:text-[var(--accent-blue)] transition-colors">
                          {p.name}
                        </div>
                        {secondary && (
                          <div className="mt-0.5 text-xs text-stone-400 truncate max-w-xs">
                            {secondary}
                            {p.target_market && (
                              <span className="ml-2 font-mono">
                                {p.target_market}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusPill state={state} />
                    </td>
                    <td className="px-3 py-3.5 font-mono text-xs text-stone-500">
                      {p.reviewCount.toLocaleString()}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-xs text-stone-500">
                      {p.competitorCount}
                    </td>
                    <td className="px-3 py-3.5">
                      <PhaseBars p={phase} />
                      <div className="mt-1 text-[10px] text-stone-400 leading-tight">
                        {getNextAction(p, state)}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 font-mono text-xs text-stone-400">
                      {formatDate(p.latestReportAt ?? p.created_at)}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/projects/${p.id}`}>
                          <button className="rounded px-2 py-1 text-xs font-medium text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/8 transition-colors">
                            查看
                          </button>
                        </Link>
                        <button
                          onClick={() => {
                            setProjectToDelete(p);
                            setDeleteError(null);
                          }}
                          className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Grid view ──────────────────────────────────────────────── */}
      {view === "grid" && (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const state = getAnalysisState(p);
            const phase = getPhaseProgress(p);
            const secondary =
              p.product_name?.trim() && p.product_name.trim() !== p.name.trim()
                ? p.product_name.trim()
                : null;
            const completePct = Math.round(
              ((phase.e + phase.i + phase.s + phase.x) / 4) * 100,
            );
            return (
              <div
                key={p.id}
                className="flex flex-col rounded-lg border border-[var(--page-border)] bg-white p-5 transition-all hover:border-[var(--accent-blue)]/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] text-stone-400 tracking-wide">
                      {p.target_market ?? "—"} ·{" "}
                      {p.reviewCount.toLocaleString()} 评论
                    </div>
                    <Link href={`/projects/${p.id}`}>
                      <h3 className="mt-1.5 font-serif text-xl leading-snug tracking-tight text-stone-950 hover:text-[var(--accent-blue)] transition-colors">
                        {p.name}
                      </h3>
                    </Link>
                    {secondary && (
                      <p className="mt-0.5 text-xs text-stone-400 line-clamp-1">
                        {secondary}
                      </p>
                    )}
                  </div>
                  <StatusPill state={state} />
                </div>

                {/* Next action hint */}
                <div className="mt-3 rounded border-l-2 border-[var(--accent-blue)] bg-stone-50 py-2 pl-3 pr-3 text-xs text-stone-500 leading-snug">
                  {getNextAction(p, state)}
                </div>

                <div className="mt-auto pt-4">
                  <PhaseBars p={phase} />
                  <div className="mt-2 flex items-center justify-between border-t border-[var(--page-border)] pt-3">
                    <span className="font-mono text-[10px] text-stone-400">
                      {completePct}% ·{" "}
                      {formatDate(p.latestReportAt ?? p.created_at)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setProjectToDelete(p);
                          setDeleteError(null);
                        }}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        删除
                      </button>
                      <Link href={`/projects/${p.id}`}>
                        <Button size="sm" className="h-7 px-3 text-xs">
                          查看项目
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* New project tile */}
          {onCreateProject && (
            <button
              disabled={!canCreateProject}
              onClick={onCreateProject}
              className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-stone-300 bg-transparent text-stone-400 transition-colors hover:border-[var(--accent-blue)]/40 hover:bg-stone-50 hover:text-[var(--accent-blue)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-current text-2xl font-light">
                +
              </span>
              <span className="text-sm font-medium">新建项目</span>
            </button>
          )}
        </div>
      )}

      {/* ── Onboarding banner (only when no projects) ──────────────── */}
      {projects.length === 0 && (
        <div className="mt-4 rounded-lg bg-stone-900 px-8 py-6 text-white">
          <p className="font-mono text-[10px] tracking-[0.14em] text-[var(--accent-blue)]">
            GETTING STARTED
          </p>
          <h3 className="mt-2 font-serif text-2xl font-normal tracking-tight">
            开始第一个项目
          </h3>
          <p className="mt-1 text-sm text-stone-400">
            上传一份评论文件，粘贴一个竞品——10 分钟拿到决策报告。
          </p>
          <Button
            className="mt-4"
            disabled={!canCreateProject}
            onClick={onCreateProject}
          >
            + 新建项目
          </Button>
        </div>
      )}

      {/* ── Delete dialog ──────────────────────────────────────────── */}
      {projectToDelete && (
        <DeleteDialog
          project={projectToDelete}
          open={!!projectToDelete}
          onOpenChange={(v) => {
            if (!v) setProjectToDelete(null);
          }}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}
    </div>
  );
}

function Th({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <th
      className="px-3 py-2.5 text-left font-mono text-[10px] tracking-[0.1em] uppercase text-stone-400 font-medium"
      style={style}
    >
      {children}
    </th>
  );
}
