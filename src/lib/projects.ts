import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function getProjectPageData(projectId: string) {
  const supabase = createAdminSupabaseClient();

  const [{ data: project, error: projectError }, { data: reviews, error: reviewsError }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, target_market, target_asin, status, created_at")
        .eq("id", projectId)
        .single(),
      supabase
        .from("reviews")
        .select(
          "id, asin, model, review_title, review_body, rating, review_date, country, image_count, has_video",
        )
        .eq("project_id", projectId)
        .order("review_date", { ascending: false }),
    ]);

  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Project not found");
  }

  if (reviewsError) {
    throw new Error(reviewsError.message);
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
    latestReport,
  };
}
