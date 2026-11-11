"use client";
import { useEffect } from "react";

/** Preserve normal links (including opening another tab); warn only when this form would be left. */
export function useUnsavedNavigation(dirty: boolean, message = "Покинуть страницу? Несохранённые изменения будут потеряны.") {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      const to = new URL(anchor.href, location.href);
      // The browser handles unloaded documents itself; Next only intercepts same-origin links.
      if (to.origin !== location.origin || (to.pathname === location.pathname && to.search === location.search)) return;
      if (!window.confirm(message)) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty, message]);
}
