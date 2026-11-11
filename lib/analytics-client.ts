import { getCookieChoice } from "./cookie-consent";
import { isId, pageKey, readVisit, referringSource, tag, type Visit } from "./analytics-contract";

const visitKey = "smartbus:analytics:visit";
const visitorKey = "smartbus:analytics:visitor";
const halfHour = 30 * 60 * 1000;
let memory: { visit: Visit; last: number } | null = null;

export function forgetVisit() {
  memory = null;
  try {
    sessionStorage.removeItem(visitKey);
    localStorage.removeItem(visitorKey);
  } catch {
    /* Storage can be disabled. */
  }
}

export function currentVisit(): Visit | null {
  if (typeof window === "undefined" || getCookieChoice() !== "all") return null;
  const landing = pageKey(window.location.pathname);
  if (!landing || !window.crypto.randomUUID) return null;
  try {
    if (!memory) {
      const raw = JSON.parse(sessionStorage.getItem(visitKey) || "null");
      const visit = readVisit(raw?.visit);
      if (visit && typeof raw.last === "number") memory = { visit, last: raw.last };
    }
    const now = Date.now();
    const query = new URLSearchParams(window.location.search);
    const tags = {
      source: tag(query.get("utm_source")),
      medium: tag(query.get("utm_medium"), "medium"),
      campaign: tag(query.get("utm_campaign"), "campaign"),
      content: tag(query.get("utm_content"), "content"),
      term: tag(query.get("utm_term"), "term"),
    };
    const tagged = Object.values(tags).some(Boolean);
    const changed =
      tagged &&
      Object.entries(tags).some(
        ([key, value]) => (value || (key === "source" ? "direct" : "")) !== memory?.visit[key as keyof Visit],
      );
    if (!memory || changed || now - memory.last >= halfHour) {
      const saved = localStorage.getItem(visitorKey);
      const visitor = isId(saved) ? saved : crypto.randomUUID();
      localStorage.setItem(visitorKey, visitor);
      memory = {
        last: now,
        visit: {
          visitor,
          session: crypto.randomUUID(),
          landing,
          ...tags,
          source: tags.source || (tagged ? "direct" : referringSource(document.referrer, location.hostname)),
        },
      };
    }
    memory.last = now;
    sessionStorage.setItem(visitKey, JSON.stringify(memory));
    return memory.visit;
  } catch {
    return null;
  }
}
