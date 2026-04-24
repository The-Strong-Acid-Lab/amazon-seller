import { task } from "@trigger.dev/sdk";

import { generateAnalysisReportForProject } from "@/lib/analysis";
import {
  buildEditableImagePrompt,
  buildImageStrategySlots,
} from "@/lib/image-strategy";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const analyzeProjectTask = task({
  id: "analyze-project",
  run: async (payload: {
    projectId: string;
    runId: string;
    provider?: "openai" | "gemini";
    modelName?: string;
  }) => {
    const supabase = createAdminSupabaseClient();

    try {
      const { report } = await generateAnalysisReportForProject(payload.projectId, {
        runId: payload.runId,
        provider: payload.provider,
        modelName: payload.modelName,
      });

      // Preserve existing reference_image_id bindings before overwriting strategy content.
      const { data: existingSlots } = await supabase
        .from("image_strategy_slots")
        .select("slot_key, reference_image_id")
        .eq("project_id", payload.projectId);

      const existingBindings = new Map(
        (existingSlots ?? []).map((row) => [row.slot_key, row.reference_image_id] as const),
      );

      const brief = Array.isArray(report.image_brief) ? report.image_brief : [];
      const strategy = report.image_strategy ?? undefined;
      const slots = buildImageStrategySlots({ brief, strategy });

      const slotPayload = slots.map((slot) => ({
        project_id: payload.projectId,
        slot_key: slot.id,
        order_index: slot.order,
        section: slot.section,
        title: slot.title,
        purpose: slot.purpose,
        conversion_goal: slot.conversionGoal,
        recommended_overlay_copy: slot.recommendedOverlayCopy,
        evidence: slot.evidence,
        visual_direction: slot.visualDirection,
        compliance_notes: slot.complianceNotes,
        prompt_text: buildEditableImagePrompt(slot),
        source_brief_slot: slot.sourceBriefSlot ?? null,
        reference_image_id: existingBindings.get(slot.id) ?? null,
      }));

      await supabase
        .from("image_strategy_slots")
        .upsert(slotPayload, { onConflict: "project_id,slot_key" });

      await supabase
        .from("projects")
        .update({ status: "completed" })
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
        .update({ status: "failed" })
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
