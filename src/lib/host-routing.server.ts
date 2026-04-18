import { headers } from "next/headers";

import { buildConsoleUrlFromHost, buildRootUrlFromHost } from "@/lib/host-routing";

export async function buildRootUrl(pathname: string) {
  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const forwardedProto = headerList.get("x-forwarded-proto");
  return buildRootUrlFromHost(host, pathname, forwardedProto);
}

export async function buildConsoleUrl(pathname: string) {
  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const forwardedProto = headerList.get("x-forwarded-proto");
  return buildConsoleUrlFromHost(host, pathname, forwardedProto);
}

