import { open } from "node:fs/promises";
import { Readable } from "node:stream";

function byteRange(header: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header);
  if (!match || (!match[1] && !match[2]) || !size) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  return start <= end ? { start, end } : null;
}

export async function pdfResponse(path: string, filename: string, request: Request) {
  const file = await open(path, "r").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!file) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

  let streaming = false;
  try {
    const { size } = await file.stat();
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
      "Content-Length": String(size),
    });
    if (request.method === "HEAD") return new Response(null, { headers });

    const range = request.headers.get("range");
    // Published content can change at this URL. Without a matching validator,
    // If-Range requires a complete response. Multipart ranges are optional.
    const partial = range !== null && /^bytes=/i.test(range) && !range.includes(",") && !request.headers.has("if-range");
    let start = 0, end = size - 1;
    if (partial) {
      const selected = byteRange(range, size);
      if (!selected) {
        headers.set("Content-Range", `bytes */${size}`);
        headers.set("Content-Length", "0");
        return new Response(null, { status: 416, headers });
      }
      ({ start, end } = selected);
      headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
      headers.set("Content-Length", String(end - start + 1));
    }
    if (!size) return new Response(null, { headers });

    const stream = file.createReadStream({ start, end, autoClose: true, signal: request.signal });
    const body = Readable.toWeb(stream, { strategy: { highWaterMark: 1 } }) as ReadableStream<Uint8Array>;
    const response = new Response(body, { status: partial ? 206 : 200, headers });
    streaming = true;
    return response;
  } finally {
    // The stream owns the handle until EOF, a read error or client cancellation.
    if (!streaming) await file.close();
  }
}
