"use client";

import { ListingDeliverableCard } from "@/components/listing-deliverable-card";

import { LockedStep, StepHeading } from "./step-primitives";
import type { ProjectWorkspaceShellProps } from "./types";

export function ListingStep(props: ProjectWorkspaceShellProps) {
  if (!props.report)
    return <LockedStep message="先运行分析才能生成 Listing 草稿。" />;
  return (
    <div className="grid gap-6">
      <StepHeading
        num="04"
        label="Listing"
        sub="基于评论生成的标题与 bullet 草案，可逐条采纳或修改。"
      />
      <ListingDeliverableCard
        analysisReportId={props.reportId}
        analysisFreshness={{
          status: props.freshness.status,
          reasonText: props.freshness.reasonText,
        }}
        initialDraft={props.report.listing_draft}
        projectId={props.project.id}
        snapshots={props.listingSnapshots}
      />
    </div>
  );
}
