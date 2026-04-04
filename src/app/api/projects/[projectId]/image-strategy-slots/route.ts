import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

type ImageStrategySlotPayload = {
  slotKey?: string;
  order?: number;
  section?: "main" | "secondary";
  title?: string;
  purpose?: string;
  conversionGoal?: string;
  recommendedOverlayCopy?: string;
  evidence?: string;
  visualDirection?: string;
  complianceNotes?: string;
  promptText?: string;
  sourceBriefSlot?: string | null;
};

type RequestPayload = {
  slots?: ImageStrategySlotPayload[];
};

function sanitizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function sanitizeNullableText(value: unknown) {
  const nextValue = sanitizeText(value);
  return nextValue.length > 0 ? nextValue : null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const supabase = createAdminSupabaseClient();

  try {
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => null)) as RequestPayload | null;
    const slots = Array.isArray(body?.slots) ? body.slots : [];

    if (slots.length === 0) {
      return NextResponse.json({ error: "No slots provided." }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json(
        { error: projectError?.message ?? "Project not found." },
        { status: 404 },
      );
    }

    const payload = slots.map((slot, index) => {
      const slotKey = sanitizeText(slot.slotKey);

      if (!slotKey) {
        throw new Error(`Slot key is required for item ${index + 1}.`);
      }

      return {
        project_id: projectId,
        slot_key: slotKey,
        order_index:
          typeof slot.order === "number" && Number.isFinite(slot.order)
            ? Math.max(1, Math.round(slot.order))
            : index + 1,
        section: slot.section === "main" ? "main" : "secondary",
        title: sanitizeText(slot.title),
        purpose: sanitizeText(slot.purpose),
        conversion_goal: sanitizeText(slot.conversionGoal),
        recommended_overlay_copy: sanitizeText(slot.recommendedOverlayCopy),
        evidence: sanitizeText(slot.evidence),
        visual_direction: sanitizeText(slot.visualDirection),
        compliance_notes: sanitizeText(slot.complianceNotes),
        prompt_text: sanitizeText(slot.promptText),
        source_brief_slot: sanitizeNullableText(slot.sourceBriefSlot),
      };
    });

    const { data, error } = await supabase
      .from("image_strategy_slots")
      .upsert(payload, {
        onConflict: "project_id,slot_key",
      })
      .select(
        "id, project_id, slot_key, order_index, section, title, purpose, conversion_goal, recommended_overlay_copy, evidence, visual_direction, compliance_notes, prompt_text, source_brief_slot, created_at, updated_at",
      )
      .order("order_index", { ascending: true });

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "数据库结构尚未更新，请先执行 `supabase db push`（缺少 image_strategy_slots）。",
          },
          { status: 500 },
        );
      }

      throw new Error(error.message);
    }

    return NextResponse.json({
      slots: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "保存图片策略槽位失败。",
      },
      { status: 500 },
    );
  }
}
