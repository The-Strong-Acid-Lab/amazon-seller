import { task } from "@trigger.dev/sdk";

import { executeImageGenerationForSlot } from "@/lib/image-generation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const generateImageSlotTask = task({
  id: "generate-image-slot",
  run: async (payload: {
    projectId: string;
    runId: string;
    generation: {
      slot?: string;
      goal?: string;
      message?: string;
      supportingProof?: string;
      visualDirection?: string;
      promptOverride?: string;
    };
  }) => {
    const supabase = createAdminSupabaseClient();

    try {
      const result = await executeImageGenerationForSlot({
        projectId: payload.projectId,
        runId: payload.runId,
        payload: payload.generation,
      });

      console.log("Image generation completed", {
        projectId: payload.projectId,
        runId: payload.runId,
        slot: payload.generation.slot ?? "unknown",
      });

      return result;
    } catch (error) {
      await supabase
        .from("image_generation_runs")
        .update({
          status: "failed",
          stage: "failed",
          progress: 100,
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", payload.runId);

      console.error("Image generation failed", {
        projectId: payload.projectId,
        runId: payload.runId,
        slot: payload.generation.slot ?? "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  },
});
