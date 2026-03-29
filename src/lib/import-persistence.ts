import { createHash } from "node:crypto";

import type { ParsedImportResult } from "@/lib/review-import";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type PersistImportOptions = {
  projectName: string;
  targetProductName?: string;
  targetProductAsin?: string;
  targetProductUrl?: string;
  targetMarket?: string;
  targetIsLaunched: boolean;
  reviewSourceRole: "target" | "competitor";
  reviewSourceName: string;
  reviewSourceAsin?: string;
  reviewSourceUrl?: string;
  reviewSourceMarket?: string;
  selectedReviewSourceId?: string;
  presetCompetitors?: Array<{
    localId?: string;
    name?: string;
    asin?: string;
    url?: string;
    market?: string;
  }>;
};

type AppendImportOptions = {
  existingProjectId: string;
  targetProductId?: string;
  reviewSourceProductId?: string;
  reviewSourceRole: "target" | "competitor";
  reviewSourceName?: string;
  reviewSourceAsin?: string;
  reviewSourceUrl?: string;
  reviewSourceMarket?: string;
};

type UploadPresetCompetitor = {
  localId?: string;
  name?: string;
  asin?: string;
  url?: string;
  market?: string;
};

type PersistUploadOptions = {
  projectName: string;
  targetProductName?: string;
  targetProductAsin?: string;
  targetProductUrl?: string;
  targetMarket?: string;
  targetIsLaunched: boolean;
  reviewSourceRole: "target" | "competitor";
  reviewSourceName: string;
  reviewSourceAsin?: string;
  reviewSourceUrl?: string;
  reviewSourceMarket?: string;
  selectedReviewSourceId?: string;
  presetCompetitors?: UploadPresetCompetitor[];
  fileName: string;
  fileType: string;
  fileBuffer: Buffer;
  fileMimeType?: string;
};

type AppendUploadOptions = {
  existingProjectId: string;
  targetProductId?: string;
  reviewSourceProductId?: string;
  reviewSourceRole: "target" | "competitor";
  reviewSourceName?: string;
  reviewSourceAsin?: string;
  reviewSourceUrl?: string;
  reviewSourceMarket?: string;
  fileName: string;
  fileType: string;
  fileBuffer: Buffer;
  fileMimeType?: string;
};

