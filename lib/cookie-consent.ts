export const COOKIE_CONSENT_KEY = "smartbus-cookie-consent-2026-10-16";
export const COOKIE_CHOICE_EVENT = "smartbus:cookie-choice";
export const COOKIE_SETTINGS_EVENT = "smartbus:cookie-settings";

export type CookieChoice = "necessary" | "all";

export function getCookieChoice(): CookieChoice | null {
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    return value === "necessary" || value === "all" ? value : null;
  } catch {
    return null;
  }
}
