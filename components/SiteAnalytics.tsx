"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { COOKIE_CHOICE_EVENT, COOKIE_CONSENT_KEY, getCookieChoice } from "@/lib/cookie-consent";
import { currentVisit, forgetVisit } from "@/lib/analytics-client";
import { pageKey, type ActionKey } from "@/lib/analytics-contract";

function Tracking() {
  const pathname = usePathname();
  const search = useSearchParams();
  const campaign = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
    .map((k) => search?.get(k) || "")
    .join("/");
  const lastView = useRef("");
  const formSession = useRef("");
  useEffect(() => {
    const page = pageKey(pathname || "");
    if (!page) lastView.current = "";
    function send(action: ActionKey, documentSlug?: string) {
      if (!page || document.querySelector(".system-state")) return;
      const visit = currentVisit();
      if (!visit) return;
      const viewKey = visit.session + pathname;
      const resource =
        documentSlug || (page === "article" || page === "document" ? pathname?.split("/")[2] : undefined);
      if (action === "view" && lastView.current === viewKey) return;
      if (action === "form" && formSession.current === visit.session) return;
      if (action === "view") lastView.current = viewKey;
      if (action === "form") formSession.current = visit.session;
      void fetch("/api/analytics", {
        method: "POST",
        keepalive: true,
        referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, id: crypto.randomUUID(), visit, page, action, resource }),
      }).catch(() => {});
    }
    function consentChanged() {
      if (getCookieChoice() === "all") send("view");
      else {
        forgetVisit();
        lastView.current = "";
        formSession.current = "";
      }
    }
    function onStorage(event: StorageEvent) {
      if (event.key === COOKIE_CONSENT_KEY || event.key === null) consentChanged();
    }
    function onClick(event: MouseEvent) {
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      const folder = event.target.closest<HTMLButtonElement>("button[data-document]");
      if (folder) {
        send("document", folder.dataset.document);
        return;
      }
      if (event.target.closest("button.sb-fleet-open")) {
        send("vehicle");
        return;
      }
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;
      if (link.protocol === "tel:") send("phone");
      else if (link.protocol === "mailto:") send("email");
      else if (link.origin === location.origin) {
        if (link.closest("#services") && link.hash === "#contact") send("service");
        else if (link.closest("#transport") && link.hash === "#contact") send("vehicle");
        else if (link.hash === "#contact") send("request");
        else if (link.pathname.startsWith("/documents/")) send("document", link.pathname.split("/")[2]);
      }
    }
    function onFocus(event: FocusEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest(".sb-contact-form input, .sb-contact-form textarea")
      )
        send("form");
    }
    consentChanged();
    window.addEventListener(COOKIE_CHOICE_EVENT, consentChanged);
    window.addEventListener("storage", onStorage);
    if (page) {
      document.addEventListener("click", onClick, true);
      document.addEventListener("focusin", onFocus);
    }
    return () => {
      window.removeEventListener(COOKIE_CHOICE_EVENT, consentChanged);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("focusin", onFocus);
    };
  }, [pathname, campaign]);
  return null;
}

export default function SiteAnalytics() {
  return (
    <Suspense fallback={null}>
      <Tracking />
    </Suspense>
  );
}
