import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string; assetId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId, assetId } = await context.params;

    const { data: assetRecord, error: assetError } = await supabase
      .from("image_assets")
      .select("id, project_id, storage_bucket, storage_path")
      .eq("id", assetId)
      .eq("project_id", projectId)
      .single();

    if (assetError || !assetRecord) {
      return NextResponse.json(
        { error: assetError?.message ?? "Image asset not found." },
        { status: 404 },
      );
    }

    if (assetRecord.storage_bucket && assetRecord.storage_path) {
      const { error: storageRemoveError } = await supabase.storage
        .from(assetRecord.storage_bucket)
        .remove([assetRecord.storage_path]);

      if (storageRemoveError) {
        throw new Error(storageRemoveError.message);
      }
    }

    const { error: deleteError } = await supabase
      .from("image_assets")
      .delete()
      .eq("id", assetId)
      .eq("project_id", projectId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete image asset.",
      },
      { status: 500 },
    );
  }
}
