import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getUserApiKeySettings } from "@/lib/user-api-keys";
import {
  appendUploadedReviewFileToProject,
  appendImportedReviewsToProject,
  persistUploadedReviewFile,
  persistImportedReviews,
} from "@/lib/import-persistence";
import { createImportPreview, parseReviewImport } from "@/lib/review-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    }

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

    if (mode === "import" || mode === "upload") {
      const apiKeySettings = await getUserApiKeySettings(user.id);
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
      const selectedReviewSourceId = String(
        formData.get("selectedReviewSourceId") ?? "",
      ).trim();
      const reviewSourceProductId = String(
        formData.get("reviewSourceProductId") ?? "",
      ).trim();
      const presetCompetitors = parsePresetCompetitors(
        String(formData.get("presetCompetitors") ?? "").trim(),
      );

      if (!projectName && !existingProjectId) {
        return NextResponse.json(
          {
            error:
              mode === "upload"
                ? "Project name is required before uploading to Supabase."
                : "Project name is required before importing to Supabase.",
          },
          { status: 400 },
        );
      }

      if (
        !existingProjectId &&
        !apiKeySettings.hasOpenAiKey &&
        !apiKeySettings.hasGeminiKey
      ) {
        return NextResponse.json(
          { error: "请先在 Settings 保存你自己的 API Key，然后再新建项目。" },
          { status: 400 },
        );
      }

      if (reviewSourceRole !== "target" && reviewSourceRole !== "competitor") {
        return NextResponse.json(
          { error: "Review source role must be target or competitor." },
          { status: 400 },
        );
      }

      if (reviewSourceRole === "competitor" && !reviewSourceName) {
        return NextResponse.json(
          {
            error:
              mode === "upload"
                ? "Review source product name is required before uploading."
                : "Review source product name is required before importing.",
          },
          { status: 400 },
        );
      }

      if (mode === "upload") {
        const persisted = existingProjectId
          ? await appendUploadedReviewFileToProject({
              existingProjectId,
              targetProductId: targetProductId || undefined,
              reviewSourceProductId: reviewSourceProductId || undefined,
              reviewSourceRole: reviewSourceRole as "target" | "competitor",
              reviewSourceName: reviewSourceName || undefined,
              reviewSourceAsin: reviewSourceAsin || undefined,
              reviewSourceUrl: reviewSourceUrl || undefined,
              reviewSourceMarket: reviewSourceMarket || undefined,
              fileName: file.name,
              fileType: inferFileType(file),
              fileBuffer: buffer,
              fileMimeType: file.type || undefined,
            })
          : await persistUploadedReviewFile({
              userId: user.id,
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
              selectedReviewSourceId: selectedReviewSourceId || undefined,
              presetCompetitors,
              fileName: file.name,
              fileType: inferFileType(file),
              fileBuffer: buffer,
              fileMimeType: file.type || undefined,
            });

        return NextResponse.json({
          persisted,
          uploadOnly: true,
        });
      }

      const parsed = await parseReviewImport(file.name, buffer);
      const persisted = existingProjectId
        ? await appendImportedReviewsToProject(parsed, {
            existingProjectId,
            targetProductId: targetProductId || undefined,
            reviewSourceProductId: reviewSourceProductId || undefined,
            reviewSourceRole: reviewSourceRole as "target" | "competitor",
            reviewSourceName: reviewSourceName || undefined,
            reviewSourceAsin: reviewSourceAsin || undefined,
            reviewSourceUrl: reviewSourceUrl || undefined,
            reviewSourceMarket: reviewSourceMarket || undefined,
          })
        : await persistImportedReviews(parsed, {
            userId: user.id,
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
            selectedReviewSourceId: selectedReviewSourceId || undefined,
            presetCompetitors,
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

function parsePresetCompetitors(raw: string) {
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return undefined;
    }

    return parsed
      .filter((item) => typeof item === "object" && item !== null)
      .map((item) => {
        const row = item as Record<string, unknown>;

        return {
          localId: String(row.localId ?? "").trim(),
          name: String(row.name ?? "").trim(),
          asin: String(row.asin ?? "").trim(),
          url: String(row.url ?? "").trim(),
          market: String(row.market ?? "").trim(),
        };
      });
  } catch {
    throw new Error("presetCompetitors must be valid JSON.");
  }
}

function inferFileType(file: File) {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".xlsx")) {
    return "xlsx";
  }

  if (lowerName.endsWith(".csv")) {
    return "csv";
  }

  return file.type || "unknown";
}
