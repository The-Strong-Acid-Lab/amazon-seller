import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import { upsertUserApiKeys } from "@/lib/user-api-keys";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "未登录。" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      openaiKey?: string;
      geminiKey?: string;
    };

    await upsertUserApiKeys(user.id, {
      openaiKey: body.openaiKey?.trim() || undefined,
      geminiKey: body.geminiKey?.trim() || undefined,
    });

    return NextResponse.json({ message: "API Key 已保存。" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存 API Key 失败。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
