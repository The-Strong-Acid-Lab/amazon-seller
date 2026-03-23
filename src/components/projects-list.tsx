"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type ProjectListItem = {
  id: string;
  name: string;
  product_name: string | null;
  target_market: string | null;
  status: string;
  created_at: string;
  reviewCount: number;
  competitorCount: number;
  latestReportAt: string | null;
};

export function ProjectsList({ projects }: { projects: ProjectListItem[] }) {
  const router = useRouter();
  const [projectToDelete, setProjectToDelete] = useState<ProjectListItem | null>(null);
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
      setError(deleteError instanceof Error ? deleteError.message : "删除项目失败。");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="h-full rounded-[2rem] border-stone-200 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[0_20px_70px_rgba(15,23,42,0.08)]"
          >
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full text-xs text-stone-600">
                  {project.status}
                </Badge>
                <Badge variant="secondary" className="rounded-full text-xs">
                  {project.target_market ?? "-"}
                </Badge>
              </div>
              <CardTitle className="line-clamp-2">{project.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {project.product_name ?? "未命名目标商品"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-3 gap-3">
                <MiniStat label="评论" value={String(project.reviewCount)} />
                <MiniStat label="竞品" value={String(project.competitorCount)} />
                <MiniStat
                  label="分析"
                  value={project.latestReportAt ? "已生成" : "未开始"}
                />
              </div>
              <p className="text-xs text-stone-500">创建于 {formatDate(project.created_at)}</p>
              <div className="flex flex-wrap gap-3">
                <Link href={`/projects/${project.id}`}>
                  <Button className="rounded-full" variant="outline">
                    查看项目
                  </Button>
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
                  <DialogTrigger
                    className="inline-flex h-10 items-center justify-center rounded-full border border-rose-200 px-4 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50"
                  >
                    删除项目
                  </DialogTrigger>
                  <DialogOverlay />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>确认删除这个项目？</DialogTitle>
                      <DialogDescription>
                        删除后会连同这个项目下的目标商品、竞品、评论文件、评论内容、
                        分析任务和分析报告一起删除，不能恢复。
                      </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                      <p className="text-sm font-medium text-stone-900">{project.name}</p>
                      <p className="mt-1 text-sm text-stone-600">
                        {project.product_name ?? "未命名目标商品"}
                      </p>
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
        ))}
      </div>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-stone-950">{value}</p>
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