export async function persistImportedReviews(
  parsed: ParsedImportResult,
  options: PersistImportOptions,
) {
  const supabase = createAdminSupabaseClient();
  const resolvedTargetName =
    options.targetProductName?.trim() ||
    options.projectName ||
    "未命名我的商品";
  const resolvedTargetMarket =
    options.targetMarket ??
    options.reviewSourceMarket ??
    Object.keys(parsed.stats.countryDistribution)[0] ??
    "US";

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: options.projectName,
      product_name: resolvedTargetName,
      target_asin:
        options.targetProductAsin ??
        (options.reviewSourceRole === "target"
          ? (options.reviewSourceAsin ??
            parsed.reviews.find((review) => review.asin)?.asin ??
            null)
          : null),
      target_market: resolvedTargetMarket,
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
      name: resolvedTargetName,
      asin: options.targetProductAsin ?? null,
      product_url: options.targetProductUrl ?? null,
      market: resolvedTargetMarket,
      is_launched: options.targetIsLaunched,
    })
    .select("id")
    .single();

  if (targetProductError || !targetProduct) {
    throw new Error(
      targetProductError?.message ?? "Failed to create target product",
    );
  }

  const presetCompetitors = (options.presetCompetitors ?? [])
    .map((item) => ({
      localId: item.localId?.trim() ?? "",
      name: item.name?.trim() ?? "",
      asin: item.asin?.trim() ?? "",
      url: item.url?.trim() ?? "",
      market: item.market?.trim() ?? "",
    }))
    .filter((item) => item.name || item.asin || item.url || item.market);

  const sourceProductIdByRef = new Map<string, string>();
  sourceProductIdByRef.set("target", targetProduct.id);
  const createdCompetitors: Array<{
    id: string;
    name: string;
    asin: string;
    url: string;
  }> = [];

  if (presetCompetitors.length > 0) {
    for (const competitor of presetCompetitors) {
      const { data: createdCompetitor, error: competitorError } = await supabase
        .from("project_products")
        .insert({
          project_id: project.id,
          role: "competitor",
          name: competitor.name || "未命名竞品",
          asin: competitor.asin || null,
          product_url: competitor.url || null,
          market: competitor.market || null,
          is_launched: true,
        })
        .select("id")
        .single();

      if (competitorError || !createdCompetitor) {
        throw new Error(
          competitorError?.message ?? "Failed to create competitor product",
        );
      }

      if (competitor.localId) {
        sourceProductIdByRef.set(competitor.localId, createdCompetitor.id);
      }

      createdCompetitors.push({
        id: createdCompetitor.id,
        name: competitor.name,
        asin: competitor.asin,
        url: competitor.url,
      });
    }
  }

  let reviewSourceProductId = targetProduct.id;
  const selectedSourceRef = options.selectedReviewSourceId?.trim();

  if (selectedSourceRef && sourceProductIdByRef.has(selectedSourceRef)) {
    reviewSourceProductId = sourceProductIdByRef.get(selectedSourceRef)!;
  } else if (options.reviewSourceRole === "competitor") {
    const desiredName = options.reviewSourceName?.trim() ?? "";
    const desiredAsin = options.reviewSourceAsin?.trim() ?? "";
    const desiredUrl = options.reviewSourceUrl?.trim() ?? "";

    const existingCompetitor =
      createdCompetitors.find(
        (item) => Boolean(desiredAsin) && item.asin === desiredAsin,
      ) ??
      createdCompetitors.find(
        (item) => Boolean(desiredName) && item.name === desiredName,
      ) ??
      createdCompetitors.find(
        (item) => Boolean(desiredUrl) && item.url === desiredUrl,
      );

    if (existingCompetitor) {
      reviewSourceProductId = existingCompetitor.id;
    } else {
      const { data: competitorProduct, error: competitorProductError } =
        await supabase
          .from("project_products")
          .insert({
            project_id: project.id,
            role: "competitor",
            name: options.reviewSourceName || "未命名竞品",
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
          competitorProductError?.message ??
            "Failed to create competitor product",
        );
      }

      reviewSourceProductId = competitorProduct.id;
    }
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
      throw new Error(
        targetProductError?.message ?? "Target product not found",
      );
    }

    targetProductId = targetProduct.id;
  }

  if (!targetProductId) {
    throw new Error("Target product not found");
  }

  let reviewSourceProductId = targetProductId;

  if (options.reviewSourceProductId) {
    const { data: sourceProduct, error: sourceProductError } = await supabase
      .from("project_products")
      .select("id")
      .eq("project_id", options.existingProjectId)
      .eq("id", options.reviewSourceProductId)
      .single();

    if (sourceProductError || !sourceProduct) {
      throw new Error(
        sourceProductError?.message ?? "Review source product not found",
      );
    }

    reviewSourceProductId = sourceProduct.id;
  } else if (options.reviewSourceRole === "competitor") {
    const competitorName = options.reviewSourceName?.trim();

    if (!competitorName) {
      throw new Error("Competitor name is required before importing.");
    }

    const { data: competitorProduct, error: competitorProductError } =
      await supabase
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
        competitorProductError?.message ??
          "Failed to create competitor product",
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

export async function persistUploadedReviewFile(options: PersistUploadOptions) {
  const supabase = createAdminSupabaseClient();
  const resolvedTargetName =
    options.targetProductName?.trim() ||
    options.projectName ||
    "未命名我的商品";
  const resolvedTargetMarket =
    options.targetMarket?.trim() || options.reviewSourceMarket?.trim() || "US";

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: options.projectName,
      product_name: resolvedTargetName,
      target_asin:
        options.targetProductAsin?.trim() ||
        (options.reviewSourceRole === "target"
          ? options.reviewSourceAsin?.trim() || null
          : null),
      target_market: resolvedTargetMarket,
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
      name: resolvedTargetName,
      asin: options.targetProductAsin?.trim() || null,
      product_url: options.targetProductUrl?.trim() || null,
      market: resolvedTargetMarket,
      is_launched: options.targetIsLaunched,
    })
    .select("id")
    .single();

  if (targetProductError || !targetProduct) {
    throw new Error(
      targetProductError?.message ?? "Failed to create target product",
    );
  }

  const presetCompetitors = normalizePresetCompetitors(
    options.presetCompetitors,
  );
  const sourceProductIdByRef = new Map<string, string>();
  sourceProductIdByRef.set("target", targetProduct.id);
  const createdCompetitors: Array<{
    id: string;
    name: string;
    asin: string;
    url: string;
  }> = [];

  for (const competitor of presetCompetitors) {
    const { data: createdCompetitor, error: competitorError } = await supabase
      .from("project_products")
      .insert({
        project_id: project.id,
        role: "competitor",
        name: competitor.name || "未命名竞品",
        asin: competitor.asin || null,
        product_url: competitor.url || null,
        market: competitor.market || null,
        is_launched: true,
      })
      .select("id")
      .single();

    if (competitorError || !createdCompetitor) {
      throw new Error(
        competitorError?.message ?? "Failed to create competitor product",
      );
    }

    if (competitor.localId) {
      sourceProductIdByRef.set(competitor.localId, createdCompetitor.id);
    }

    createdCompetitors.push({
      id: createdCompetitor.id,
      name: competitor.name,
      asin: competitor.asin,
      url: competitor.url,
    });
  }

  let reviewSourceProductId = targetProduct.id;
  const selectedSourceRef = options.selectedReviewSourceId?.trim();

  if (selectedSourceRef && sourceProductIdByRef.has(selectedSourceRef)) {
    reviewSourceProductId = sourceProductIdByRef.get(selectedSourceRef)!;
  } else if (options.reviewSourceRole === "competitor") {
    const desiredName = options.reviewSourceName?.trim() ?? "";
    const desiredAsin = options.reviewSourceAsin?.trim() ?? "";
    const desiredUrl = options.reviewSourceUrl?.trim() ?? "";

    const existingCompetitor =
      createdCompetitors.find(
        (item) => Boolean(desiredAsin) && item.asin === desiredAsin,
      ) ??
      createdCompetitors.find(
        (item) => Boolean(desiredName) && item.name === desiredName,
      ) ??
      createdCompetitors.find(
        (item) => Boolean(desiredUrl) && item.url === desiredUrl,
      );

    if (existingCompetitor) {
      reviewSourceProductId = existingCompetitor.id;
    } else {
      const { data: competitorProduct, error: competitorProductError } =
        await supabase
          .from("project_products")
          .insert({
            project_id: project.id,
            role: "competitor",
            name: options.reviewSourceName || "未命名竞品",
            asin: options.reviewSourceAsin?.trim() || null,
            product_url: options.reviewSourceUrl?.trim() || null,
            market: options.reviewSourceMarket?.trim() || null,
            is_launched: true,
          })
          .select("id")
          .single();

      if (competitorProductError || !competitorProduct) {
        throw new Error(
          competitorProductError?.message ??
            "Failed to create competitor product",
        );
      }

      reviewSourceProductId = competitorProduct.id;
    }
  }

  const uploaded = await insertUploadedImportFile({
    projectId: project.id,
    reviewSourceProductId,
    fileName: options.fileName,
    fileType: options.fileType,
    fileBuffer: options.fileBuffer,
    fileMimeType: options.fileMimeType,
  });

  return {
    projectId: project.id,
    targetProductId: targetProduct.id,
    reviewSourceProductId,
    ...uploaded,
  };
}

