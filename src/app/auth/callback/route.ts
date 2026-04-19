import { NextResponse } from "next/server";

import { buildConsoleUrl } from "@/lib/host-routing.server";
import { isConsoleSubdomainEnabled } from "@/lib/runtime-flags";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (isConsoleSubdomainEnabled()) {
    return NextResponse.redirect(await buildConsoleUrl("/"));
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
