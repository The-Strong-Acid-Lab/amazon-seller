import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";

import { assertProjectOwnership, ProjectAccessError } from "@/lib/project-access";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { rebuildImageSlotPromptTask } from "@/trigger/rebuild-image-slot-prompt-task";

export const runtime = "nodejs";

const STALE_PROMPT_REBUILD_RUN_MS = 10 * 60 * 1000;

type RebuildPromptPayload = {
  slotKey?: string;
  slotTitle?: string;
  purpose?: string;
  conversionGoal?: string;
  recommendedOverlayCopy?: string;
  evidence?: string;
  visualDirection?: string;
  complianceNotes?: string;
  currentPrompt?: string;
  mainReferenceImageUrl?: string;
  slotReferenceImageUrl?: string;
  competitorImageUrls?: string[];
  language?: string;
  force?: boolean;
};

function sanitizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function isStaleRun(timestamp: string | null | undefined) {
  if (!timestamp) {
    return false;
  }

  const value = new Date(timestamp).getTime();

  if (Number.isNaN(value)) {
    return false;
  }

  return Date.now() - value > STALE_PROMPT_REBUILD_RUN_MS;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId } = await context.params;
    await assertProjectOwnership(projectId);
    const body = (await request.json().catch(() => null)) as RebuildPromptPayload | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const slotKey = sanitizeText(body.slotKey);
    const slotTitle = sanitizeText(body.slotTitle);
    const purpose = sanitizeText(body.purpose);
    const conversionGoal = sanitizeText(body.conversionGoal);
    const recommendedOverlayCopy = sanitizeText(body.recommendedOverlayCopy);
    const evidence = sanitizeText(body.evidence);
    const visualDirection = sanitizeText(body.visualDirection);
    const complianceNotes = sanitizeText(body.complianceNotes);
    const currentPrompt = sanitizeText(body.currentPrompt);
    const mainReferenceImageUrl = sanitizeText(body.mainReferenceImageUrl);
    const slotReferenceImageUrl = sanitizeText(body.slotReferenceImageUrl);
    const language = sanitizeText(body.language) || "zh-CN";
    const force = Boolean(body.force);

    if (!slotKey) {
      return NextResponse.json({ error: "slotKey is required." }, { status: 400 });
    }

    const { data: competitorImages } = await supabase
      .from("product_reference_images")
      .select("image_url")
      .eq("project_id", projectId)
      .eq("role", "competitor")
      .neq("reference_kind", "infographic_ignore")
      .order("created_at", { ascending: false })
      .limit(3);

    const competitorImageUrls = (competitorImages ?? [])
      .map((img: { image_url: string | null }) => img.image_url ?? "")
      .filter(Boolean);

    const { data: activeRun, error: activeRunError } = await supabase
      .from("prompt_rebuild_runs")
      .select("id, status, stage, progress, created_at, started_at")
      .eq("project_id", projectId)
      .eq("slot", slotKey)
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeRunError) {
      if (activeRunError.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "数据库结构尚未更新，请先执行 `supabase db push`（缺少 prompt_rebuild_runs）。",
          },
          { status: 500 },
        );
      }

      throw new Error(activeRunError.message);
    }

    if (
      activeRun &&
      !force &&
      !isStaleRun(activeRun.started_at ?? activeRun.created_at)
    ) {
      return NextResponse.json({
        ok: true,
        runId: activeRun.id,
        runStatus: activeRun.status,
        runStage: activeRun.stage,
        runProgress: activeRun.progress,
        deduplicated: true,
      });
    }

    if (activeRun) {
      await supabase
        .from("prompt_rebuild_runs")
        .update({
          status: "failed",
          stage: "failed",
          progress: 100,
          completed_at: new Date().toISOString(),
          error_message: force
            ? "已由用户手动终止这条卡住任务，并重新发起重建。"
            : "任务长时间未完成，系统已自动标记为失败，请重新重建。",
        })
        .eq("id", activeRun.id);
    }

    const { data: run, error: runError } = await supabase
      .from("prompt_rebuild_runs")
      .insert({
        project_id: projectId,
        slot: slotKey,
        status: "queued",
        stage: "queued",
        progress: 0,
        started_at: null,
        completed_at: null,
        error_message: null,
      })
      .select("id, status, stage, progress")
      .single();

    if (runError || !run) {
      if (runError?.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "数据库结构尚未更新，请先执行 `supabase db push`（缺少 prompt_rebuild_runs）。",
          },
          { status: 500 },
        );
      }

      throw new Error(runError?.message ?? "Failed to create prompt rebuild run.");
    }

    if (!process.env.TRIGGER_SECRET_KEY) {
      throw new Error(
        "Missing TRIGGER_SECRET_KEY. Please configure Trigger.dev environment variables first.",
      );
    }

    try {
      await tasks.trigger<typeof rebuildImageSlotPromptTask>("rebuild-image-slot-prompt", {
        projectId,
        runId: run.id,
        rebuild: {
          slotKey,
          slotTitle,
          purpose,
          conversionGoal,
          recommendedOverlayCopy,
          evidence,
          visualDirection,
          complianceNotes,
          currentPrompt,
          mainReferenceImageUrl,
          slotReferenceImageUrl,
          competitorImageUrls,
          language,
        },
      });
    } catch (triggerError) {
      await supabase
        .from("prompt_rebuild_runs")
        .update({
          status: "failed",
          stage: "failed",
          progress: 100,
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
      runStage: run.stage,
      runProgress: run.progress,
      deduplicated: false,
    });
  } catch (error) {
    if (error instanceof ProjectAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "重建提示词失败。",
      },
      { status: 400 },
    );
  }
}
