import { NextResponse } from "next/server";

import { createImportPreview } from "@/lib/review-import";

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
    const preview = await createImportPreview(file.name, buffer);

    return NextResponse.json(preview);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse uploaded file.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
