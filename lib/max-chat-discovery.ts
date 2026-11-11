import type { MaxLookupPath } from "./integrations-max";

export type Challenge = { command: string; issued: number; marker: string; bot: string };
export type Lookup = { id: string } | { error: string };
type FetchJson = (path: MaxLookupPath) => Promise<unknown>;

export const expired = "Команда устарела. Нажмите «Получить новую команду».";
const ttl = 5 * 60 * 1000;
const pageSize = 100;
const maxPages = 3;
const webhook = "У бота подключён webhook. Попросите администратора бота взять chat_id из события bot_added или message.recipient.chat_id из события message_created нужной группы.";
const missing = "MAX пока не вернул сообщение с командой. Проверьте, что в группу добавлен именно бот с сохранённым токеном и у него есть права администратора на чтение сообщений. Отправьте команду отдельным сообщением и повторите проверку.";

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function exactInt64(value: unknown) {
  if (typeof value === "number" && !Number.isSafeInteger(value)) return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = String(value);
  if (!/^(?:0|-?[1-9]\d{0,18})$/.test(text)) return null;
  const n = BigInt(text);
  return n >= BigInt("-9223372036854775808") && n <= BigInt("9223372036854775807") ? text : null;
}

export function exactChatId(value: unknown) {
  const id = exactInt64(value);
  return id === "0" ? null : id;
}

async function hasWebhook(fetchJson: FetchJson) {
  const subscriptions = object(await fetchJson("/subscriptions")).subscriptions;
  if (!Array.isArray(subscriptions)) throw new Error("MAX_INVALID_RESPONSE");
  return subscriptions.length > 0;
}

export async function captureLookupMarker(fetchJson: FetchJson): Promise<{ marker: string } | { error: string }> {
  if (await hasWebhook(fetchJson)) return { error: webhook };
  const response = object(await fetchJson("/updates?timeout=0&limit=1&types=message_created"));
  if (!Array.isArray(response.updates) || response.updates.length > 1) throw new Error("MAX_INVALID_RESPONSE");
  const marker = exactInt64(response.marker);
  if (marker === null) return { error: "MAX не вернул позицию в очереди событий. Попробуйте получить команду позже." };
  return { marker };
}

export async function locateGroup(challenge: Challenge, fetchJson: FetchJson): Promise<Lookup> {
  let marker = exactInt64(challenge.marker);
  const started = Date.now();
  if (marker === null || !Number.isSafeInteger(challenge.issued) || challenge.issued > started || started - challenge.issued > ttl) return { error: expired };
  if (await hasWebhook(fetchJson)) return { error: webhook };

  const visited = new Set<string>();
  let found: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    visited.add(marker);
    const response = object(await fetchJson(`/updates?timeout=0&limit=100&types=message_created&marker=${marker}`));
    const now = Date.now();
    if (now - challenge.issued > ttl) return { error: expired };
    if (!Array.isArray(response.updates) || response.updates.length > pageSize) throw new Error("MAX_INVALID_RESPONSE");
    for (const item of response.updates) {
      const event = object(item);
      const message = object(event.message);
      const recipient = object(message.recipient);
      const stamp = event.timestamp;
      if (event.update_type !== "message_created" || recipient.chat_type !== "chat" ||
        typeof stamp !== "number" || !Number.isSafeInteger(stamp) || stamp < challenge.issued || stamp > now + 5000 ||
        object(message.body).text !== challenge.command) continue;
      const id = exactChatId(recipient.chat_id);
      if (!id) return { error: "MAX не вернул точный числовой ID группы." };
      if (found !== null && found !== id)
        return { error: "Команда появилась в нескольких группах. Получите новую команду и отправьте её только в нужную группу." };
      found = id;
    }
    // Do not advance or acknowledge the trailing cursor when the current batch is complete.
    if (response.updates.length < pageSize || response.marker === null) return found ? { id: found } : { error: missing };
    marker = exactInt64(response.marker);
    if (marker === null || visited.has(marker)) throw new Error("MAX_INVALID_RESPONSE");
  }
  return { error: "За время проверки поступило слишком много сообщений. Получите новую команду и повторите проверку сразу после отправки." };
}
