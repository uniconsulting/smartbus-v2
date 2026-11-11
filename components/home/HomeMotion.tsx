"use client";

import { useEffect, useRef, type ReactNode } from "react";
import "./home-motion.css";

// Each visible row enters in reading order after reaching the viewport's viewing zone.
const items = "[data-enter], [data-enter-list] > *, .sb-heading > h2, .sb-heading > p";

export function HomeMotion({ children }: { children: ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const main = mainRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!main || reduced.matches || !("IntersectionObserver" in window)) return;

    // Keep a short timeline per section across observer callbacks. Small differences
    // in line height must not make the subtitle or a neighbouring card enter at once.
    const lastStart = new Map<Element | null, number>();
    const mobile = window.matchMedia("(max-width: 1279px)");
    const viewingInset = Math.round(Math.min(120, Math.max(56, window.innerHeight * .12)));
    const reveal: IntersectionObserverCallback = (entries, watch) => {
      const now = performance.now();
      const step = mobile.matches ? 100 : 140;
      const eligible = entries.filter((entry) => entry.isIntersecting &&
        (entry.target as HTMLElement).dataset.entrance === "waiting");
      eligible.sort((a, b) => {
        const vertical = a.boundingClientRect.top - b.boundingClientRect.top;
        if (Math.abs(vertical) > 24) return vertical;
        return a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
      for (const entry of eligible) {
        const item = entry.target as HTMLElement;
        watch.unobserve(item);
        const section = item.closest(".sb-section");
        const start = Math.min(now + step * 3, Math.max(now, (lastStart.get(section) ?? -Infinity) + step));
        item.style.setProperty("--enter-delay", `${Math.round(start - now)}ms`);
        item.dataset.entrance = "arriving";
        lastStart.set(section, start);
      }
    };
    const observer = new IntersectionObserver(reveal, { rootMargin: `0px 0px -${viewingInset}px 0px` });
    // Very short content at the document bottom cannot reach the inset viewing zone.
    const endObserver = new IntersectionObserver(reveal);

    // Leave the first paint, the restored scroll position and server-rendered HTML immediately readable.
    const candidates = Array.from(main.querySelectorAll<HTMLElement>(items));
    const belowFold = candidates.filter((item) => {
      const box = item.getBoundingClientRect();
      return box.height > 0 && box.top >= window.innerHeight;
    });
    for (const item of belowFold) {
      item.dataset.entrance = "waiting";
      const bottomClearance = document.documentElement.scrollHeight -
        (item.getBoundingClientRect().top + window.scrollY);
      (bottomClearance <= viewingInset ? endObserver : observer).observe(item);
    }

    function finish(item: HTMLElement) {
      observer.unobserve(item);
      endObserver.unobserve(item);
      delete item.dataset.entrance;
      item.style.removeProperty("--enter-delay");
    }
    function jumpToSection(hash: string) {
      if (!hash) return;
      const section = document.getElementById(hash.slice(1))?.closest(".sb-section");
      section?.querySelectorAll<HTMLElement>("[data-entrance]").forEach(finish);
    }
    const onHashChange = () => jumpToSection(window.location.hash);
    function onLink(event: MouseEvent) {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (link && link.origin === location.origin && link.pathname === location.pathname &&
          !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) jumpToSection(link.hash);
    }
    function onFocus(event: FocusEvent) {
      const item = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-entrance]") : null;
      if (item) finish(item);
    }
    function onAnimationEnd(event: AnimationEvent) {
      if (event.animationName === "sb-home-enter-opacity" && event.target instanceof HTMLElement) finish(event.target);
    }
    function settleAll() {
      observer.disconnect();
      endObserver.disconnect();
      belowFold.forEach(finish);
    }
    const onMotionChange = () => { if (reduced.matches) settleAll(); };
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) settleAll(); };

    onHashChange();
    main.addEventListener("animationend", onAnimationEnd);
    main.addEventListener("focusin", onFocus);
    main.addEventListener("click", onLink, true);
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("pageshow", onPageShow);
    reduced.addEventListener("change", onMotionChange);
    return () => {
      settleAll();
      main.removeEventListener("animationend", onAnimationEnd);
      main.removeEventListener("focusin", onFocus);
      main.removeEventListener("click", onLink, true);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("pageshow", onPageShow);
      reduced.removeEventListener("change", onMotionChange);
    };
  }, []);

  return <main className="sb-home" ref={mainRef}>{children}</main>;
}
