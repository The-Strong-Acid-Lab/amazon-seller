"use client";

import { APlusBriefCard } from "@/components/project-page/sections";

import { LockedStep, StepHeading } from "./step-primitives";
import type { ProjectWorkspaceShellProps } from "./types";

export function ExportStep(props: ProjectWorkspaceShellProps) {
  if (!props.report) return <LockedStep message="先完成分析才能导出报告。" />;
  return (
    <div className="grid gap-6">
      <StepHeading
        num="06"
        label="导出"
        sub="把决策报告交给团队、设计师，或直接粘贴到 Seller Central。"
      />
      <APlusBriefCard items={props.report.a_plus_brief} />
    </div>
  );
}
