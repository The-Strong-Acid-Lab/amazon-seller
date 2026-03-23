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
      .select("id, project_id, role, name")
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
        .select("id, project_product_id, file_name, row_count, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_products")
        .select("id, role, name, asin, product_url, market, is_launched")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
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

  return {
    project,
    reviews: reviews ?? [],
    importFiles: importFiles ?? [],
    projectProducts: projectProducts ?? [],
    latestReport,
  };
}
