import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function getProjectsListData() {
  const supabase = createAdminSupabaseClient();

  const [
    { data: projects, error: projectsError },
    { data: projectProducts, error: productsError },
    { data: reviews, error: reviewsError },
    { data: reports, error: reportsError },
    { data: imageAssets, error: imageAssetsError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, product_name, target_market, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("project_products")
      .select("id, project_id, role, name, current_title, current_bullets, current_description")
      .order("created_at", { ascending: true }),
    supabase
      .from("reviews")
      .select("id, project_id"),
    supabase
      .from("analysis_reports")
      .select("id, project_id, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("image_assets")
      .select("id, project_id"),
  ]);

  if (projectsError) {
    throw new Error(projectsError.message);
  }

  if (productsError) {
    throw new Error(productsError.message);
  }

  if (reviewsError) {
    throw new Error(reviewsError.message);
  }

  if (reportsError) {
    throw new Error(reportsError.message);
  }

  if (imageAssetsError && imageAssetsError.code !== "42P01") {
    throw new Error(imageAssetsError.message);
  }

  const reviewCountByProject = new Map<string, number>();
  const competitorCountByProject = new Map<string, number>();
  const latestReportByProject = new Map<string, string>();
  const reportCountByProject = new Map<string, number>();
  const imageCountByProject = new Map<string, number>();
  const listingReadyByProject = new Map<string, boolean>();

  for (const review of reviews ?? []) {
    reviewCountByProject.set(
      review.project_id,
      (reviewCountByProject.get(review.project_id) ?? 0) + 1,
    );
  }

  for (const product of projectProducts ?? []) {
    if (product.role === "target") {
      const hasListingData = Boolean(
        product.current_title?.trim() ||
          product.current_bullets?.trim() ||
          product.current_description?.trim(),
      );

      if (hasListingData) {
        listingReadyByProject.set(product.project_id, true);
      }
    }

    if (product.role !== "competitor") {
      continue;
    }

    competitorCountByProject.set(
      product.project_id,
      (competitorCountByProject.get(product.project_id) ?? 0) + 1,
    );
  }

  for (const report of reports ?? []) {
    reportCountByProject.set(
      report.project_id,
      (reportCountByProject.get(report.project_id) ?? 0) + 1,
    );

    if (!latestReportByProject.has(report.project_id)) {
      latestReportByProject.set(report.project_id, report.created_at);
    }
  }

  for (const asset of imageAssets ?? []) {
    imageCountByProject.set(
      asset.project_id,
      (imageCountByProject.get(asset.project_id) ?? 0) + 1,
    );
  }

  return (projects ?? []).map((project) => ({
    ...project,
    reviewCount: reviewCountByProject.get(project.id) ?? 0,
    competitorCount: competitorCountByProject.get(project.id) ?? 0,
    latestReportAt: latestReportByProject.get(project.id) ?? null,
    reportCount: reportCountByProject.get(project.id) ?? 0,
    hasListingDraft:
      listingReadyByProject.get(project.id) ?? Boolean(latestReportByProject.get(project.id)),
    hasImageAssets: (imageCountByProject.get(project.id) ?? 0) > 0,
    imageAssetCount: imageCountByProject.get(project.id) ?? 0,
    hasAPlusBrief: Boolean(latestReportByProject.get(project.id)),
  }));
}

export async function getProjectPageData(projectId: string) {
  const supabase = createAdminSupabaseClient();

  const [
    { data: project, error: projectError },
    { data: reviews, error: reviewsError },
    { data: importFiles, error: importFilesError },
    { data: projectProducts, error: productsError },
    { data: listingSnapshots, error: listingSnapshotsError },
    { data: imageAssets, error: imageAssetsError },
    { data: imageGenerationRuns, error: imageGenerationRunsError },
    { data: imageStrategySlots, error: imageStrategySlotsError },
    { data: referenceImages, error: referenceImagesError },
    { data: productIdentityProfile, error: productIdentityProfileError },
  ] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, product_name, target_market, target_asin, status, created_at")
        .eq("id", projectId)
        .single(),
      supabase
        .from("reviews")
        .select(
          "id, project_product_id, asin, model, review_title, review_body, rating, review_date, country, image_count, has_video",
        )
        .eq("project_id", projectId)
        .order("review_date", { ascending: false }),
      supabase
        .from("import_files")
        .select(
          "id, project_product_id, file_name, row_count, created_at, import_status, error_message, sheet_name",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_products")
        .select(
          "id, role, name, asin, product_url, market, is_launched, current_title, current_bullets, current_description, notes, updated_at, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("listing_snapshots")
        .select(
          "id, project_id, analysis_report_id, title_draft, bullet_drafts, positioning_statement, source, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("image_assets")
        .select(
          "id, project_id, slot, goal, message, supporting_proof, visual_direction, prompt_zh, prompt_en, model_name, status, storage_bucket, storage_path, image_url, width, height, error_message, is_kept, version, created_at, updated_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("image_generation_runs")
        .select(
          "id, project_id, slot, status, stage, progress, model_name, error_message, started_at, completed_at, image_asset_id, created_at, updated_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("image_strategy_slots")
        .select(
          "id, project_id, slot_key, order_index, section, title, purpose, conversion_goal, recommended_overlay_copy, evidence, visual_direction, compliance_notes, prompt_text, source_brief_slot, created_at, updated_at",
        )
        .eq("project_id", projectId)
        .order("order_index", { ascending: true }),
      supabase
        .from("product_reference_images")
        .select(
          "id, project_id, project_product_id, role, file_name, file_hash, storage_bucket, storage_path, image_url, mime_type, size_bytes, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("product_identity_profiles")
        .select(
          "id, project_id, project_product_id, status, reference_signature, source_image_count, product_type, category, primary_color, materials, signature_features, must_keep, can_change, must_not_change, identity_summary, created_at, updated_at",
        )
        .eq("project_id", projectId)
        .maybeSingle(),
    ]);

  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Project not found");
  }

  if (reviewsError) {
    throw new Error(reviewsError.message);
  }

  if (importFilesError) {
    throw new Error(importFilesError.message);
  }

  if (productsError) {
    throw new Error(productsError.message);
  }

  if (listingSnapshotsError) {
    throw new Error(listingSnapshotsError.message);
  }

  if (imageAssetsError) {
    throw new Error(imageAssetsError.message);
  }

  if (imageGenerationRunsError && imageGenerationRunsError.code !== "42P01") {
    throw new Error(imageGenerationRunsError.message);
  }

  if (imageStrategySlotsError && imageStrategySlotsError.code !== "42P01") {
    throw new Error(imageStrategySlotsError.message);
  }

  if (referenceImagesError) {
    throw new Error(referenceImagesError.message);
  }

  if (productIdentityProfileError && productIdentityProfileError.code !== "42P01") {
    throw new Error(productIdentityProfileError.message);
  }

  const { data: latestReport, error: reportError } = await supabase
    .from("analysis_reports")
    .select(
      "id, created_at, report_version, summary_json, strategy_json, export_text, analysis_run_id",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reportError) {
    throw new Error(reportError.message);
  }

  const { data: activeRun, error: activeRunError } = await supabase
    .from("analysis_runs")
    .select("id, status, stage, progress, error_message, started_at, completed_at")
    .eq("project_id", projectId)
    .eq("run_type", "voc_report")
    .in("status", ["queued", "running"])
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (activeRunError) {
    throw new Error(activeRunError.message);
  }

  const { data: latestTerminalRun, error: latestTerminalRunError } = await supabase
    .from("analysis_runs")
    .select("id, status, stage, progress, error_message, started_at, completed_at")
    .eq("project_id", projectId)
    .eq("run_type", "voc_report")
    .in("status", ["completed", "failed"])
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (latestTerminalRunError) {
    throw new Error(latestTerminalRunError.message);
  }

  return {
    project,
    reviews: reviews ?? [],
    importFiles: importFiles ?? [],
    projectProducts: projectProducts ?? [],
    listingSnapshots:
      listingSnapshots?.map((snapshot) => ({
        ...snapshot,
        bullet_drafts: Array.isArray(snapshot.bullet_drafts)
          ? snapshot.bullet_drafts
              .filter((item): item is string => typeof item === "string")
          : [],
      })) ?? [],
    imageAssets: imageAssets ?? [],
    imageGenerationRuns:
      imageGenerationRunsError?.code === "42P01" ? [] : imageGenerationRuns ?? [],
    imageStrategySlots:
      imageStrategySlotsError?.code === "42P01" ? [] : imageStrategySlots ?? [],
    referenceImages: referenceImages ?? [],
    productIdentityProfile:
      productIdentityProfileError?.code === "42P01" || !productIdentityProfile
        ? null
        : {
            ...productIdentityProfile,
            materials: Array.isArray(productIdentityProfile.materials)
              ? productIdentityProfile.materials.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
            signature_features: Array.isArray(productIdentityProfile.signature_features)
              ? productIdentityProfile.signature_features.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
            must_keep: Array.isArray(productIdentityProfile.must_keep)
              ? productIdentityProfile.must_keep.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
            can_change: Array.isArray(productIdentityProfile.can_change)
              ? productIdentityProfile.can_change.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
            must_not_change: Array.isArray(productIdentityProfile.must_not_change)
              ? productIdentityProfile.must_not_change.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
          },
    latestReport,
    latestAnalysisRun: activeRun ?? latestTerminalRun ?? null,
  };
}
