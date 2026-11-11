export const pages = {
  home: "Главная",
  articles: "Статьи",
  article: "Материал",
  contacts: "Контакты",
  documents: "Документы",
  document: "Юридический документ",
} as const;

export const actions = {
  view: "Просмотр страницы",
  service: "Выбор услуги",
  vehicle: "Выбор транспорта",
  request: "Переход к заявке",
  phone: "Нажатие на телефон",
  email: "Нажатие на почту",
  form: "Начало заполнения",
  document: "Открытие документа",
} as const;
export type PageKey = keyof typeof pages;
export type ActionKey = keyof typeof actions;
export type Visit = {
  session: string;
  visitor: string;
  landing: PageKey;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
};
export type SiteEvent = { id: string; visit: Visit; page: PageKey; action: ActionKey; resource?: string };

export function pageKey(path: string): PageKey | null {
  if (path === "/") return "home";
  if (path === "/articles") return "articles";
  if (path.startsWith("/articles/")) return "article";
  if (path === "/documents") return "documents";
  if (path.startsWith("/documents/")) return "document";
  if (path === "/contacts") return "contacts";
  return null;
}

export function isId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value)
  );
}

export function newRequestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (n) => n.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

type TagKind = "source" | "medium" | "campaign" | "content" | "term";
export function tag(value: unknown, kind: TagKind = "source"): string {
  if (typeof value !== "string") return "";
  const clean = value.trim().toLowerCase();
  // Ad platforms often use long numeric IDs for campaigns and creatives.
  if ((kind === "campaign" || kind === "content") && /^\d{1,20}$/.test(clean)) {
    return /^(?:[78]\d{10}|9\d{9})$/.test(clean) ? "" : clean;
  }
  if (/\d{10}/.test(clean.replace(/[-_\s]/g, ""))) return "";
  if (kind === "term") {
    if (clean.length > 64 || !/^[a-zа-яё0-9_-]+(?: [a-zа-яё0-9_-]+){0,5}$/i.test(clean)) return "";
    return clean;
  }
  return /^[a-zа-яё0-9][a-zа-яё0-9_-]{0,47}$/i.test(clean) ? clean : "";
}
export function readVisit(input: unknown): Visit | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Partial<Visit>;
  if (!isId(v.session) || !isId(v.visitor) || typeof v.landing !== "string" || !Object.hasOwn(pages, v.landing)) return null;
  return {
    session: v.session,
    visitor: v.visitor,
    landing: v.landing,
    source: tag(v.source) || "direct",
    medium: tag(v.medium, "medium"),
    campaign: tag(v.campaign, "campaign"),
    content: tag(v.content, "content"),
    term: tag(v.term, "term"),
  };
}

export function referringSource(referrer: string, ourHost: string): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname;
    if (host === ourHost) return "direct";
    for (const [domain, label] of Object.entries({
      "yandex.ru": "yandex",
      "ya.ru": "yandex",
      "google.com": "google",
      "google.ru": "google",
      "bing.com": "bing",
      "vk.com": "vk",
      "t.me": "telegram",
      "max.ru": "max",
    })) {
      if (host === domain || host.endsWith("." + domain)) return label;
    }
    return "referral";
  } catch {
    return "direct";
  }
}
