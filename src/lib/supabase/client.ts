"use client";

import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createBrowserSupabaseClient() {
  if (typeof window === "undefined") {
    throw new Error("Supabase browser client can only be used in the browser.");
  }

  if (browserClient) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      `Supabase browser env is missing. NEXT_PUBLIC_SUPABASE_URL=${Boolean(
        url,
      )}, NEXT_PUBLIC_SUPABASE_ANON_KEY=${Boolean(anonKey)}`,
    );
  }

  browserClient = createBrowserClient(url, anonKey);

  return browserClient;
}
