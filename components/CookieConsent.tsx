"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import CookieIcon from "@hugeicons/core-free-icons/CookieIcon";
import { DocumentLink } from "@/components/DocumentViewerProvider";
import { COOKIE_CHOICE_EVENT, COOKIE_CONSENT_KEY, COOKIE_SETTINGS_EVENT, getCookieChoice, type CookieChoice } from "@/lib/cookie-consent";
import "./cookie-consent.css";

type Panel = "notice" | "settings" | null;

export default function CookieConsent() {
  const [panel, setPanel] = useState<Panel>(null);
  const [choice, setChoice] = useState<CookieChoice | null>(null);
  const [draft, setDraft] = useState<CookieChoice>("necessary");
  const noticeRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLDialogElement>(null);
  const settingsTrigger = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const saved = getCookieChoice();
    setChoice(saved);
    if (!saved) setPanel("notice");
  }, []);

  useEffect(() => {
    function showSettings() {
      settingsTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setDraft(choice ?? "necessary");
      setPanel("settings");
    }
    window.addEventListener(COOKIE_SETTINGS_EVENT, showSettings);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, showSettings);
  }, [choice]);

  useEffect(() => {
    if (panel !== "settings") return;
    const dialog = settingsRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      settingsTrigger.current?.focus({ preventScroll: true });
    };
  }, [panel]);

  // Read the home slot once per resize. Scrolling only updates the fixed panel's
  // transform and scale. Inner pages start with the ordinary viewport position.
  useLayoutEffect(() => {
    const notice = noticeRef.current;
    const slot = document.querySelector<HTMLElement>(".sb-cookie-hero-slot");
    if (panel !== "notice" || pathname !== "/" || !notice || !slot) return;

    let frame = 0;
    let originBottom = 0;
    let originRight = 0;
    let originWidth = 0;
    let dockRight = 0;
    let dockBottom = 0;
    let dockWidth = 0;
    let travel = 0;
    let start = 0;
    let lastProgress = -1;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function move() {
      frame = 0;
      const scroll = Math.max(0, window.scrollY);
      const fraction = Math.max(0, Math.min(1, (scroll - start) / travel));
      if (fraction === 1 && lastProgress === 1) return;
      lastProgress = fraction;
      const blend = motion.matches ? Number(fraction >= .25) : fraction * fraction * (3 - 2 * fraction);
      const anchored = 1 - blend;
      const dx = (dockRight - originRight) * anchored;
      const dy = (dockBottom - originBottom - Math.min(scroll, start)) * anchored;
      notice!.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      notice!.style.setProperty("--cookie-width", `${dockWidth + (originWidth - dockWidth) * anchored}px`);
    }

    function measure() {
      const rect = slot!.getBoundingClientRect();
      const css = getComputedStyle(notice!);
      dockRight = parseFloat(css.right);
      dockBottom = parseFloat(css.bottom);
      dockWidth = Math.min(document.documentElement.clientWidth - 2 * dockRight, parseFloat(css.getPropertyValue("--cookie-dock-width")));
      originRight = document.documentElement.clientWidth - rect.right;
      originBottom = window.innerHeight - (rect.bottom + window.scrollY);
      originWidth = rect.width;
      // A short device can place the mobile slot below the fold. Let it enter
      // with the Hero before detaching, so it never blocks the metric controls.
      start = Math.max(0, dockBottom - originBottom);
      travel = Math.min(280, Math.max(160, window.innerHeight * .28));
      lastProgress = -1;
      cancelAnimationFrame(frame);
      move();
    }

    function onScroll() {
      if (!frame && !(lastProgress === 1 && window.scrollY >= start + travel)) {
        frame = requestAnimationFrame(move);
      }
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(slot);
    motion.addEventListener("change", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", measure);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
      notice.style.removeProperty("--cookie-width");
      notice.style.removeProperty("transform");
    };
  }, [panel, pathname]);

  function saveChoice(next: CookieChoice) {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, next);
    } catch {
      // The current visit also works when storage is unavailable.
    }
    setChoice(next);
    window.dispatchEvent(new CustomEvent(COOKIE_CHOICE_EVENT, { detail: next }));
    setPanel(null);
  }

  if (panel === "settings") {
    return (
      <dialog
        ref={settingsRef}
        className="sb-cookie-settings"
        aria-labelledby="sb-cookie-settings-title"
        onCancel={(event) => { event.preventDefault(); setPanel(choice ? null : "notice"); }}
      >
        <h2 id="sb-cookie-settings-title">Настройки cookie</h2>
        <fieldset>
          <legend className="visually-hidden">Какие cookie разрешить</legend>
          <label>
            <input type="radio" name="cookie-choice" value="necessary" checked={draft === "necessary"} onChange={() => setDraft("necessary")} />
            <span>Только необходимые</span>
          </label>
          <label>
            <input type="radio" name="cookie-choice" value="all" checked={draft === "all"} onChange={() => setDraft("all")} />
            <span>Разрешить карту и аналитику</span>
          </label>
        </fieldset>
        <p>При разрешении аналитики SmartBus учитывает источники переходов и действия до отправки заявки. Яндекс Карты используют дополнительные cookie.</p>
        <div className="sb-cookie-settings-actions">
          <button type="button" className="sb-cookie-secondary" onClick={() => setPanel(choice ? null : "notice")}>Отмена</button>
          <button type="button" className="sb-cookie-action" onClick={() => saveChoice(draft)}>Сохранить</button>
        </div>
      </dialog>
    );
  }

  if (panel !== "notice") return null;
  return (
    <aside ref={noticeRef} className="cookie-banner sb-cookie" aria-label="Использование cookie">
      <div className="sb-cookie-copy">
        <HugeiconsIcon icon={CookieIcon} aria-hidden="true" strokeWidth={1.65} />
        <p>Продолжая, вы принимаете<br /> условия <DocumentLink href="/documents/cookies">политики cookie</DocumentLink></p>
      </div>
      <button type="button" className="sb-cookie-action" onClick={() => saveChoice("necessary")}>Понятно</button>
    </aside>
  );
}
