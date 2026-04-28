"use client";

import { useState } from "react";
import Link from "next/link";

import { AnalyzeProjectButton } from "@/components/analyze-project-button";
import { formatDateTime } from "@/components/project-page/sections";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { EvidenceStep } from "./evidence-step";
import { ExportStep } from "./export-step";
import { ImagesStep } from "./images-step";
import { InsightStep } from "./insight-step";
import { ListingStep } from "./listing-step";
import { StrategyStep } from "./strategy-step";
import type { ProjectWorkspaceShellProps } from "./types";

export type { ProjectWorkspaceShellProps } from "./types";

// ─── Step config ─────────────────────────────────────────────────────────────

type StepKey =
  | "evidence"
  | "insight"
  | "strategy"
  | "listing"
  | "images"
  | "export";

const STEPS: Array<{ key: StepKey; num: string; label: string }> = [
  { key: "evidence", num: "01", label: "证据" },
  { key: "insight", num: "02", label: "洞察" },
  { key: "strategy", num: "03", label: "策略" },
  { key: "listing", num: "04", label: "Listing" },
  { key: "images", num: "05", label: "图片" },
  { key: "export", num: "06", label: "导出" },
];

function getStepStatus(
  key: StepKey,
  props: ProjectWorkspaceShellProps,
): "done" | "current" | "pending" | "locked" {
  const { report, reviews, imageAssets } = props;
  const hasReviews = reviews.filter((r) => r.project_product_id).length > 0;
  const hasReport = !!report;
  switch (key) {
    case "evidence":
      return hasReviews ? "done" : "current";
    case "insight":
      return hasReport ? "done" : hasReviews ? "pending" : "locked";
    case "strategy":
      return hasReport &&
        (report.voc_response_matrix.length > 0 ||
          report.comparison_opportunities.length > 0)
        ? "done"
        : hasReport
          ? "pending"
          : "locked";
    case "listing":
      return report?.listing_draft ? "done" : hasReport ? "pending" : "locked";
    case "images":
      return imageAssets.length > 0
        ? "done"
        : report?.listing_draft
          ? "pending"
          : "locked";
    case "export":
      return report?.listing_draft ? "pending" : "locked";
  }
}

function getInitialStep(props: ProjectWorkspaceShellProps): StepKey {
  if (!props.report) return "evidence";
  if (!props.report.listing_draft)
    return props.report.voc_response_matrix.length > 0 ? "strategy" : "insight";
  if (props.imageAssets.length === 0) return "listing";
  return "images";
}

function getNextBanner(activeStep: StepKey, props: ProjectWorkspaceShellProps) {
  const { report, reviews, latestAnalysisStatus } = props;
  const hasReviews = reviews.filter((r) => r.project_product_id).length > 0;
  const isRunning =
    latestAnalysisStatus === "running" || latestAnalysisStatus === "queued";

  if (activeStep === "evidence") {
    if (isRunning)
      return {
        title: "正在分析，稍候…",
        sub: `评论解析中 · 完成后自动跳到洞察层`,
        cta: null,
      };
    if (!hasReviews)
      return {
        title: "先上传评论文件",
        sub: "至少需要一个产品 + 一份评论文件，才能开始分析。",
        cta: null,
      };
    return {
      title: "资料齐全，可以开始分析",
      sub: `已导入 ${reviews.filter((r) => r.project_product_id).length} 条评论 · ${props.competitorProducts.length} 个竞品`,
      cta: "开始分析",
    };
  }
  if (activeStep === "insight") {
    if (!report)
      return {
        title: "需要先完成分析",
        sub: "回到「证据」步骤，点击开始分析。",
        cta: null,
      };
    return {
      title: "审阅洞察，进入策略层",
      sub: `${report.target_negative_themes.length} 个负面主题等待响应 · ${report.buyer_objections.length} 个买家顾虑`,
      cta: "生成策略矩阵",
    };
  }
  if (activeStep === "strategy") {
    if (!report)
      return {
        title: "需要先完成分析",
        sub: "回到「证据」步骤，点击开始分析。",
        cta: null,
      };
    return {
      title: "审阅策略，生成 Listing 草稿",
      sub: `${report.voc_response_matrix.length} 条 VOC 响应 · ${report.comparison_opportunities.length} 个定位机会`,
      cta: "生成 Listing 草稿",
    };
  }
  if (activeStep === "listing")
    return {
      title: "审阅 Listing 草稿后进入图片规划",
      sub: "逐条采纳或修改，完成后再做图片。",
      cta: null,
    };
  if (activeStep === "images")
    return {
      title: "为 8 个图片 slot 写 brief",
      sub: "主图 + 7 张辅图，每个 slot 对应一个买家顾虑。",
      cta: null,
    };
  if (activeStep === "export")
    return {
      title: "导出可交付报告",
      sub: "Listing 文本 / A+ Brief / 完整 PDF，按需选择。",
      cta: null,
    };
  return { title: "", sub: "", cta: null };
}

// ─── Main shell ──────────────────────────────────────────────────────────────

