"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OfflineState from "@/components/OfflineState";

export default function SiteAvailability() {
  const [offline, setOffline] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const recovered = useCallback(() => setOffline(false), []);

  useEffect(() => {
    const disconnected = () => {
      if (window.location.pathname !== "/offline") setOffline(true);
    };
    if (!navigator.onLine) disconnected();
    window.addEventListener("offline", disconnected);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        // The current page still handles connection loss if offline caching is unavailable.
      });
    }
    return () => {
      window.removeEventListener("offline", disconnected);
    };
  }, []);

  useEffect(() => {
    if (offline && !dialog.current?.open) dialog.current?.showModal();
    if (!offline && dialog.current?.open) dialog.current.close();
  }, [offline]);

  return (
    <dialog ref={dialog} className="offline-dialog" aria-label="Нет соединения с сайтом" onCancel={(event) => event.preventDefault()}>
      {offline && <OfflineState onRecovered={recovered} />}
    </dialog>
  );
}
