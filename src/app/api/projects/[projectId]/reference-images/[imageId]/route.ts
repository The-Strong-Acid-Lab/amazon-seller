import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_REFERENCE_KINDS = new Set([
  "untyped",
  "hero_source",
  "structure_lock",
  "material_lock",
  "lifestyle_ref",
  "competitor_inspiration",
  "infographic_ignore",
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; imageId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId, imageId } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | { referenceKind?: string; pinnedForMain?: boolean }
      | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { data: imageRecord, error: imageError } = await supabase
      .from("product_reference_images")
      .select("id, project_id, project_product_id, role")
      .eq("id", imageId)
      .eq("project_id", projectId)
      .single();

    if (imageError || !imageRecord) {
      return NextResponse.json(
        { error: imageError?.message ?? "Reference image not found." },
        { status: 404 },
      );
    }

    const nextReferenceKind =
      typeof body.referenceKind === "string" ? body.referenceKind.trim() : undefined;
    const nextPinnedForMain =
      typeof body.pinnedForMain === "boolean" ? body.pinnedForMain : undefined;

    if (
      typeof nextReferenceKind !== "undefined" &&
      !ALLOWED_REFERENCE_KINDS.has(nextReferenceKind)
    ) {
      return NextResponse.json({ error: "Invalid reference kind." }, { status: 400 });
    }

    if (
      typeof nextPinnedForMain !== "undefined" &&
      nextPinnedForMain &&
      imageRecord.role !== "target"
    ) {
      return NextResponse.json(
        { error: "Only target product images can be pinned for the main image." },
        { status: 400 },
      );
    }

    if (nextPinnedForMain) {
      const { error: clearPinnedError } = await supabase
        .from("product_reference_images")
        .update({ pinned_for_main: false })
        .eq("project_id", projectId)
        .eq("project_product_id", imageRecord.project_product_id);

      if (clearPinnedError) {
        throw new Error(clearPinnedError.message);
      }
    }

    const updatePayload: Record<string, unknown> = {};

    if (typeof nextReferenceKind !== "undefined") {
      updatePayload.reference_kind = nextReferenceKind;
    }

    if (typeof nextPinnedForMain !== "undefined") {
      updatePayload.pinned_for_main = nextPinnedForMain;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No changes provided." }, { status: 400 });
    }

    const { data: updatedImage, error: updateError } = await supabase
      .from("product_reference_images")
      .update(updatePayload)
      .eq("id", imageId)
      .eq("project_id", projectId)
      .select(
        "id, project_id, project_product_id, role, file_name, file_hash, storage_bucket, storage_path, image_url, mime_type, size_bytes, reference_kind, pinned_for_main, created_at",
      )
      .single();

    if (updateError || !updatedImage) {
      throw new Error(updateError?.message ?? "Failed to update reference image.");
    }

    await supabase
      .from("product_identity_profiles")
      .update({
        status: "draft",
        reference_signature: "",
      })
      .eq("project_id", projectId);

    return NextResponse.json({ image: updatedImage });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update reference image.",
      },
      { status: 500 },
    );
  }
}

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
