import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string; imageId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId, imageId } = await context.params;

    const { data: imageRecord, error: imageError } = await supabase
      .from("product_reference_images")
      .select("id, project_id, storage_bucket, storage_path")
      .eq("id", imageId)
      .eq("project_id", projectId)
      .single();

    if (imageError || !imageRecord) {
      return NextResponse.json(
        { error: imageError?.message ?? "Reference image not found." },
        { status: 404 },
      );
    }

    if (imageRecord.storage_bucket && imageRecord.storage_path) {
      const { error: storageRemoveError } = await supabase.storage
        .from(imageRecord.storage_bucket)
        .remove([imageRecord.storage_path]);

      if (storageRemoveError) {
        throw new Error(storageRemoveError.message);
      }
    }

    const { error: deleteError } = await supabase
      .from("product_reference_images")
      .delete()
      .eq("id", imageId)
      .eq("project_id", projectId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    await supabase
      .from("product_identity_profiles")
      .update({
        status: "draft",
        reference_signature: "",
      })
      .eq("project_id", projectId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete reference image.",
      },
      { status: 500 },
    );
  }
}
