"use client";

import SystemState from "@/components/SystemState";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SystemState kind="error" onRetry={reset} />;
}
