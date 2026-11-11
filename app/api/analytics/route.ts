import { actions, pages, isId, readVisit, type ActionKey, type PageKey } from "@/lib/analytics-contract";
import { getPublishedArticles } from "@/lib/cms-articles";
import { getPublishedDocument } from "@/lib/cms-documents";
import { storeEvent } from "@/lib/analytics-store";
import { trustedClientIp } from "@/lib/client-ip";
import { readPublicJson, rateLimitedResponse } from "@/lib/public-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = await readPublicJson(request, 2048);
  if (input.response) return input.response;
  const data = input.body;
  const visit = readVisit(data.visit);
  if (data.consent !== true || !visit || !isId(data.id) ||
    typeof data.page !== "string" || !Object.hasOwn(pages, data.page) ||
    typeof data.action !== "string" || !Object.hasOwn(actions, data.action))
    return new Response(null, { status: 400 });

  const resource = data.resource;
  let resolveResource: (() => Promise<string | undefined>) | undefined;
  if (typeof resource === "string" && /^[a-z0-9-]{1,120}$/.test(resource)) {
    if (data.action === "document" || data.page === "document")
      resolveResource = async () => (await getPublishedDocument(resource))?.id;
    else if (data.page === "article")
      resolveResource = async () => (await getPublishedArticles()).find(a => a.slug === resource)?.slug;
  }
  const stored = await storeEvent({
    id: data.id, visit, page: data.page as PageKey, action: data.action as ActionKey,
  }, trustedClientIp(request.headers), resolveResource);
  if (stored.status === "limited") return rateLimitedResponse(stored.retryAfter);
  return new Response(null, { status: 204 });
}
