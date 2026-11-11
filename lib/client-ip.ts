import { isIP } from "node:net";

// Enable only behind a private listener and a proxy that overwrites X-Real-IP.
export function trustedClientIp(headers: Pick<Headers, "get">): string | null {
  if (process.env.SMARTBUS_TRUST_PROXY !== "1") return null;
  const value = headers.get("x-real-ip")?.trim() ?? "";
  const family = isIP(value);
  if (family === 4) return value;
  if (family === 6 && !value.includes("%")) return new URL("http://[" + value + "]/").hostname.slice(1, -1);
  return null;
}
