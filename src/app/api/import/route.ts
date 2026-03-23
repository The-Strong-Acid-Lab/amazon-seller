import { NextResponse } from "next/server";

import {
  appendImportedReviewsToProject,
  persistImportedReviews,
} from "@/lib/import-persistence";
import { createImportPreview, parseReviewImport } from "@/lib/review-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload an Excel or CSV file." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mode = String(formData.get("mode") ?? "preview");

    if (mode === "import") {
      const existingProjectId = String(formData.get("existingProjectId") ?? "").trim();
      const targetProductId = String(formData.get("targetProductId") ?? "").trim();
      const projectName = String(formData.get("projectName") ?? "").trim();
      const targetProductName = String(formData.get("targetProductName") ?? "").trim();
      const targetProductAsin = String(formData.get("targetProductAsin") ?? "").trim();
      const targetProductUrl = String(formData.get("targetProductUrl") ?? "").trim();
      const targetMarket = String(formData.get("targetMarket") ?? "").trim();
      const targetIsLaunched = String(formData.get("targetIsLaunched") ?? "true") === "true";
      const reviewSourceRole = String(formData.get("reviewSourceRole") ?? "competitor").trim();
      const reviewSourceName = String(formData.get("reviewSourceName") ?? "").trim();
      const reviewSourceAsin = String(formData.get("reviewSourceAsin") ?? "").trim();
      const reviewSourceUrl = String(formData.get("reviewSourceUrl") ?? "").trim();
      const reviewSourceMarket = String(formData.get("reviewSourceMarket") ?? "").trim();

      if (!projectName) {
        if (!existingProjectId) {
          return NextResponse.json(
            { error: "Project name is required before importing to Supabase." },
            { status: 400 },
          );
        }
      }

      if (!targetProductName) {
        if (!existingProjectId) {
          return NextResponse.json(
            { error: "Target product name is required before importing to Supabase." },
            { status: 400 },
          );
        }
      }

      if (reviewSourceRole !== "target" && reviewSourceRole !== "competitor") {
        return NextResponse.json(
          { error: "Review source role must be target or competitor." },
          { status: 400 },
        );
      }

      if (reviewSourceRole === "competitor" && !reviewSourceName) {
        return NextResponse.json(
          { error: "Review source product name is required before importing." },
          { status: 400 },
        );
      }

      const parsed = await parseReviewImport(file.name, buffer);
      const persisted = existingProjectId
        ? await appendImportedReviewsToProject(parsed, {
            existingProjectId,
            targetProductId: targetProductId || undefined,
            reviewSourceRole: reviewSourceRole as "target" | "competitor",
            reviewSourceName: reviewSourceName || undefined,
            reviewSourceAsin: reviewSourceAsin || undefined,
            reviewSourceUrl: reviewSourceUrl || undefined,
            reviewSourceMarket: reviewSourceMarket || undefined,
          })
        : await persistImportedReviews(parsed, {
            projectName,
            targetProductName,
            targetProductAsin: targetProductAsin || undefined,
            targetProductUrl: targetProductUrl || undefined,
            targetMarket: targetMarket || undefined,
            targetIsLaunched,
            reviewSourceRole: reviewSourceRole as "target" | "competitor",
            reviewSourceName,
            reviewSourceAsin: reviewSourceAsin || undefined,
            reviewSourceUrl: reviewSourceUrl || undefined,
            reviewSourceMarket: reviewSourceMarket || undefined,
          });
      const preview = await createImportPreview(file.name, buffer);

      return NextResponse.json({
        ...preview,
        persisted,
      });
    }

    const preview = await createImportPreview(file.name, buffer);

    return NextResponse.json(preview);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse uploaded file.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
