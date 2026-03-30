import { task } from "@trigger.dev/sdk";

import { generateAnalysisReportForProject } from "@/lib/analysis";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const analyzeProjectTask = task({
  id: "analyze-project",
  run: async (payload: { projectId: string; runId: string }) => {
    const supabase = createAdminSupabaseClient();

    try {
      await generateAnalysisReportForProject(payload.projectId, {
        runId: payload.runId,
      });

      await supabase
        .from("projects")
        .update({
          status: "completed",
        })
        .eq("id", payload.projectId);

      console.log("Project analysis completed", {
        projectId: payload.projectId,
        runId: payload.runId,
      });

      return {
        ok: true,
        runId: payload.runId,
      };
    } catch (error) {
      await supabase
        .from("projects")
        .update({
          status: "failed",
        })
        .eq("id", payload.projectId);

      console.error("Project analysis failed", {
        projectId: payload.projectId,
        runId: payload.runId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  },
});
