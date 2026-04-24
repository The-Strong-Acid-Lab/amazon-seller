function resolveProtocol(host: string, forwardedProto?: string | null) {
  return host.includes("localhost") || host.includes("127.0.0.1")
    ? "http"
    : forwardedProto || "https";
}

function splitHost(host: string) {
  const [hostname, port] = host.split(":");
  return {
    hostname: (hostname || "").toLowerCase(),
    port: port ? `:${port}` : "",
  };
}

export function toRootHostname(hostname: string) {
  return hostname.startsWith("console.")
    ? hostname.replace(/^console\./, "")
    : hostname;
}

export function toConsoleHostname(hostname: string) {
  const bare = hostname.replace(/^www\./, "");
  return bare.startsWith("console.") ? bare : `console.${bare}`;
}

export function buildRootUrlFromHost(host: string, pathname: string, forwardedProto?: string | null) {
  const proto = resolveProtocol(host, forwardedProto);
  const { hostname, port } = splitHost(host);
  return `${proto}://${toRootHostname(hostname)}${port}${pathname}`;
}

export function buildConsoleUrlFromHost(
  host: string,
  pathname: string,
  forwardedProto?: string | null,
) {
  const proto = resolveProtocol(host, forwardedProto);
  const { hostname, port } = splitHost(host);
  return `${proto}://${toConsoleHostname(toRootHostname(hostname))}${port}${pathname}`;
}

export function buildConsoleUrlInBrowser(pathname: string) {
  const { protocol, hostname, port } = window.location;
  const rootHostname = toRootHostname(hostname.toLowerCase());
  const consoleHostname = toConsoleHostname(rootHostname);
  return `${protocol}//${consoleHostname}${port ? `:${port}` : ""}${pathname}`;
}

export function buildRootUrlInBrowser(pathname: string) {
  const { protocol, hostname, port } = window.location;
  const rootHostname = toRootHostname(hostname.toLowerCase());
  return `${protocol}//${rootHostname}${port ? `:${port}` : ""}${pathname}`;
}

export function getSharedCookieDomain(hostname: string) {
  const normalized = hostname.toLowerCase();

  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    return ".localhost";
  }

  if (normalized === "127.0.0.1" || normalized.endsWith(".127.0.0.1")) {
    return "127.0.0.1";
  }

  return undefined;
}
