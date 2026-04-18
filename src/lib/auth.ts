import { redirect } from "next/navigation";

import { buildRootUrl } from "@/lib/host-routing.server";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export async function requireUser(redirectTo = "/login") {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(await buildRootUrl(redirectTo));
  }

  return user;
}