export async function appendUploadedReviewFileToProject(
  options: AppendUploadOptions,
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
      throw new Error(
        targetProductError?.message ?? "Target product not found",
      );
    }

    targetProductId = targetProduct.id;
  }

  if (!targetProductId) {
    throw new Error("Target product not found");
  }

  let reviewSourceProductId = targetProductId;

  if (options.reviewSourceProductId) {
    const { data: sourceProduct, error: sourceProductError } = await supabase
      .from("project_products")
      .select("id")
      .eq("project_id", options.existingProjectId)
      .eq("id", options.reviewSourceProductId)
      .single();

    if (sourceProductError || !sourceProduct) {
      throw new Error(
        sourceProductError?.message ?? "Review source product not found",
      );
    }

    reviewSourceProductId = sourceProduct.id;
  } else if (options.reviewSourceRole === "competitor") {
    const competitorName = options.reviewSourceName?.trim();
    const competitorAsin = options.reviewSourceAsin?.trim() ?? "";
    const competitorUrl = options.reviewSourceUrl?.trim() ?? "";

    if (!competitorName) {
      throw new Error("Competitor name is required before uploading.");
    }

    const { data: existingCompetitors, error: existingCompetitorsError } =
      await supabase
        .from("project_products")
        .select("id, name, asin, product_url")
        .eq("project_id", options.existingProjectId)
        .eq("role", "competitor");

    if (existingCompetitorsError) {
      throw new Error(existingCompetitorsError.message);
    }

    const matchedCompetitor =
      (existingCompetitors ?? []).find(
        (item) => Boolean(competitorAsin) && item.asin === competitorAsin,
      ) ??
      (existingCompetitors ?? []).find(
        (item) => Boolean(competitorName) && item.name === competitorName,
      ) ??
      (existingCompetitors ?? []).find(
        (item) => Boolean(competitorUrl) && item.product_url === competitorUrl,
      );

    if (matchedCompetitor) {
      reviewSourceProductId = matchedCompetitor.id;
    } else {
      const { data: competitorProduct, error: competitorProductError } =
        await supabase
          .from("project_products")
          .insert({
            project_id: options.existingProjectId,
            role: "competitor",
            name: competitorName,
            asin: competitorAsin || null,
            product_url: competitorUrl || null,
            market: options.reviewSourceMarket?.trim() || null,
            is_launched: true,
          })
          .select("id")
          .single();

      if (competitorProductError || !competitorProduct) {
        throw new Error(
          competitorProductError?.message ??
            "Failed to create competitor product",
        );
      }

      reviewSourceProductId = competitorProduct.id;
    }
  }

  const uploaded = await insertUploadedImportFile({
    projectId: options.existingProjectId,
    reviewSourceProductId,
    fileName: options.fileName,
    fileType: options.fileType,
    fileBuffer: options.fileBuffer,
    fileMimeType: options.fileMimeType,
  });

  return {
    projectId: options.existingProjectId,
    targetProductId,
    reviewSourceProductId,
    ...uploaded,
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

async function insertUploadedImportFile({
  projectId,
  reviewSourceProductId,
  fileName,
  fileType,
  fileBuffer,
  fileMimeType,
}: {
  projectId: string;
  reviewSourceProductId: string;
  fileName: string;
  fileType: string;
  fileBuffer: Buffer;
  fileMimeType?: string;
}) {
  const supabase = createAdminSupabaseClient();
  const fileHash = createHash("sha256").update(fileBuffer).digest("hex");
  const storagePath = buildStoragePath({
    projectId,
    reviewSourceProductId,
    fileHash,
    fileName,
  });

  const { data: existingFile, error: existingFileError } = await supabase
    .from("import_files")
    .select("id, storage_path")
    .eq("project_id", projectId)
    .eq("project_product_id", reviewSourceProductId)
    .eq("storage_path", storagePath)
    .limit(1)
    .maybeSingle();

  if (existingFileError) {
    throw new Error(existingFileError.message);
  }

  if (existingFile) {
    return {
      importFileId: existingFile.id,
      importedReviews: 0,
      storagePath: existingFile.storage_path ?? storagePath,
      deduplicated: true,
    };
  }

  const { error: storageError } = await supabase.storage
    .from("review-imports")
    .upload(storagePath, fileBuffer, {
      contentType: fileMimeType || undefined,
      upsert: true,
    });

  if (storageError) {
    throw new Error(
      storageError.message ||
        "Failed to upload review file to Supabase Storage (review-imports bucket).",
    );
  }

  const { data: importFile, error: importFileError } = await supabase
    .from("import_files")
    .insert({
      project_id: projectId,
      project_product_id: reviewSourceProductId,
      file_name: fileName,
      file_type: fileType,
      source_kind: "review_export",
      storage_path: storagePath,
      import_status: "uploaded",
      row_count: 0,
    })
    .select("id")
    .single();

  if (importFileError || !importFile) {
    throw new Error(importFileError?.message ?? "Failed to create import file");
  }

  return {
    importFileId: importFile.id,
    importedReviews: 0,
    storagePath,
    deduplicated: false,
  };
}

function normalizePresetCompetitors(
  presetCompetitors?: UploadPresetCompetitor[],
) {
  return (presetCompetitors ?? [])
    .map((item) => ({
      localId: item.localId?.trim() ?? "",
      name: item.name?.trim() ?? "",
      asin: item.asin?.trim() ?? "",
      url: item.url?.trim() ?? "",
      market: item.market?.trim() ?? "",
    }))
    .filter((item) => item.name || item.asin || item.url || item.market);
}

function buildStoragePath({
  projectId,
  reviewSourceProductId,
  fileHash,
  fileName,
}: {
  projectId: string;
  reviewSourceProductId: string;
  fileHash: string;
  fileName: string;
}) {
  const extensionMatch = fileName.match(/\.[a-zA-Z0-9]+$/);
  const safeExtension = extensionMatch
    ? extensionMatch[0].toLowerCase()
    : ".bin";

  return `projects/${projectId}/${reviewSourceProductId}/${fileHash}${safeExtension}`;
}
