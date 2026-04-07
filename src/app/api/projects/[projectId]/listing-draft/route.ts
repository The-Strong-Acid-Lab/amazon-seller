import { NextResponse } from "next/server";

import { regenerateListingDraftForProject } from "@/lib/analysis";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const result = await regenerateListingDraftForProject(projectId);

    return NextResponse.json({
      ok: true,
      reportId: result.reportId,
      listingDraft: result.listingDraft,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "重新生成 Listing 文案失败。",
      },
      { status: 400 },
    );
  }
}
