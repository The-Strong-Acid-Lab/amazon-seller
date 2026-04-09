import Link from "next/link";
import { headers } from "next/headers";

import { Button } from "@/components/ui/button";

function buildConsoleUrl(host: string, proto: string) {
  const [hostname, port] = host.split(":");
  const normalizedHost = (hostname || "").toLowerCase();

  const consoleHostname =
    normalizedHost === "localhost"
      ? "console.localhost"
      : normalizedHost.startsWith("www.")
        ? normalizedHost.replace(/^www\./, "console.")
        : normalizedHost.startsWith("console.")
          ? normalizedHost
          : `console.${normalizedHost}`;

  return `${proto}://${consoleHostname}${port ? `:${port}` : ""}`;
}

export default async function Home() {
  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const proto =
    host.includes("localhost") || host.includes("127.0.0.1")
      ? "http"
      : headerList.get("x-forwarded-proto") || "https";
  const consoleUrl = buildConsoleUrl(host, proto);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(214,183,142,0.2),transparent_40%),linear-gradient(180deg,#f8f5ee_0%,#f4efe6_100%)] px-4 py-8 text-stone-950 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full gap-8 rounded-[2rem] border border-white/70 bg-white/80 px-8 py-12 shadow-[0_30px_80px_rgba(49,33,15,0.08)] backdrop-blur sm:px-12 sm:py-16">
          <div className="flex items-center justify-between gap-4">
            <p className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600">
              Placeholder Landing
            </p>
          </div>

          <div className="grid gap-4">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
              把评论、Listing 和图片策略串成一个真正能落地的 Amazon 增长工作台。
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-full px-6">
              <Link href={consoleUrl}>进入 Console</Link>
            </Button>
            <Button asChild className="rounded-full px-6" variant="outline">
              <Link href={consoleUrl}>登录后进入</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
