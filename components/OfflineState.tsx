"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SystemState from "@/components/SystemState";

export default function OfflineState({ onRecovered }: { onRecovered?: () => void }) {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("");
  const inFlight = useRef(false);

  const retry = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    setStatus("");
    try {
      const response = await fetch("/api/health", { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!response.ok || (await response.json()).ok !== true) throw new Error("unavailable");
      if (onRecovered) onRecovered();
      else window.location.replace("/");
    } catch {
      setStatus("Связь пока не восстановлена. Попробуйте ещё раз чуть позже.");
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, [onRecovered]);

  useEffect(() => {
    if (onRecovered && navigator.onLine) void retry();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [onRecovered, retry]);

  return <SystemState kind="offline" onRetry={retry} checking={checking} status={status} />;
}
