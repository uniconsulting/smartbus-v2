import { maxRequest } from "./integrations-max";
import "server-only";
import { openSecret, sealSecret } from "./integration-crypto.mjs";
import { readRecord, writeRecord } from "@/lib/admin-store";

export const deliveryModes = ["auto", "max", "telegram", "local"] as const;
export type DeliveryMode = (typeof deliveryModes)[number];
type Config = {
  mode: DeliveryMode;
  maxToken?: string;
  telegramToken?: string;
  maxChat?: string;
  maxUser?: string;
  telegramChat?: string;
};
const fallback: Config = { mode: "auto" };
const record = () => readRecord<Config>("integrations", fallback);
function targets(c: Config) {
  return {
    maxChat: c.maxChat ?? process.env.MAX_CHAT_ID ?? "",
    maxUser: c.maxUser ?? process.env.MAX_USER_ID ?? "",
    telegramChat: c.telegramChat ?? process.env.TELEGRAM_CHAT_ID ?? "",
  };
}
export async function integrationSettings() {
  const { value, revision } = await record();
  return {
    ...targets(value),
    revision,
    mode: value.mode,
    maxSecret: value.maxToken ? "stored" : process.env.MAX_BOT_TOKEN ? "environment" : "missing",
    telegramSecret: value.telegramToken
      ? "stored"
      : process.env.TELEGRAM_BOT_TOKEN
        ? "environment"
        : "missing",
  };
}
export async function saveIntegrations(data: FormData) {
  const { value } = await record();
  const str = (key: string) => String(data.get(key) ?? "").trim();
  const revision = Number(str("revision")),
    mode = str("mode") as DeliveryMode;
  if (!Number.isSafeInteger(revision) || !deliveryModes.includes(mode))
    throw new Error("Некорректные настройки.");
  const maxChat = str("maxChat"),
    maxUser = str("maxUser"),
    telegramChat = str("telegramChat");
  if ((maxChat && !/^-?[1-9]\d{0,18}$/.test(maxChat)) || (maxUser && !/^[1-9]\d{0,18}$/.test(maxUser)))
    throw new Error("Введите числовой ID чата или пользователя MAX.");
  if (telegramChat && !/^(?:-?[1-9]\d{0,18}|@[A-Za-z][A-Za-z_0-9]{4,31})$/.test(telegramChat))
    throw new Error("Проверьте ID чата Telegram.");
  const next = { ...value, mode, maxChat, maxUser, telegramChat };
  for (const provider of ["max", "telegram"] as const) {
    const field = provider === "max" ? "maxToken" : "telegramToken";
    const token = str(field);
    if (token) {
      if (!/^[A-Za-z0-9_:.-]{10,512}$/.test(token)) throw new Error("Проверьте формат токена.");
      next[field] = await sealSecret(token, provider);
    } else if (str("clear-" + provider) === "on") delete next[field];
  }
  return writeRecord("integrations", next, revision);
}
export type Destination = { provider: "max" | "telegram"; token: string; id: string; kind: "chat_id" | "user_id" };
export async function destination(): Promise<Destination | null> {
  const { value } = await record();
  if (value.mode === "local") return null;
  const ids = targets(value);
  const pickMax =
    value.mode === "max" || (value.mode === "auto" && !!(value.maxToken || process.env.MAX_BOT_TOKEN));
  if (pickMax) {
    const token = value.maxToken ? await openSecret(value.maxToken, "max") : process.env.MAX_BOT_TOKEN;
    return token && (ids.maxChat || ids.maxUser)
      ? { provider: "max", token, kind: ids.maxChat ? "chat_id" : "user_id", id: ids.maxChat || ids.maxUser }
      : null;
  }
  const token = value.telegramToken
    ? await openSecret(value.telegramToken, "telegram")
    : process.env.TELEGRAM_BOT_TOKEN;
  return token && ids.telegramChat
    ? { provider: "telegram", token, kind: "chat_id", id: ids.telegramChat }
    : null;
}

function maxTokenOf(value: Config) {
  return value.maxToken ? openSecret(value.maxToken, "max") : process.env.MAX_BOT_TOKEN;
}

export async function savedMaxToken() {
  const { value } = await record();
  return maxTokenOf(value);
}

export async function checkMaxConnection() {
  const { value } = await record();
  const token = await maxTokenOf(value);
  if (!token) return "Сначала сохраните токен MAX.";
  const auth = await maxRequest(token, "/me");
  if (auth === 401 || auth === 403) return "MAX отклонил токен. Проверьте сохранённый токен бота.";
  if (auth !== 200) return "MAX ответил HTTP " + auth + ". Повторите проверку позже.";
  const { maxChat, maxUser } = targets(value);
  if (!maxChat)
    return maxUser
      ? "Токен действителен. Для личного диалога пользователь должен начать разговор с ботом."
      : "Токен действителен. Укажите ID получателя для доставки.";
  if (!/^-?[1-9]\d{0,18}$/.test(maxChat)) return "Проверьте числовой ID группы MAX.";
  const member = await maxRequest(token, "/chats/" + maxChat + "/members/me");
  if (member === 200) return "Токен действителен. Участие бота в указанном чате подтверждено.";
  if (member === 403 || member === 404)
    return "Токен действителен, но чат недоступен. Проверьте ID и добавьте бота в группу.";
  return "Проверка участия в чате вернула HTTP " + member + ".";
}
