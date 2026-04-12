export type ImageAsset = {
  id: string;
  slot: string;
  goal: string;
  message: string;
  supporting_proof: string;
  visual_direction: string;
  prompt_zh: string;
  prompt_en: string;
  model_name: string;
  status: "generated" | "failed";
  image_url: string | null;
  error_message: string | null;
  is_kept: boolean;
  version: number;
  created_at: string;
};

export type ImageGenerationRun = {
  id: string;
  project_id: string;
  slot: string;
  status: "queued" | "running" | "completed" | "failed";
  stage:
    | "queued"
    | "preparing_assets"
    | "identifying_product"
    | "generating_image"
    | "reviewing_identity"
    | "completed"
    | "failed";
  progress: number;
  model_name: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  image_asset_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ActionResponse = {
  error?: string;
};

export type ProductReferenceImageKind =
  | "untyped"
  | "hero_source"
  | "structure_lock"
  | "material_lock"
  | "lifestyle_ref"
  | "competitor_inspiration"
  | "infographic_ignore";

export type ProductReferenceImage = {
  id: string;
  project_product_id: string;
  role: "target" | "competitor";
  file_name: string;
  image_url: string | null;
  reference_kind: ProductReferenceImageKind;
  pinned_for_main: boolean;
  created_at: string;
};

export type ProductOption = {
  id: string;
  name: string | null;
};

export type ProductIdentityProfile = {
  id: string;
  project_id: string;
  project_product_id: string;
  status: "draft" | "confirmed";
  reference_signature?: string;
  source_image_count: number;
  product_type: string;
  category: string;
  primary_color: string;
  materials: string[];
  signature_features: string[];
  must_keep: string[];
  can_change: string[];
  must_not_change: string[];
  identity_summary: string;
  created_at: string;
  updated_at: string;
};

export type DeleteTarget =
  | {
      kind: "reference";
      id: string;
      title: string;
      description: string;
      confirmLabel: string;
      item: ProductReferenceImage;
    }
  | {
      kind: "asset";
      id: string;
      title: string;
      description: string;
      confirmLabel: string;
      item: ImageAsset;
    };

export type SlotDraftFields = {
  purpose: string;
  conversionGoal: string;
  recommendedOverlayCopy: string;
};

export type ImageModelOption = {
  id: string;
  label: string;
  provider: "openai" | "gemini";
  model: string;
};

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
