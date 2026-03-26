import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; productId: string }> },
) {
  try {
    const { projectId, productId } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      asin?: string;
      productUrl?: string;
      market?: string;
      currentTitle?: string;
      currentBullets?: string;
      currentDescription?: string;
      notes?: string;
    };

    const supabase = createAdminSupabaseClient();

    const { data: product, error: productError } = await supabase
      .from("project_products")
      .select("id")
      .eq("id", productId)
      .eq("project_id", projectId)
      .single();

    if (productError || !product) {
      throw new Error(productError?.message ?? "Product not found");
    }

    const payload = {
      name: body.name?.trim() || null,
      asin: body.asin?.trim() || null,
      product_url: body.productUrl?.trim() || null,
      market: body.market?.trim() || null,
      current_title: body.currentTitle?.trim() || null,
      current_bullets: body.currentBullets?.trim() || null,
      current_description: body.currentDescription?.trim() || null,
      notes: body.notes?.trim() || null,
    };

    const { error: updateError } = await supabase
      .from("project_products")
      .update(payload)
      .eq("id", productId)
      .eq("project_id", projectId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ ok: true, productId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update product listing.",
      },
      { status: 400 },
    );
  }
}
