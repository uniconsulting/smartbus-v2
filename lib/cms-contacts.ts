import "server-only";

import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { readRecord, writeRecord } from "@/lib/admin-store";
import { defaultContacts, validPhone, type ContactField, type PublicContacts } from "./public-contacts";

const key = "contacts";
const allowedFields = Object.keys(defaultContacts) as ContactField[];

function mapAddress(value: string, embed: boolean): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (!["yandex.ru", "www.yandex.ru", "yandex.com", "www.yandex.com"].includes(url.hostname)) return false;
    return embed ? /^\/map-widget\/v1\/?$/.test(url.pathname) : /^\/maps(?:\/|$)/.test(url.pathname);
  } catch { return false; }
}

function validate(field: ContactField, value: string): string | null {
  if (!value || /[\u0000-\u001f\u007f]/.test(value)) return "Заполните поле одной строкой.";
  switch (field) {
    case "phone":
    case "dispatchPhone":
      return validPhone(value) ? null : "Введите полный номер. Для международного номера укажите + и код страны.";
    case "shortPhone":
      return /^\*?\d{2,8}#?$/.test(value) ? null : "Введите короткий номер, например *7305.";
    case "email":
    case "infoEmail":
    case "officeEmail":
      return value.length <= 254 && /^[A-Z0-9._%+'-]{1,64}@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+$/i.test(value)
        ? null : "Укажите один адрес электронной почты.";
    case "mapUrl":
    case "mapConstructorEmbedUrl": {
      const embed = field === "mapConstructorEmbedUrl";
      if (value.length <= 2048 && mapAddress(value, embed)) return null;
      return embed ? "Нужна HTTPS-ссылка конструктора Яндекс Карт с путём /map-widget/v1/."
        : "Нужна HTTPS-ссылка Яндекс Карт с путём /maps/.";
    }
    default:
      return value.length <= 350 ? null : "В этом поле можно указать до 350 символов.";
  }
}

export const getContactRecord = cache(async () => {
  noStore();
  const record = await readRecord<PublicContacts>(key, defaultContacts);
  const value: PublicContacts = { ...defaultContacts };
  // Only pass known public fields on to the browser, even if the record format changes.
  for (const field of allowedFields) {
    const text = record.value?.[field];
    if (typeof text === "string" && !validate(field, text)) value[field] = text;
  }
  return { value, revision: record.revision };
});

export async function getPublicContacts(): Promise<PublicContacts> {
  return (await getContactRecord()).value;
}

type ContactWriteResult = { revision: number } | { field: ContactField; error: string };

export async function saveContacts(form: FormData, revision: number): Promise<ContactWriteResult> {
  const value: PublicContacts = { ...defaultContacts };
  for (const field of allowedFields) {
    const entry = form.get(field);
    const text = typeof entry === "string" ? entry.trim() : "";
    const error = validate(field, text);
    if (error) return { field, error };
    value[field] = text;
  }
  return { revision: await writeRecord(key, value, revision) };
}
