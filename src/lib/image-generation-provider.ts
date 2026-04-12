export type ImageGenerationProvider = "openai" | "gemini";

function sanitizeEnvValue(value: string | undefined) {
  return value?.trim() || "";
}

export function getImageGenerationProvider(): ImageGenerationProvider {
  const explicitProvider = sanitizeEnvValue(
    process.env.IMAGE_GENERATION_PROVIDER,
  ).toLowerCase();

  if (explicitProvider === "gemini") {
    return "gemini";
  }

  if (explicitProvider === "openai") {
    return "openai";
  }

  const geminiModel = sanitizeEnvValue(process.env.GEMINI_IMAGE_MODEL);
  if (geminiModel) {
    return "gemini";
  }

  const openaiModel = sanitizeEnvValue(process.env.OPENAI_IMAGE_MODEL);
  if (openaiModel.startsWith("gemini-")) {
    return "gemini";
  }

  return "openai";
}

export function getConfiguredImageModelName() {
  const provider = getImageGenerationProvider();

  if (provider === "gemini") {
    return (
      sanitizeEnvValue(process.env.GEMINI_IMAGE_MODEL) ||
      sanitizeEnvValue(process.env.OPENAI_IMAGE_MODEL) ||
      "gemini-2.5-flash-image"
    );
  }

  return sanitizeEnvValue(process.env.OPENAI_IMAGE_MODEL) || "gpt-image-1.5";
}

export function getConfiguredVisionModelName() {
  return (
    sanitizeEnvValue(process.env.OPENAI_VISION_MODEL) ||
    sanitizeEnvValue(process.env.OPENAI_MODEL) ||
    "gpt-4o"
  );
}
