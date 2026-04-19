import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { buildConsoleUrl, buildRootUrl } from "@/lib/host-routing.server";
import { isConsoleSubdomainEnabled } from "@/lib/runtime-flags";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function Home() {
  const user = await getAuthenticatedUser();
  const useSubdomain = isConsoleSubdomainEnabled();
  const headerList = await headers();
  const host = (headerList.get("host") || "").toLowerCase();
  const isConsoleHost = host.startsWith("console.");

  if (useSubdomain && isConsoleHost) {
    if (!user) {
      redirect(await buildRootUrl("/login"));
    }

    redirect("/dashboard");
  }

  const consoleHref = useSubdomain ? await buildConsoleUrl("/") : "/dashboard";

  if (user) {
    redirect(consoleHref);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(214,183,142,0.2),transparent_40%),linear-gradient(180deg,#f8f5ee_0%,#f4efe6_100%)] px-4 py-8 text-stone-950 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full gap-8 rounded-[2rem] border border-white/70 bg-white/80 px-8 py-12 shadow-[0_30px_80px_rgba(49,33,15,0.08)] backdrop-blur sm:px-12 sm:py-16">
          <div className="flex flex-wrap gap-3">
            <Button asChild className="h-10 px-6">
              <Link href="/login">邮箱登录</Link>
            </Button>
            <Button asChild className="h-10 px-6" variant="outline">
              <Link href={consoleHref}>查看 Console</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
