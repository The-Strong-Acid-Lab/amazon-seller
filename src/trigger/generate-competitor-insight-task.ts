import { task } from "@trigger.dev/sdk";

import { generateCompetitorInsightForProduct } from "@/lib/analysis";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const INSIGHT_TYPE = "competitor_overview";

export const generateCompetitorInsightTask = task({
  id: "generate-competitor-insight",
  run: async (payload: { projectId: string; productId: string; runId: string }) => {
    const supabase = createAdminSupabaseClient();
    const modelName = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    try {
      await supabase
        .from("competitor_insight_runs")
        .update({
          status: "running",
          stage: "loading_reviews",
          progress: 15,
          model_name: modelName,
          started_at: new Date().toISOString(),
          completed_at: null,
          error_message: null,
        })
        .eq("id", payload.runId);

      await supabase
        .from("competitor_insight_runs")
        .update({
          stage: "llm_analyzing",
          progress: 60,
        })
        .eq("id", payload.runId);

      const insight = await generateCompetitorInsightForProduct({
        projectId: payload.projectId,
        productId: payload.productId,
      });

      await supabase
        .from("competitor_insight_runs")
        .update({
          stage: "writing_insight",
          progress: 85,
        })
        .eq("id", payload.runId);

      const { data, error } = await supabase
        .from("project_product_insights")
        .upsert(
          {
            project_id: payload.projectId,
            project_product_id: payload.productId,
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
        throw new Error(error.message);
      }

      await supabase
        .from("competitor_insight_runs")
        .update({
          status: "completed",
          stage: "completed",
          progress: 100,
          completed_at: new Date().toISOString(),
        })
        .eq("id", payload.runId);

      return {
        ok: true,
        runId: payload.runId,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      await supabase
        .from("competitor_insight_runs")
        .update({
          status: "failed",
          stage: "failed",
          progress: 100,
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", payload.runId);

      console.error("Competitor insight generation failed", {
        projectId: payload.projectId,
        productId: payload.productId,
        runId: payload.runId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  },
});
