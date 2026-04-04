import OpenAI from "openai";

function containsCjk(value: string) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(value);
}

export async function localizeImagePromptToEnglish({
  client,
  model,
  slot,
  prompt,
}: {
  client: OpenAI;
  model: string;
  slot: string;
  prompt: string;
}) {
  const normalizedPrompt = prompt.trim();

  if (!normalizedPrompt) {
    return {
      promptZh: "",
      promptEn: "",
      localized: false,
    };
  }

  if (!containsCjk(normalizedPrompt)) {
    return {
      promptZh: normalizedPrompt,
      promptEn: normalizedPrompt,
      localized: false,
    };
  }

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: [
          "You rewrite Chinese Amazon listing image prompts into strong English execution prompts for image models.",
          "Preserve product identity constraints, composition requirements, mechanical relationships, compliance restrictions, and all important negatives.",
          "Do not add branding, medical claims, fake specs, or decorative text instructions unless they already exist in the source prompt.",
          "Return only the final English prompt text. No markdown. No commentary.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `Slot: ${slot}`,
          "Rewrite this Chinese or mixed-language image prompt into natural, precise English for execution:",
          normalizedPrompt,
        ].join("\n\n"),
      },
    ],
  });

  const promptEn = completion.choices[0]?.message?.content?.trim() || normalizedPrompt;

  return {
    promptZh: normalizedPrompt,
    promptEn,
    localized: true,
  };
}

