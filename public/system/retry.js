"use strict";

// Apply the dispatch number saved during the last online visit to this device.
try {
  const display = localStorage.getItem("smartbus:public-dispatch-phone");
  if (display && display.length <= 40 && /^\+?[\d() \u00a0\u202f-]+$/.test(display)) {
    let digits = display.replace(/\D/g, "");
    if (!display.startsWith("+") && digits.length === 10) digits = "7" + digits;
    else if (!display.startsWith("+") && /^8\d{10}$/.test(digits)) digits = "7" + digits.slice(1);
    if (/^[1-9]\d{6,14}$/.test(digits)) {
      document.querySelectorAll("[data-dispatch]").forEach((link) => {
        link.href = "tel:+" + digits;
        if (link.hasAttribute("data-show-number")) link.textContent = display;
      });
    }
  }
} catch { /* Keep the bundled number when browser storage is inaccessible. */ }


const retryButton = document.querySelector("[data-retry]");
const retryStatus = document.querySelector(".state-status");
const isOfflinePage = document.querySelector(".system-state")?.dataset.kind === "offline";

async function retry() {
  if (!retryButton || retryButton.disabled) return;
  retryButton.disabled = true;
  const originalText = retryButton.textContent;
  retryButton.textContent = "Проверяем связь…";
  retryStatus.textContent = "";
  try {
    const response = await fetch("/api/health", { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok || (await response.json()).ok !== true) throw new Error("unavailable");

    if (["/500", "/system/offline.html", "/system/unavailable.html"].includes(location.pathname)) {
      location.replace("/");
    } else {
      location.reload();
    }
  } catch {
    retryStatus.textContent = isOfflinePage
      ? "Связь пока не восстановлена. Попробуйте ещё раз чуть позже."
      : "Сайт пока недоступен. Попробуйте ещё раз чуть позже.";
    retryButton.disabled = false;
    retryButton.textContent = originalText;
  }
}

retryButton?.addEventListener("click", retry);
if (isOfflinePage) window.addEventListener("online", retry);
