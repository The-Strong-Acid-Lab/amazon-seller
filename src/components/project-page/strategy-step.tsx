"use client";

import {
  formatExecutionArea,
  formatPriority,
  LabelSummaryCard,
  sortVocResponseItems,
  StringListCard,
} from "@/components/project-page/sections";
import { Badge } from "@/components/ui/badge";

import { LockedStep, StepHeading } from "./step-primitives";
import type { ProjectWorkspaceShellProps } from "./types";

export function StrategyStep({ report }: ProjectWorkspaceShellProps) {
  if (!report)
    return (
      <LockedStep message="先完成「证据」步骤并运行分析，才能查看策略。" />
    );
  const sorted = sortVocResponseItems(report.voc_response_matrix);
  return (
    <div className="grid gap-6">
      <StepHeading
        num="03"
        label="策略"
        sub="VOC 与竞品定位交叉，找到可认领的角度。"
      />

      {sorted.length > 0 && (
        <div className="rounded-xl border border-[var(--page-border)] bg-white">
          <div className="border-b border-[var(--page-border)] px-5 py-4">
            <h3 className="text-sm font-semibold text-stone-900">
              VOC × 响应矩阵
            </h3>
            <p className="mt-0.5 text-xs text-stone-400">
              按优先级排序 · 先做 P1
            </p>
          </div>
          <div className="divide-y divide-[var(--page-border)]">
            {sorted.map((item) => (
              <div
                key={`${item.voc_theme}-${item.buyer_signal}`}
                className="px-5 py-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="rounded-full font-mono text-[10px]"
                    variant={item.priority === "p1" ? "default" : "outline"}
                  >
                    {formatPriority(item.priority)}
                  </Badge>
                  <Badge
                    className="rounded-full font-mono text-[10px]"
                    variant="secondary"
                  >
                    {formatExecutionArea(item.execution_area)}
                  </Badge>
                  <Badge
                    className="rounded-full font-mono text-[10px]"
                    variant="outline"
                  >
                    {item.voc_theme}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-1.5 text-sm">
                  <p className="text-stone-700">
                    <span className="font-medium text-stone-900">
                      买家信号:{" "}
                    </span>
                    {item.buyer_signal}
                  </p>
                  {item.why_now && (
                    <p className="text-stone-700">
                      <span className="font-medium text-stone-900">
                        为什么现在:{" "}
                      </span>
                      {item.why_now}
                    </p>
                  )}
                  <p className="text-stone-700">
                    <span className="font-medium text-stone-900">
                      Listing 响应:{" "}
                    </span>
                    {item.recommended_listing_response}
                  </p>
                  <p className="text-stone-700">
                    <span className="font-medium text-stone-900">
                      图片响应:{" "}
                    </span>
                    {item.recommended_image_response}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <LabelSummaryCard
          title="定位机会"
          items={report.comparison_opportunities}
        />
        <LabelSummaryCard title="定位风险" items={report.comparison_risks} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <LabelSummaryCard
          title="Baseline（基线）"
          items={report.baseline_requirements}
        />
        <LabelSummaryCard
          title="Performance（性能）"
          items={report.performance_levers}
        />
        <LabelSummaryCard
          title="Differentiator（差异化）"
          items={report.differentiators}
        />
      </div>

      {report.copy_strategy && (
        <StringListCard
          title="文案策略"
          lists={[
            {
              label: "Title angles",
              items: report.copy_strategy.title_angles ?? [],
            },
            {
              label: "Bullet angles",
              items: report.copy_strategy.bullet_angles ?? [],
            },
            {
              label: "Proof phrases",
              items: report.copy_strategy.proof_phrases ?? [],
            },
          ]}
        />
      )}
    </div>
  );
}
