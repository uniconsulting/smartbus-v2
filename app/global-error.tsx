"use client";

import SystemState from "@/components/SystemState";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="ru"><head><link rel="icon" href="/favicon.svg" type="image/svg+xml" /></head><body style={{ margin: 0 }}><SystemState kind="error" onRetry={reset} /></body></html>;
}
