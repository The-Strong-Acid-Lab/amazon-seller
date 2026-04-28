"use client";

import { ImageBriefWorkbench } from "@/components/image-brief-workbench";

import { LockedStep, StepHeading } from "./step-primitives";
import type { ProjectWorkspaceShellProps } from "./types";

export function ImagesStep(props: ProjectWorkspaceShellProps) {
  if (!props.report)
    return <LockedStep message="先运行分析才能进入图片规划。" />;
  return (
    <div className="grid gap-6">
      <StepHeading
        num="05"
        label="图片"
        sub="主图 + 7 张辅图，每个 slot 对应一个买家顾虑或卖点。"
      />
      <ImageBriefWorkbench
        assets={props.imageAssets}
        brief={props.report.image_brief}
        competitorProducts={props.competitorProducts.map((p) => ({
          id: p.id,
          name: p.name,
        }))}
        defaultImageModel={props.defaultImageModel}
        defaultImageProvider={props.defaultImageProvider}
        generationRuns={props.imageGenerationRuns}
        promptRebuildRuns={props.promptRebuildRuns}
        projectId={props.project.id}
        referenceImages={props.referenceImages}
        savedSlots={props.imageStrategySlots}
        strategy={props.report.image_strategy}
        targetProduct={
          props.targetProduct
            ? { id: props.targetProduct.id, name: props.targetProduct.name }
            : null
        }
      />
    </div>
  );
}
