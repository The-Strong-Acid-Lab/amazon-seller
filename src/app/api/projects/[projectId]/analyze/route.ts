import { NextResponse } from "next/server";

import { generateAnalysisReportForProject } from "@/lib/analysis";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const result = await generateAnalysisReportForProject(projectId);

    return NextResponse.json({
      ok: true,
      runId: result.runId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze project.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
