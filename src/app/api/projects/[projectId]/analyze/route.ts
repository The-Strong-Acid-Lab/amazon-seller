import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";

import { assertProjectOwnership, ProjectAccessError } from "@/lib/project-access";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { analyzeProjectTask } from "@/trigger/analyze-project-task";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId } = await context.params;
    await assertProjectOwnership(projectId);
    const body = (await request.json().catch(() => ({}))) as {
      provider?: "openai" | "gemini";
      modelName?: string;
    };
    const provider = body.provider === "gemini" ? "gemini" : "openai";
    const modelName =
      body.modelName?.trim() ||
      (provider === "gemini"
        ? process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash"
        : process.env.OPENAI_MODEL || "gpt-4.1-mini");

    const { data: activeRun, error: activeRunError } = await supabase
      .from("analysis_runs")
      .select("id, status, stage, progress")
      .eq("project_id", projectId)
      .eq("run_type", "voc_report")
      .in("status", ["queued", "running"])
      .limit(1)
      .maybeSingle();

    if (activeRunError) {
      throw new Error(activeRunError.message);
    }

    if (activeRun) {
      await supabase
        .from("projects")
        .update({
          status: "analyzing",
        })
        .eq("id", projectId);

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
      .from("analysis_runs")
      .insert({
        project_id: projectId,
        run_type: "voc_report",
        status: "queued",
        progress: 0,
        stage: "queued",
        model_name: modelName,
        started_at: null,
        completed_at: null,
        error_message: null,
      })
      .select("id, status")
      .single();

    if (runError || !run) {
      throw new Error(runError?.message ?? "Failed to create analysis run");
    }

    const { error: projectUpdateError } = await supabase
      .from("projects")
      .update({
        status: "analyzing",
      })
      .eq("id", projectId);

    if (projectUpdateError) {
      throw new Error(projectUpdateError.message);
    }

    if (!process.env.TRIGGER_SECRET_KEY) {
      throw new Error(
        "Missing TRIGGER_SECRET_KEY. Please configure Trigger.dev environment variables first.",
      );
    }

    try {
      await tasks.trigger<typeof analyzeProjectTask>("analyze-project", {
        projectId,
        runId: run.id,
        provider,
        modelName,
      });
    } catch (triggerError) {
      await supabase
        .from("analysis_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message:
            triggerError instanceof Error
              ? triggerError.message
              : "Failed to enqueue Trigger.dev task",
        })
        .eq("id", run.id);

      await supabase
        .from("projects")
        .update({
          status: "failed",
        })
        .eq("id", projectId);

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
    if (error instanceof ProjectAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to analyze project.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
