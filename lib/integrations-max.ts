import "server-only";
import { request, type RequestOptions } from "node:https";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { networkInterfaces } from "node:os";

const origin = "https://platform-api2.max.ru";
async function endpoint(token: string, path: string, method: "GET" | "POST") {
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error("Invalid MAX API path");
  // Scope an optional network route to this one service. Resolve again after Wi-Fi/DHCP changes.
  const iface = process.env.SMARTBUS_MAX_INTERFACE?.trim();
  const localAddress = iface ? networkInterfaces()[iface]?.find(ip => ip.family === "IPv4" && !ip.internal)?.address : undefined;
  if (iface && !localAddress) throw new Error("MAX_INTERFACE_UNAVAILABLE");
  const options: RequestOptions = {
    method,
    ...(localAddress ? { localAddress, family: 4 } : {}),
    ca: await readFile(join(process.cwd(), "certs", "russian_trusted_root_ca.pem")),
    signal: AbortSignal.timeout(8000),
    headers: { Authorization: token, "Content-Type": "application/json" },
  };
  return { url, options };
}

export async function maxRequest(token: string, path: string, message?: { text: string; format?: "html" }): Promise<number> {
  const { url, options } = await endpoint(token, path, message ? "POST" : "GET");
  return new Promise((resolve, reject) => {
    const req = request(url, options, response => {
      response.resume();
      resolve(response.statusCode || 502);
    });
    req.on("error", reject);
    req.end(message && JSON.stringify(message));
  });
}

export type MaxLookupPath =
  | "/subscriptions"
  | "/updates?timeout=0&limit=1&types=message_created"
  | `/updates?timeout=0&limit=100&types=message_created&marker=${string}`;
const maxBytes = 128 * 1024;

export async function maxLookupJson(token: string, path: MaxLookupPath): Promise<unknown> {
  const { url, options } = await endpoint(token, path, "GET");
  return new Promise((resolve, reject) => {
    const req = request(url, options, async response => {
      if (response.statusCode !== 200) {
        response.destroy();
        reject(new Error(response.statusCode === 401 || response.statusCode === 403 ? "MAX_AUTH" : "MAX_UNAVAILABLE"));
        return;
      }
      try {
        const chunks: Buffer[] = [];
        let length = 0;
        for await (const chunk of response) {
          length += chunk.length;
          if (length > maxBytes) throw new Error("MAX_RESPONSE_LIMIT");
          chunks.push(chunk);
        }
        resolve(parseMaxJson(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        response.destroy();
        reject(error instanceof SyntaxError ? new Error("MAX_INVALID_RESPONSE") : error);
      }
    });
    req.on("error", reject);
    req.end();
  });
}

// Preserve long integer lexemes before JSON.parse rounds them on Node 20.
// Quoted text (including escapes) and non-integer number tokens pass through intact.
export function parseMaxJson(source: string): unknown {
  const tokens = /"(?:\\[\s\S]|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  return JSON.parse(source.replace(tokens, token => /^-?\d{16,}$/.test(token) ? JSON.stringify(token) : token));
}
