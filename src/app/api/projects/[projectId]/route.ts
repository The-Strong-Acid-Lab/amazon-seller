import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const supabase = createAdminSupabaseClient();

    const { error } = await supabase.from("projects").delete().eq("id", projectId);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, projectId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete project.",
      },
      { status: 400 },
    );
  }
}
