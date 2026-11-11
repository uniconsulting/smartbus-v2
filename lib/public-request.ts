type PublicJson = { body: Record<string, unknown>; response?: never } | { body?: never; response: Response };

function rejected(status: number, error: string): PublicJson {
  return { response: Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } }) };
}

export function rateLimitedResponse(retryAfter: number) {
  return Response.json({ error: "Слишком много запросов. Попробуйте позже." }, {
    status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" },
  });
}

export async function readPublicJson(request: Request, maxBytes: number): Promise<PublicJson> {
  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  if (site === "cross-site" || site === "same-site") return rejected(403, "Отправьте форму со страницы сайта.");
  if (origin !== null) {
    const target = new URL(request.url);
    const host = request.headers.get("host") || target.host;
    const forwarded = process.env.SMARTBUS_TRUST_PROXY === "1" && request.headers.get("x-forwarded-proto");
    const protocol = forwarded === "https" || forwarded === "http" ? forwarded + ":" : target.protocol;
    if (origin !== protocol + "//" + host) return rejected(403, "Отправьте форму со страницы сайта.");
  }
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  const encoding = request.headers.get("content-encoding");
  if (mediaType !== "application/json" || (encoding && encoding.toLowerCase() !== "identity"))
    return rejected(415, "Требуется запрос в формате JSON.");
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes))
    return rejected(413, "Слишком большой запрос.");
  if (!request.body) return rejected(400, "Некорректные данные формы.");

  const reader = request.body.getReader();
  const bytes = new Uint8Array(maxBytes);
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value.byteLength > maxBytes - size) {
        void reader.cancel().catch(() => {});
        return rejected(413, "Слишком большой запрос.");
      }
      bytes.set(value, size);
      size += value.byteLength;
    }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, size)));
    if (value && typeof value === "object" && !Array.isArray(value)) return { body: value as Record<string, unknown> };
  } catch {
    // Malformed JSON, invalid UTF-8 or a disconnected client.
  } finally {
    reader.releaseLock();
  }
  return rejected(400, "Некорректные данные формы.");
}
