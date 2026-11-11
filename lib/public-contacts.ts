import { site } from "./site";

export const defaultContacts = {
  phone: site.phone,
  dispatchPhone: site.dispatchPhone,
  shortPhone: site.shortPhone,
  email: site.email,
  infoEmail: "info@s-bus.ru",
  officeEmail: "office@s-bus.ru",
  officeAddress: site.officeAddress,
  officeBuilding: site.officeBuilding,
  mapUrl: site.mapUrl,
  mapConstructorEmbedUrl: site.mapConstructorEmbedUrl,
} satisfies Record<string, string>;

export type ContactField = keyof typeof defaultContacts;
export type PublicContacts = Record<ContactField, string>;
export const dispatchStorageKey = "smartbus:public-dispatch-phone";

export function phoneHref(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (value[0] !== "+") {
    if (digits.length === 10) digits = "7" + digits;
    else if (digits.length === 11 && digits[0] === "8") digits = "7" + digits.slice(1);
  }
  return "tel:+" + digits;
}

export function validPhone(value: string): boolean {
  if (value.length > 40 || !/^\+?[\d() \u00a0\u202f-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return value.startsWith("+") ? /^[1-9]\d{6,14}$/.test(digits) : /^(?:[78]\d{10}|\d{10})$/.test(digits);
}
