"use client";

import {
  InsightListCard,
  LabelSummaryCard,
  OverviewCard,
  PersonaCard,
} from "@/components/project-page/sections";

import { LockedStep, StepHeading } from "./step-primitives";
import type { ProjectWorkspaceShellProps } from "./types";

export function InsightStep({ report }: ProjectWorkspaceShellProps) {
  if (!report)
    return (
      <LockedStep message="先完成「证据」步骤并运行分析，才能查看洞察。" />
    );
  return (
    <div className="grid gap-6">
      <StepHeading
        num="02"
        label="洞察"
        sub="主题、欲望、顾虑——买家真实在说什么。"
      />

      {(report.target_overview || report.competitor_overview) && (
        <div className="grid gap-4 xl:grid-cols-2">
          <OverviewCard
            title="我的商品评论概览"
            overview={report.target_overview}
          />
          <OverviewCard
            title="竞品评论概览"
            overview={report.competitor_overview}
          />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <InsightListCard
          title="我的商品正向主题"
          description={
            (report.target_overview?.review_count ?? 0) > 0
              ? "买家对我们商品的真实认可点。"
              : "当前没有我的商品评论。"
          }
          emptyLabel="当前没有我的商品评论。"
          items={report.target_positive_themes}
        />
        <InsightListCard
          title="我的商品负向主题"
          description={
            (report.target_overview?.review_count ?? 0) > 0
              ? "最影响转化的负面反馈。"
              : "当前没有我的商品评论。"
          }
          emptyLabel="当前没有我的商品评论。"
          items={report.target_negative_themes}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InsightListCard
          title="竞品正向主题"
          description="竞品被买家认可的价值点——代表类目主流期待。"
          items={report.competitor_positive_themes}
        />
        <InsightListCard
          title="竞品负向主题"
          description="竞品的负面反馈往往是我们可以切入的机会。"
          items={report.competitor_negative_themes}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <LabelSummaryCard title="买家想要什么" items={report.buyer_desires} />
        <LabelSummaryCard
          title="买家担心什么"
          items={report.buyer_objections}
        />
        <LabelSummaryCard title="使用场景" items={report.usage_scenarios} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        <LabelSummaryCard title="Where" items={report.usage_where} />
        <LabelSummaryCard title="When" items={report.usage_when} />
        <LabelSummaryCard title="How" items={report.usage_how} />
        <LabelSummaryCard title="What" items={report.product_what} />
      </div>

      {report.user_personas.length > 0 && (
        <PersonaCard items={report.user_personas} />
      )}
    </div>
  );
}
