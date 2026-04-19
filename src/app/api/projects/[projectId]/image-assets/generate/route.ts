import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";

import {
  getConfiguredImageModelName,
  getImageGenerationProvider,
} from "@/lib/image-generation-provider";
import { assertProjectOwnership, ProjectAccessError } from "@/lib/project-access";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { generateImageSlotTask } from "@/trigger/generate-image-slot-task";

export const runtime = "nodejs";

const STALE_IMAGE_GENERATION_RUN_MS = 20 * 60 * 1000;

type GenerateImagePayload = {
  slot?: string;
  goal?: string;
  message?: string;
  supportingProof?: string;
  recommendedOverlayCopy?: string;
  visualDirection?: string;
  complianceNotes?: string;
  promptOverride?: string;
  promptDelta?: string;
  baseAssetId?: string;
  imageProvider?: "openai" | "gemini";
  imageModel?: string;
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

  return Date.now() - value > STALE_IMAGE_GENERATION_RUN_MS;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId } = await context.params;
    await assertProjectOwnership(projectId);
    const body = (await request.json().catch(() => null)) as GenerateImagePayload | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const slot = sanitizeText(body.slot);
    const goal = sanitizeText(body.goal);
    const message = sanitizeText(body.message);
    const supportingProof = sanitizeText(body.supportingProof);
    const recommendedOverlayCopy = sanitizeText(body.recommendedOverlayCopy);
    const visualDirection = sanitizeText(body.visualDirection);
    const complianceNotes = sanitizeText(body.complianceNotes);
    const promptOverride = sanitizeText(body.promptOverride);
    const promptDelta = sanitizeText(body.promptDelta);
    const baseAssetId = sanitizeText(body.baseAssetId);
    const imageProvider =
      body.imageProvider === "gemini" || body.imageProvider === "openai"
        ? body.imageProvider
        : getImageGenerationProvider();
    const imageModel = sanitizeText(body.imageModel) || getConfiguredImageModelName();
    const force = Boolean(body.force);

    if (!slot) {
      return NextResponse.json({ error: "Slot is required." }, { status: 400 });
    }

    const { data: activeRun, error: activeRunError } = await supabase
      .from("image_generation_runs")
      .select("id, status, stage, progress, created_at, started_at")
      .eq("project_id", projectId)
      .eq("slot", slot)
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeRunError) {
      if (activeRunError.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "数据库结构尚未更新，请先执行 `supabase db push`（缺少 image_generation_runs）。",
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
        .from("image_generation_runs")
        .update({
          status: "failed",
          stage: "failed",
          progress: 100,
          completed_at: new Date().toISOString(),
          error_message: force
            ? "已由用户手动终止这条卡住任务，并重新发起生成。"
            : "任务长时间未完成，系统已自动标记为失败，请重新生成。",
        })
        .eq("id", activeRun.id);
    }

    const { data: run, error: runError } = await supabase
      .from("image_generation_runs")
      .insert({
        project_id: projectId,
        slot,
        status: "queued",
        stage: "queued",
        progress: 0,
        model_name: imageModel,
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
              "数据库结构尚未更新，请先执行 `supabase db push`（缺少 image_generation_runs）。",
          },
          { status: 500 },
        );
      }

      throw new Error(runError?.message ?? "Failed to create image generation run.");
    }

    if (!process.env.TRIGGER_SECRET_KEY) {
      throw new Error(
        "Missing TRIGGER_SECRET_KEY. Please configure Trigger.dev environment variables first.",
      );
    }

    try {
      await tasks.trigger<typeof generateImageSlotTask>("generate-image-slot", {
        projectId,
        runId: run.id,
        generation: {
          slot,
          goal,
          message,
          supportingProof,
          recommendedOverlayCopy,
          visualDirection,
          complianceNotes,
          promptOverride,
          promptDelta,
          baseAssetId,
          imageProvider,
          imageModel,
        },
      });
    } catch (triggerError) {
      await supabase
        .from("image_generation_runs")
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

    console.error("Image generation failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to enqueue image generation.",
      },
      { status: 400 },
    );
  }
}
