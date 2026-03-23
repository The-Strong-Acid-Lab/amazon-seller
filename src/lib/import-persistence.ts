import type { ParsedImportResult } from "@/lib/review-import";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type PersistImportOptions = {
  projectName: string;
  targetProductName: string;
  targetProductAsin?: string;
  targetProductUrl?: string;
  targetMarket?: string;
  targetIsLaunched: boolean;
  reviewSourceRole: "target" | "competitor";
  reviewSourceName: string;
  reviewSourceAsin?: string;
  reviewSourceUrl?: string;
  reviewSourceMarket?: string;
};

type AppendImportOptions = {
  existingProjectId: string;
  targetProductId?: string;
  reviewSourceRole: "target" | "competitor";
  reviewSourceName?: string;
  reviewSourceAsin?: string;
  reviewSourceUrl?: string;
  reviewSourceMarket?: string;
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
      product_name: options.targetProductName,
      target_asin:
        options.targetProductAsin ??
        (options.reviewSourceRole === "target"
          ? options.reviewSourceAsin ?? parsed.reviews.find((review) => review.asin)?.asin ?? null
          : null),
      target_market:
        options.targetMarket ??
        options.reviewSourceMarket ??
        Object.keys(parsed.stats.countryDistribution)[0] ??
        "unknown",
      status: "ready",
    })
    .select("id")
    .single();

  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Failed to create project");
  }

  const { data: targetProduct, error: targetProductError } = await supabase
    .from("project_products")
    .insert({
      project_id: project.id,
      role: "target",
      name: options.targetProductName,
      asin: options.targetProductAsin ?? null,
      product_url: options.targetProductUrl ?? null,
      market: options.targetMarket ?? null,
      is_launched: options.targetIsLaunched,
    })
    .select("id")
    .single();

  if (targetProductError || !targetProduct) {
    throw new Error(targetProductError?.message ?? "Failed to create target product");
  }

  let reviewSourceProductId = targetProduct.id;

  if (options.reviewSourceRole === "competitor") {
    const { data: competitorProduct, error: competitorProductError } = await supabase
      .from("project_products")
      .insert({
        project_id: project.id,
        role: "competitor",
        name: options.reviewSourceName,
        asin:
          options.reviewSourceAsin ??
          parsed.reviews.find((review) => review.asin)?.asin ??
          null,
        product_url: options.reviewSourceUrl ?? null,
        market:
          options.reviewSourceMarket ??
          Object.keys(parsed.stats.countryDistribution)[0] ??
          null,
        is_launched: true,
      })
      .select("id")
      .single();

    if (competitorProductError || !competitorProduct) {
      throw new Error(
        competitorProductError?.message ?? "Failed to create competitor product",
      );
    }

    reviewSourceProductId = competitorProduct.id;
  }

  const persisted = await insertImportFileWithReviews({
    parsed,
    projectId: project.id,
    reviewSourceProductId,
  });

  return {
    projectId: project.id,
    targetProductId: targetProduct.id,
    reviewSourceProductId,
    ...persisted,
  };
}

export async function appendImportedReviewsToProject(
  parsed: ParsedImportResult,
  options: AppendImportOptions,
) {
  const supabase = createAdminSupabaseClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", options.existingProjectId)
    .single();

  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Project not found");
  }

  let targetProductId = options.targetProductId;

  if (!targetProductId) {
    const { data: targetProduct, error: targetProductError } = await supabase
      .from("project_products")
      .select("id")
      .eq("project_id", options.existingProjectId)
      .eq("role", "target")
      .limit(1)
      .single();

    if (targetProductError || !targetProduct) {
      throw new Error(targetProductError?.message ?? "Target product not found");
    }

    targetProductId = targetProduct.id;
  }

  if (!targetProductId) {
    throw new Error("Target product not found");
  }

  let reviewSourceProductId = targetProductId;

  if (options.reviewSourceRole === "competitor") {
    const competitorName = options.reviewSourceName?.trim();

    if (!competitorName) {
      throw new Error("Competitor name is required before importing.");
    }

    const { data: competitorProduct, error: competitorProductError } = await supabase
      .from("project_products")
      .insert({
        project_id: options.existingProjectId,
        role: "competitor",
        name: competitorName,
        asin:
          options.reviewSourceAsin ??
          parsed.reviews.find((review) => review.asin)?.asin ??
          null,
        product_url: options.reviewSourceUrl ?? null,
        market:
          options.reviewSourceMarket ??
          Object.keys(parsed.stats.countryDistribution)[0] ??
          null,
        is_launched: true,
      })
      .select("id")
      .single();

    if (competitorProductError || !competitorProduct) {
      throw new Error(
        competitorProductError?.message ?? "Failed to create competitor product",
      );
    }

    reviewSourceProductId = competitorProduct.id;
  }

  const persisted = await insertImportFileWithReviews({
    parsed,
    projectId: options.existingProjectId,
    reviewSourceProductId,
  });

  return {
    projectId: options.existingProjectId,
    targetProductId,
    reviewSourceProductId,
    ...persisted,
  };
}

async function insertImportFileWithReviews({
  parsed,
  projectId,
  reviewSourceProductId,
}: {
  parsed: ParsedImportResult;
  projectId: string;
  reviewSourceProductId: string;
}) {
  const supabase = createAdminSupabaseClient();

  const { data: importFile, error: importFileError } = await supabase
    .from("import_files")
    .insert({
      project_id: projectId,
      project_product_id: reviewSourceProductId,
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
        project_id: projectId,
        project_product_id: reviewSourceProductId,
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
    importFileId: importFile.id,
    importedReviews,
  };
}
