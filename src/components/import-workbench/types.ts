import type { ImportPreview } from "@/lib/review-import";

export type PersistedImportResult = {
  projectId: string;
  targetProductId: string;
  reviewSourceProductId: string;
  importFileId: string;
  importedReviews: number;
  storagePath?: string;
  deduplicated?: boolean;
};

export type ImportPreviewResponse = ImportPreview & {
  error?: string;
  persisted?: PersistedImportResult;
  uploadOnly?: boolean;
};

export type UploadResponse = {
  error?: string;
  persisted?: PersistedImportResult;
  uploadOnly?: boolean;
};

export type ImportFormValues = {
  projectName: string;
  targetProductAsin: string;
  targetProductUrl: string;
  targetMarket: string;
  targetIsLaunched: boolean;
};

export type CompetitorDraft = {
  id: string;
  asin: string;
  url: string;
  market: string;
};

export type PreviewSourceSnapshot = {
  sourceId: string;
  role: "target" | "competitor";
  name: string;
  market: string;
};

export type SourcePreviewEntry = {
  preview: ImportPreview;
  snapshot: PreviewSourceSnapshot;
};
