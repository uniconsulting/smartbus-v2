"use client";

import { useEffect, type ComponentProps } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LEAD_REQUEST_EVENT, leadRequestHref } from "@/lib/lead-request";

export default function LeadRequestLink({ task, children, onClick, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { task: string }) {
  return <Link {...props} href={leadRequestHref(task)} onClick={event => {
    onClick?.(event);
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && props.target !== "_blank" && window.location.pathname === "/") {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent(LEAD_REQUEST_EVENT, { detail: task }));
    }
  }}>{children}</Link>;
}

export function LeadRequestFromUrl({ onRequest }: { onRequest: (task: string) => void }) {
  const params = useSearchParams();
  const task = params?.get("request")?.trim().slice(0, 500);
  useEffect(() => { if (task) onRequest(task); }, [task, onRequest]);
  return null;
}
