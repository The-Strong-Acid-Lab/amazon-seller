import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const supabase = createAdminSupabaseClient();

    const [{ data: project, error: projectError }, { data: report, error: reportError }] =
      await Promise.all([
        supabase.from("projects").select("id, name").eq("id", projectId).single(),
        supabase
          .from("analysis_reports")
          .select("id, export_text, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (projectError || !project) {
      return NextResponse.json(
        { error: projectError?.message ?? "Project not found" },
        { status: 404 },
      );
    }

    if (reportError) {
      return NextResponse.json({ error: reportError.message }, { status: 500 });
    }

    if (!report?.export_text) {
      return NextResponse.json(
        { error: "No exportable analysis report found for this project." },
        { status: 404 },
      );
    }

    const filename = `${slugify(project.name || "project-report") || "project-report"}.md`;

    return new NextResponse(report.export_text, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed." },
      { status: 500 },
    );
  }
}