export function ProjectWorkspaceShell(props: ProjectWorkspaceShellProps) {
  const [activeStep, setActiveStep] = useState<StepKey>(() =>
    getInitialStep(props),
  );
  const { project, latestAnalysisRun, freshness } = props;
  const providers =
    props.availableAnalysisProviders.length > 0
      ? props.availableAnalysisProviders
      : (["openai"] as Array<"openai" | "gemini">);

  const banner = getNextBanner(activeStep, props);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* ── Sticky header zone ── */}
      <div className="sticky top-0 z-20 border-b border-[var(--page-border)] bg-white/95 backdrop-blur">
        {/* Project header */}
        <div className="mx-auto max-w-7xl px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <button className="font-mono text-xs text-stone-400 hover:text-stone-600 transition-colors">
                    ← Projects
                  </button>
                </Link>
                <span className="text-stone-300">/</span>
                <span className="font-mono text-xs text-stone-500 truncate max-w-xs">
                  {project.name}
                </span>
              </div>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
                {project.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-400 font-mono">
                {project.target_market && <span>{project.target_market}</span>}
                {project.target_market && <span>·</span>}
                <span>
                  {props.reviews
                    .filter((r) => r.project_product_id)
                    .length.toLocaleString()}{" "}
                  条评论
                </span>
                <span>·</span>
                <span>{props.competitorProducts.length} 个竞品</span>
                {props.reportCreatedAt && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-600">
                      ● 已分析 {formatDateTime(props.reportCreatedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AnalyzeProjectButton
                availableProviders={providers}
                initialRunError={latestAnalysisRun?.error_message ?? null}
                initialRunStatus={
                  latestAnalysisRun?.status === "pending"
                    ? null
                    : (latestAnalysisRun?.status ?? null)
                }
                projectId={project.id}
              />
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}
          >
            {STEPS.map((step) => {
              const status = getStepStatus(step.key, props);
              const isActive = step.key === activeStep;
              const isDone = status === "done";
              const isLocked = status === "locked";
              return (
                <button
                  key={step.key}
                  onClick={() => !isLocked && setActiveStep(step.key)}
                  disabled={isLocked}
                  className={`group relative flex items-center gap-2.5 pb-3 pt-2 text-left transition-colors ${
                    isLocked
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-pointer"
                  }`}
                  style={{
                    borderBottom: isActive
                      ? "2px solid var(--accent-blue)"
                      : "2px solid transparent",
                  }}
                >
                  <span
                    className="relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold"
                    style={{
                      background: isDone
                        ? "#1a1815"
                        : isActive
                          ? "var(--accent-blue)"
                          : "white",
                      color: isDone || isActive ? "white" : "#9a9388",
                      border:
                        isDone || isActive ? "none" : "1.5px solid #d6cdb8",
                    }}
                  >
                    {isDone ? "✓" : step.num.slice(-1)}
                  </span>

                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium leading-none ${
                        isActive
                          ? "text-stone-950"
                          : isDone
                            ? "text-stone-700"
                            : "text-stone-400"
                      }`}
                    >
                      {step.label}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-stone-400">
                      {step.num}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Next action banner ── */}
      {banner.title && (
        <div className="border-b border-[var(--page-border)] bg-stone-50">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3 sm:px-8">
            <span
              className="flex-shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-semibold text-white"
              style={{ background: "var(--accent-blue)" }}
            >
              ▸ 下一步
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-stone-900">
                {banner.title}
              </span>
              <span className="ml-2 text-sm text-stone-400">{banner.sub}</span>
            </div>
            {banner.cta && (
              <Button
                size="sm"
                style={{
                  background: "var(--accent-blue)",
                  color: "white",
                  border: "none",
                }}
              >
                {banner.cta} →
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Alerts ── */}
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {freshness.status === "missing" && (
          <Alert className="mt-4" variant="warning">
            <AlertTitle>还没有分析结果</AlertTitle>
            <AlertDescription>
              项目已有数据，点右上角「开始分析」生成报告。
            </AlertDescription>
          </Alert>
        )}
        {freshness.status === "stale" && (
          <Alert className="mt-4" variant="warning">
            <AlertTitle>数据已更新，建议重新分析</AlertTitle>
            <AlertDescription>{freshness.reasonText}</AlertDescription>
          </Alert>
        )}
        {latestAnalysisRun?.error_message && (
          <Alert className="mt-4" variant="destructive">
            <AlertTitle>最近一次分析失败</AlertTitle>
            <AlertDescription>
              {latestAnalysisRun.error_message}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* ── Step content ── */}
      <div className="mx-auto max-w-7xl px-6 py-6 sm:px-8">
        {activeStep === "evidence" && <EvidenceStep {...props} />}
        {activeStep === "insight" && <InsightStep {...props} />}
        {activeStep === "strategy" && <StrategyStep {...props} />}
        {activeStep === "listing" && <ListingStep {...props} />}
        {activeStep === "images" && <ImagesStep {...props} />}
        {activeStep === "export" && <ExportStep {...props} />}
      </div>
    </div>
  );
}
