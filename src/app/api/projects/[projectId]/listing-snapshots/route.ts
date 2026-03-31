import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

type ListingSnapshotPayload = {
  analysisReportId?: string | null;
  titleDraft?: string;
  bulletDrafts?: string[];
  positioningStatement?: string;
  source?: string;
};

function sanitizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function sanitizeBulletDrafts(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 10);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => null)) as ListingSnapshotPayload | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const titleDraft = sanitizeText(body.titleDraft);
    const positioningStatement = sanitizeText(body.positioningStatement);
    const bulletDrafts = sanitizeBulletDrafts(body.bulletDrafts);

    if (!titleDraft && !positioningStatement && bulletDrafts.length === 0) {
      return NextResponse.json(
        { error: "请至少提供标题、定位句或 Bullet 内容后再保存快照。" },
        { status: 400 },
      );
    }

    const payload = {
      project_id: projectId,
      analysis_report_id:
        typeof body.analysisReportId === "string" && body.analysisReportId.length > 0
          ? body.analysisReportId
          : null,
      title_draft: titleDraft,
      bullet_drafts: bulletDrafts,
      positioning_statement: positioningStatement,
      source:
        typeof body.source === "string" && body.source.trim().length > 0
          ? body.source.trim()
          : "manual_lock",
    };

    const { data, error } = await supabase
      .from("listing_snapshots")
      .insert(payload)
      .select(
        "id, project_id, analysis_report_id, title_draft, bullet_drafts, positioning_statement, source, created_at",
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to save listing snapshot.");
    }

    return NextResponse.json({
      snapshot: {
        ...data,
        bullet_drafts: Array.isArray(data.bullet_drafts)
          ? data.bullet_drafts.filter((item): item is string => typeof item === "string")
          : [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存快照失败。" },
      { status: 500 },
    );
  }
}
