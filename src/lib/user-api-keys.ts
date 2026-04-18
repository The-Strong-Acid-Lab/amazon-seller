import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

type Provider = "openai" | "gemini";

function requireEncryptionSecret() {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error("Missing required environment variable: API_KEY_ENCRYPTION_SECRET");
  }

  return createHash("sha256").update(secret).digest();
}

function encryptApiKey(value: string) {
  const key = requireEncryptionSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decryptApiKey(value: string) {
  const key = requireEncryptionSecret();
  const buffer = Buffer.from(value, "base64");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function lastFour(value: string) {
  return value.slice(-4);
}

export async function getUserApiKeySettings(userId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("user_api_keys")
    .select(
      "openai_key_last4, gemini_key_last4, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116" && error.code !== "42P01") {
    throw new Error(error.message);
  }

  return {
    hasOpenAiKey: Boolean(data?.openai_key_last4),
    openAiLast4: data?.openai_key_last4 ?? null,
    hasGeminiKey: Boolean(data?.gemini_key_last4),
    geminiLast4: data?.gemini_key_last4 ?? null,
    updatedAt: data?.updated_at ?? null,
  };
}

export async function upsertUserApiKeys(
  userId: string,
  values: { openaiKey?: string; geminiKey?: string },
) {
  const supabase = createAdminSupabaseClient();

  const payload = {
    user_id: userId,
    openai_key_encrypted: values.openaiKey ? encryptApiKey(values.openaiKey) : null,
    openai_key_last4: values.openaiKey ? lastFour(values.openaiKey) : null,
    gemini_key_encrypted: values.geminiKey ? encryptApiKey(values.geminiKey) : null,
    gemini_key_last4: values.geminiKey ? lastFour(values.geminiKey) : null,
  };

  const { error } = await supabase.from("user_api_keys").upsert(payload, {
    onConflict: "user_id",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function resolveProjectApiKey(projectId: string, provider: Provider) {
  const supabase = createAdminSupabaseClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(projectError.message);
  }

  if (!project?.user_id) {
    return null;
  }

  const column =
    provider === "openai"
      ? "openai_key_encrypted"
      : "gemini_key_encrypted";
  const { data, error } = await supabase
    .from("user_api_keys")
    .select(column)
    .eq("user_id", project.user_id)
    .maybeSingle();

  if (error && error.code !== "PGRST116" && error.code !== "42P01") {
    throw new Error(error.message);
  }

  const encryptedValue = data?.[column as keyof typeof data];

  if (typeof encryptedValue !== "string" || !encryptedValue) {
    return null;
  }

  return decryptApiKey(encryptedValue);
}
