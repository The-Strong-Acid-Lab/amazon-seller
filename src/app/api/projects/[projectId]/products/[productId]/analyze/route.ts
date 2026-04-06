import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";

import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { generateCompetitorInsightTask } from "@/trigger/generate-competitor-insight-task";

const INSIGHT_TYPE = "competitor_overview";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; productId: string }> },
) {
  try {
    const { projectId, productId } = await params;
    const supabase = createAdminSupabaseClient();

    const [
      { data, error },
      { data: latestRun, error: latestRunError },
    ] = await Promise.all([
      supabase
        .from("project_product_insights")
        .select("content_json, updated_at")
        .eq("project_id", projectId)
        .eq("project_product_id", productId)
        .eq("insight_type", INSIGHT_TYPE)
        .maybeSingle(),
      supabase
        .from("competitor_insight_runs")
        .select(
          "id, status, stage, progress, model_name, error_message, started_at, completed_at, created_at, updated_at",
        )
        .eq("project_id", projectId)
        .eq("project_product_id", productId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (latestRunError && latestRunError.code !== "42P01") {
      return NextResponse.json({ error: latestRunError.message }, { status: 500 });
    }

    return NextResponse.json({
      insight: data?.content_json ?? null,
      updatedAt: data?.updated_at ?? null,
      run: latestRun ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load competitor insight.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; productId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId, productId } = await params;

    const { data: activeRun, error: activeRunError } = await supabase
      .from("competitor_insight_runs")
      .select("id, status, stage, progress")
      .eq("project_id", projectId)
      .eq("project_product_id", productId)
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeRunError) {
      if (activeRunError.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "数据库结构尚未更新，请先执行 `supabase db push`（缺少 competitor_insight_runs）。",
          },
          { status: 500 },
        );
      }

      throw new Error(activeRunError.message);
    }

    if (activeRun) {
      return NextResponse.json({
        ok: true,
        runId: activeRun.id,
        runStatus: activeRun.status,
        runStage: activeRun.stage,
        runProgress: activeRun.progress,
        deduplicated: true,
      });
    }

    const { data: run, error: runError } = await supabase
      .from("competitor_insight_runs")
      .insert({
        project_id: projectId,
        project_product_id: productId,
        status: "queued",
        stage: "queued",
        progress: 0,
        model_name: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        started_at: null,
        completed_at: null,
        error_message: null,
      })
      .select("id, status")
      .single();

    if (runError || !run) {
      throw new Error(runError?.message ?? "Failed to create competitor insight run");
    }

    if (!process.env.TRIGGER_SECRET_KEY) {
      throw new Error(
        "Missing TRIGGER_SECRET_KEY. Please configure Trigger.dev environment variables first.",
      );
    }

    try {
      await tasks.trigger<typeof generateCompetitorInsightTask>(
        "generate-competitor-insight",
        {
          projectId,
          productId,
          runId: run.id,
        },
      );
    } catch (triggerError) {
      await supabase
        .from("competitor_insight_runs")
        .update({
          status: "failed",
          stage: "failed",
          completed_at: new Date().toISOString(),
          error_message:
            triggerError instanceof Error
              ? triggerError.message
              : "Failed to enqueue Trigger.dev task",
        })
        .eq("id", run.id);

      throw triggerError;
    }

    return NextResponse.json({
      ok: true,
      runId: run.id,
      runStatus: run.status,
      runStage: "queued",
      runProgress: 0,
      deduplicated: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to analyze competitor.",
      },
      { status: 400 },
    );
  }
}
