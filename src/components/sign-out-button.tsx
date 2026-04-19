"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { buildRootUrlInBrowser } from "@/lib/host-routing";
import { isConsoleSubdomainEnabled } from "@/lib/runtime-flags";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const useSubdomain = isConsoleSubdomainEnabled();

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();

    if (useSubdomain) {
      window.location.assign(buildRootUrlInBrowser("/login"));
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <Button onClick={() => void handleSignOut()} size="sm" variant="outline">
      退出登录
    </Button>
  );
}
