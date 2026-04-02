import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string; assetId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId, assetId } = await context.params;
    const { data: asset, error: assetError } = await supabase
      .from("image_assets")
      .select("id, project_id, slot")
      .eq("id", assetId)
      .eq("project_id", projectId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json(
        { error: assetError?.message ?? "Image asset not found." },
        { status: 404 },
      );
    }

    const { error: clearError } = await supabase
      .from("image_assets")
      .update({ is_kept: false })
      .eq("project_id", projectId)
      .eq("slot", asset.slot);

    if (clearError) {
      throw new Error(clearError.message);
    }

    const { data: updated, error: keepError } = await supabase
      .from("image_assets")
      .update({ is_kept: true })
      .eq("id", assetId)
      .eq("project_id", projectId)
      .select(
        "id, project_id, slot, goal, message, supporting_proof, visual_direction, prompt_zh, prompt_en, model_name, status, storage_bucket, storage_path, image_url, width, height, error_message, is_kept, version, created_at, updated_at",
      )
      .single();

    if (keepError || !updated) {
      throw new Error(keepError?.message ?? "Failed to keep image asset.");
    }

    return NextResponse.json({ asset: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to keep image asset.",
      },
      { status: 500 },
    );
  }
}
