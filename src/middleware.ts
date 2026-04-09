import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function stripPort(host: string) {
  return host.split(":")[0] ?? host;
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const hostname = stripPort(host).toLowerCase();
  const { pathname, search } = request.nextUrl;

  const isConsoleHost = hostname.startsWith("console.");

  if (!isConsoleHost) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/console";
    return NextResponse.rewrite(url);
  }

  if (pathname === "/console" || pathname.startsWith("/console/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/console/, "") || "/";
    url.search = search;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

