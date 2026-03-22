import { NextResponse } from "next/server";

import { persistImportedReviews } from "@/lib/import-persistence";
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
      const projectName = String(formData.get("projectName") ?? "").trim();

      if (!projectName) {
        return NextResponse.json(
          { error: "Project name is required before importing to Supabase." },
          { status: 400 },
        );
      }

      const parsed = await parseReviewImport(file.name, buffer);
      const persisted = await persistImportedReviews(parsed, { projectName });
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
