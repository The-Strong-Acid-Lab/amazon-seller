export function isConsoleSubdomainEnabled() {
  return process.env.NEXT_PUBLIC_USE_CONSOLE_SUBDOMAIN === "true";
}
