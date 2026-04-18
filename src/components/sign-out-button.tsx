"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button onClick={() => void handleSignOut()} size="sm" variant="outline">
      退出登录
    </Button>
  );
}
