"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type ProjectAnalysisState = "pending" | "analyzing" | "completed" | "failed";

export function ProjectsList({
  projects,
  onCreateProject,
}: {
  projects: ProjectListItem[];
  onCreateProject?: () => void;
}) {
  const router = useRouter();
  const [projectToDelete, setProjectToDelete] =
    useState<ProjectListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteProject() {
    if (!projectToDelete) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "删除项目失败。");
      }

      setProjectToDelete(null);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "删除项目失败。",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const analysisState = getProjectAnalysisState(project);
          const productDisplayName = getSecondaryProductName(project);
          const progressSummary = getProjectProgressSummary(
            project,
            analysisState,
          );
          const chipTone =
            analysisState === "completed"
              ? "border border-transparent bg-[var(--page-accent-soft)] text-[#8d5b32]"
              : analysisState === "analyzing"
                ? "border border-amber-200 bg-amber-50 text-amber-700"
                : analysisState === "failed"
                  ? "border border-rose-200 bg-rose-50 text-rose-700"
                  : "border border-transparent bg-stone-100 text-stone-600";

          const primaryMeta = [
            project.target_market ?? null,
            `${project.competitorCount} 个竞品`,
          ].filter(Boolean);

          return (
            <Card
              key={project.id}
              className="h-full rounded-[1.5rem] border border-[var(--page-border)] bg-white/84 transition-colors duration-150 hover:border-[#b59a79] hover:shadow-[0_18px_50px_rgba(54,40,24,0.06)]"
            >
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`rounded-full font-mono text-[11px] ${chipTone}`}
                    >
                      {getProjectAnalysisLabel(analysisState)}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--page-muted)]">
                    {formatDate(project.created_at)}
                  </p>
                </div>
                <CardTitle className="line-clamp-2 text-lg mt-4">
                  {project.name}
                </CardTitle>
                {productDisplayName ? (
                  <CardDescription className="line-clamp-2 text-[var(--page-muted)]">
                    {productDisplayName}
                  </CardDescription>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {primaryMeta.map((item) => (
                    <Badge
                      key={`${project.id}-${item}`}
                      variant="outline"
                      className="rounded-full border-[var(--page-border)] bg-white/80 text-[11px] text-[var(--page-muted)]"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2 px-1">
                  <p className="text-sm font-semibold text-stone-900">
                    {progressSummary[0]}
                  </p>
                  {progressSummary.slice(1).map((line) => {
                    const [label, ...rest] = line.split("：");

                    return (
                      <p
                        key={`${project.id}-${line}`}
                        className="text-sm leading-4 text-[var(--page-muted)]"
                      >
                        <span className="font-semibold text-stone-900">
                          {label}：
                        </span>
                        {rest.join("：")}
                      </p>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="flex-1 min-w-[8rem]"
                    href={`/projects/${project.id}`}
                  >
                    <Button className="w-full rounded-full">查看项目</Button>
                  </Link>
                  <Dialog
                    open={projectToDelete?.id === project.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setProjectToDelete(null);
                        setError(null);
                        return;
                      }

                      setProjectToDelete(project);
                    }}
                  >
                    <DialogTrigger className="inline-flex h-10 items-center justify-center rounded-full border border-rose-200 bg-white/75 px-4 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50">
                      删除项目
                    </DialogTrigger>
                    <DialogOverlay />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>确认删除这个项目？</DialogTitle>
                        <DialogDescription>
                          删除后会连同这个项目下的我的商品、竞品、评论文件、评论内容、
                          分析任务和分析报告一起删除，不能恢复。
                        </DialogDescription>
                      </DialogHeader>

                      <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                        <p className="text-sm font-medium text-stone-900">
                          {project.name}
                        </p>
                        {productDisplayName ? (
                          <p className="mt-1 text-sm text-stone-600">
                            {productDisplayName}
                          </p>
                        ) : null}
                      </div>

                      {error && projectToDelete?.id === project.id ? (
                        <Alert className="mt-4" variant="destructive">
                          <AlertTitle>删除失败</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      ) : null}

                      <DialogFooter>
                        <Button
                          className="rounded-full"
                          variant="outline"
                          onClick={() => {
                            setProjectToDelete(null);
                            setError(null);
                          }}
                        >
                          取消
                        </Button>
                        <Button
                          className="rounded-full"
                          disabled={isDeleting}
                          variant="destructive"
                          onClick={handleDeleteProject}
                        >
                          {isDeleting ? "正在删除..." : "确认删除"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {onCreateProject ? (
          <button
            className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-[#b9936f] bg-[rgba(255,249,240,0.78)] text-[#8d5b32] transition-colors hover:bg-[rgba(255,244,231,0.9)]"
            onClick={onCreateProject}
            type="button"
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#b9936f] bg-white text-3xl leading-none">
              +
            </span>
            <span className="text-sm font-semibold tracking-[0.16em]">
              新建
            </span>
          </button>
        ) : null}
      </div>
    </>
  );
}

function getProjectAnalysisState(
  project: ProjectListItem,
): ProjectAnalysisState {
  if (project.status === "analyzing") {
    return "analyzing";
  }

  if (project.status === "failed") {
    return "failed";
  }

  if (project.status === "completed" || project.latestReportAt) {
    return "completed";
  }

  return "pending";
}

function getSecondaryProductName(project: ProjectListItem) {
  const projectName = project.name.trim();
  const productName = project.product_name?.trim() ?? "";

  if (!productName) {
    return "";
  }

  if (projectName === productName) {
    return "";
  }

  return productName;
}

function getProjectAnalysisLabel(state: ProjectAnalysisState) {
  switch (state) {
    case "analyzing":
      return "分析中";
    case "completed":
      return "已分析";
    case "failed":
      return "分析失败";
    default:
      return "待分析";
  }
}

function getProjectProgressSummary(
  project: ProjectListItem,
  state: ProjectAnalysisState,
) {
  const generatedDataSummary = [
    `评论：${project.reviewCount} 条`,
    `报告：${project.reportCount > 0 ? "已生成" : "未生成"}`,
    `Listing：${project.hasListingDraft ? "已生成" : "未生成"}`,
    `图片：${project.imageAssetCount > 0 ? `${project.imageAssetCount} 张` : "未生成"}`,
    `A+：${project.hasAPlusBrief ? "已生成" : "未生成"}`,
  ];

  if (state === "analyzing") {
    return ["评论已导入，后台正在生成分析结果。", ...generatedDataSummary];
  }

  if (state === "failed") {
    return [
      "上次分析失败，可以重新开始分析或继续补充数据。",
      ...generatedDataSummary,
    ];
  }

  if (state === "completed") {
    return ["已生成分析结果，可继续完善后续内容。", ...generatedDataSummary];
  }

  if (project.reviewCount > 0) {
    return ["评论已导入，等待开始分析。", ...generatedDataSummary];
  }

  return ["项目已创建，先上传评论和素材再继续。", ...generatedDataSummary];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
