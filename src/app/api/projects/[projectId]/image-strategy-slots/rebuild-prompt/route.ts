import { NextResponse } from "next/server";
import OpenAI from "openai";

import { assertProjectOwnership, ProjectAccessError } from "@/lib/project-access";
import { resolveProjectApiKey } from "@/lib/user-api-keys";

type RebuildPromptPayload = {
  slotKey?: string;
  slotTitle?: string;
  purpose?: string;
  conversionGoal?: string;
  recommendedOverlayCopy?: string;
  evidence?: string;
  visualDirection?: string;
  complianceNotes?: string;
  currentPrompt?: string;
  referenceImageUrl?: string;
};

function sanitizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function requireOpenAiEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function enforceEditOnlyPrompt(prompt: string) {
  if (!prompt) {
    return prompt;
  }

  const bannedPatterns = [
    /请更换[图片图像素材]*/g,
    /请重新拍摄/g,
    /重新拍摄/g,
    /重拍/g,
    /更换图片/g,
    /更换素材/g,
    /replace the image/gi,
    /reshoot/gi,
    /retake/gi,
    /capture a new photo/gi,
  ];

  let next = prompt;

  for (const pattern of bannedPatterns) {
    next = next.replace(pattern, "请基于现有图片优化");
  }

  return next;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    await assertProjectOwnership(projectId);
    const body = (await request.json().catch(() => null)) as RebuildPromptPayload | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const slotKey = sanitizeText(body.slotKey);
    const slotTitle = sanitizeText(body.slotTitle);
    const purpose = sanitizeText(body.purpose);
    const conversionGoal = sanitizeText(body.conversionGoal);
    const recommendedOverlayCopy = sanitizeText(body.recommendedOverlayCopy);
    const evidence = sanitizeText(body.evidence);
    const visualDirection = sanitizeText(body.visualDirection);
    const complianceNotes = sanitizeText(body.complianceNotes);
    const currentPrompt = sanitizeText(body.currentPrompt);
    const referenceImageUrl = sanitizeText(body.referenceImageUrl);

    if (!slotKey) {
      return NextResponse.json({ error: "slotKey is required." }, { status: 400 });
    }

    const apiKey =
      (await resolveProjectApiKey(projectId, "openai")) ??
      requireOpenAiEnv("OPENAI_API_KEY");
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "你是亚马逊商品图提示词重建器（含槽位匹配判断）。",
            "任务：先判断“当前参考图是否匹配目标槽位”，再重建可直接用于生图的最终 Prompt。",
            "要求：",
            "1) 修复语法、标点、中英混杂和病句；",
            "2) 不改变原始业务意图和合规约束；",
            "3) 保留结构化段落（Purpose / Conversion Goal / VOC / Visual Direction / Compliance）；",
            "4) 如果参考图与槽位职责不匹配，输出纠偏式 Prompt（强调在当前图上该改什么）；",
            "5) 严禁建议用户更换图片、重新拍摄、重拍、替换素材。",
            "6) 你必须假设输入图片就是用户当前线上可用素材，只能给编辑优化指令。",
            "5) 输出 JSON，格式：{\"match_score\":0-100,\"mismatch_notes\":\"...\",\"prompt\":\"...\"}",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `slotKey: ${slotKey}`,
                `slotTitle: ${slotTitle || "unknown"}`,
                "",
                "策略输入：",
                `Purpose: ${purpose || "-"}`,
                `Conversion Goal: ${conversionGoal || "-"}`,
                `Recommended On-Image Copy: ${recommendedOverlayCopy || "-"}`,
                `VOC / Evidence: ${evidence || "-"}`,
                `Visual Direction: ${visualDirection || "-"}`,
                `Compliance Notes: ${complianceNotes || "-"}`,
                "",
                "当前Prompt（仅供参考，不要照抄错误）：",
                currentPrompt || "-",
              ].join("\n"),
            },
            ...(referenceImageUrl
              ? [
                  {
                    type: "image_url",
                    image_url: {
                      url: referenceImageUrl,
                    },
                  },
                ]
              : []),
          ],
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content?.trim() || "";
    let parsed: { match_score?: number; mismatch_notes?: string; prompt?: string } = {};

    try {
      parsed = JSON.parse(rawContent) as typeof parsed;
    } catch {
      parsed = {
        prompt: rawContent,
      };
    }

    const rebuiltPrompt = enforceEditOnlyPrompt(sanitizeText(parsed.prompt));
    const matchScore =
      typeof parsed.match_score === "number" && Number.isFinite(parsed.match_score)
        ? Math.max(0, Math.min(100, Math.round(parsed.match_score)))
        : null;
    const mismatchNotes = sanitizeText(parsed.mismatch_notes);

    if (!rebuiltPrompt) {
      throw new Error("模型未返回可用提示词。");
    }

    return NextResponse.json({
      prompt: rebuiltPrompt,
      matchScore,
      mismatchNotes,
    });
  } catch (error) {
    if (error instanceof ProjectAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "重建提示词失败。",
      },
      { status: 500 },
    );
  }
}
