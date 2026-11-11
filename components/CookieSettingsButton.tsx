"use client";

import { COOKIE_SETTINGS_EVENT } from "@/lib/cookie-consent";

export default function CookieSettingsButton() {
  return (
    <button
      type="button"
      className="footer-cookie-settings"
      aria-haspopup="dialog"
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true });
        window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
      }}
    >
      Настройки cookie
    </button>
  );
}
