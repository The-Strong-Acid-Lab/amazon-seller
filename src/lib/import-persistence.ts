import type { ParsedImportResult } from "@/lib/review-import";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type PersistImportOptions = {
  projectName: string;
};

export async function persistImportedReviews(
  parsed: ParsedImportResult,
  options: PersistImportOptions,
) {
  const supabase = createAdminSupabaseClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: options.projectName,
      target_asin: parsed.reviews.find((review) => review.asin)?.asin ?? null,
      target_market:
        Object.keys(parsed.stats.countryDistribution)[0] ?? "unknown",
      status: "ready",
    })
    .select("id")
    .single();

  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Failed to create project");
  }

  const { data: importFile, error: importFileError } = await supabase
    .from("import_files")
    .insert({
      project_id: project.id,
      file_name: parsed.fileName,
      file_type: parsed.fileType,
      source_kind: "review_export",
      sheet_name: parsed.selectedSheet,
      import_status: "normalized",
      row_count: parsed.reviews.length,
    })
    .select("id")
    .single();

  if (importFileError || !importFile) {
    throw new Error(importFileError?.message ?? "Failed to create import file");
  }

  let importedReviews = 0;

  for (const review of parsed.reviews) {
    const { data: insertedReview, error: reviewError } = await supabase
      .from("reviews")
      .insert({
        project_id: project.id,
        import_file_id: importFile.id,
        asin: review.asin || null,
        model: review.model || null,
        review_title: review.reviewTitle,
        review_body: review.reviewBody,
        rating: review.rating,
        review_date: review.reviewDate || null,
        country: review.country || null,
        is_verified_purchase: review.isVerifiedPurchase,
        is_vine: review.isVine,
        helpful_count: review.helpfulCount,
        image_count: review.imageCount,
        has_video: review.hasVideo,
        review_url: review.reviewUrl || null,
        reviewer_name: review.reviewerName || null,
        reviewer_profile_url: null,
        influencer_program_url: null,
        raw_row_json: review.rawRow,
      })
      .select("id")
      .single();

    if (reviewError || !insertedReview) {
      throw new Error(reviewError?.message ?? "Failed to insert review row");
    }

    importedReviews += 1;

    const mediaRows = [
      ...review.imageUrls.map((url, index) => ({
        review_id: insertedReview.id,
        media_type: "image" as const,
        url,
        position: index,
      })),
      ...review.videoUrls.map((url, index) => ({
        review_id: insertedReview.id,
        media_type: "video" as const,
        url,
        position: index,
      })),
    ];

    if (mediaRows.length > 0) {
      const { error: mediaError } = await supabase
        .from("review_media")
        .insert(mediaRows);

      if (mediaError) {
        throw new Error(mediaError.message);
      }
    }
  }

  return {
    projectId: project.id,
    importFileId: importFile.id,
    importedReviews,
  };
}
