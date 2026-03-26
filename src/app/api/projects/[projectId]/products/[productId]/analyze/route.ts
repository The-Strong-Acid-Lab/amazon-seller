import { NextResponse } from "next/server";

import { generateCompetitorInsightForProduct } from "@/lib/analysis";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const INSIGHT_TYPE = "competitor_overview";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; productId: string }> },
) {
  try {
    const { projectId, productId } = await params;
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("project_product_insights")
      .select("content_json, updated_at")
      .eq("project_id", projectId)
      .eq("project_product_id", productId)
      .eq("insight_type", INSIGHT_TYPE)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "No cached competitor insight found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      insight: data.content_json,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load competitor insight.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; productId: string }> },
) {
  try {
    const { projectId, productId } = await params;
    const supabase = createAdminSupabaseClient();
    const insight = await generateCompetitorInsightForProduct({
      projectId,
      productId,
    });

    const { data, error } = await supabase
      .from("project_product_insights")
      .upsert(
        {
          project_id: projectId,
          project_product_id: productId,
          insight_type: INSIGHT_TYPE,
          content_json: insight,
        },
        {
          onConflict: "project_product_id,insight_type",
        },
      )
      .select("updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      insight,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to analyze competitor.",
      },
      { status: 500 },
    );
  }
}
