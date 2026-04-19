"use client";

import { useEffect, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function readTokensFromHash() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);

  return {
    accessToken: params.get("access_token") || "",
    refreshToken: params.get("refresh_token") || "",
  };
}

export default function AuthBridgePage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function syncSession() {
      try {
        const { accessToken, refreshToken } = readTokensFromHash();

        if (!accessToken || !refreshToken) {
          throw new Error("缺少会话令牌。");
        }

        const supabase = createBrowserSupabaseClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          throw sessionError;
        }

        window.location.replace("/");
      } catch (caughtError) {
        if (cancelled) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "登录同步失败。");
      }
    }

    void syncSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-base font-semibold text-stone-900">正在同步登录状态...</h1>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </div>
    </main>
  );
}

