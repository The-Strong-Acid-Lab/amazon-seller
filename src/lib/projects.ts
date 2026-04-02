import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function getProjectsListData() {
  const supabase = createAdminSupabaseClient();

  const [
    { data: projects, error: projectsError },
    { data: projectProducts, error: productsError },
    { data: reviews, error: reviewsError },
    { data: reports, error: reportsError },
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

  const reviewCountByProject = new Map<string, number>();
  const competitorCountByProject = new Map<string, number>();
  const latestReportByProject = new Map<string, string>();

  for (const review of reviews ?? []) {
    reviewCountByProject.set(
      review.project_id,
      (reviewCountByProject.get(review.project_id) ?? 0) + 1,
    );
  }

  for (const product of projectProducts ?? []) {
    if (product.role !== "competitor") {
      continue;
    }

    competitorCountByProject.set(
      product.project_id,
      (competitorCountByProject.get(product.project_id) ?? 0) + 1,
    );
  }

  for (const report of reports ?? []) {
    if (!latestReportByProject.has(report.project_id)) {
      latestReportByProject.set(report.project_id, report.created_at);
    }
  }

  return (projects ?? []).map((project) => ({
    ...project,
    reviewCount: reviewCountByProject.get(project.id) ?? 0,
    competitorCount: competitorCountByProject.get(project.id) ?? 0,
    latestReportAt: latestReportByProject.get(project.id) ?? null,
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
    { data: referenceImages, error: referenceImagesError },
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
        .from("product_reference_images")
        .select(
          "id, project_id, project_product_id, role, file_name, file_hash, storage_bucket, storage_path, image_url, mime_type, size_bytes, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
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

  if (referenceImagesError) {
    throw new Error(referenceImagesError.message);
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
    referenceImages: referenceImages ?? [],
    latestReport,
    latestAnalysisRun: activeRun ?? latestTerminalRun ?? null,
  };
}
