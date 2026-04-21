import { task } from "@trigger.dev/sdk";

import {
  rebuildImageSlotPrompt,
  type RebuildPromptPayload,
} from "@/lib/image-prompt-rebuild";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const rebuildImageSlotPromptTask = task({
  id: "rebuild-image-slot-prompt",
  run: async (payload: {
    projectId: string;
    runId: string;
    rebuild: RebuildPromptPayload;
  }) => {
    const supabase = createAdminSupabaseClient();

    try {
      await supabase
        .from("prompt_rebuild_runs")
        .update({
          status: "running",
          stage: "analyzing_reference",
          progress: 20,
          started_at: new Date().toISOString(),
          completed_at: null,
          error_message: null,
        })
        .eq("id", payload.runId);

      await supabase
        .from("prompt_rebuild_runs")
        .update({
          stage: "rebuilding_prompt",
          progress: 55,
        })
        .eq("id", payload.runId);

      const result = await rebuildImageSlotPrompt({
        projectId: payload.projectId,
        payload: payload.rebuild,
      });

      await supabase
        .from("prompt_rebuild_runs")
        .update({
          status: "completed",
          stage: "completed",
          progress: 100,
          completed_at: new Date().toISOString(),
          result_prompt: result.prompt,
          canonical_prompt_en: result.canonicalPromptEn || null,
          mismatch_notes: result.mismatchNotes || null,
          match_score: result.matchScore,
          error_message: null,
        })
        .eq("id", payload.runId);

      return result;
    } catch (error) {
      await supabase
        .from("prompt_rebuild_runs")
        .update({
          status: "failed",
          stage: "failed",
          progress: 100,
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", payload.runId);

      throw error;
    }
  },
});
