"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { CatalogDocument } from "@/lib/documents";

const DocumentViewer = dynamic(() => import("@/components/ui/document-viewer"), { ssr: false });
const ViewerContext = createContext<((id: string) => void) | null>(null);

export function useDocumentViewer() {
  const open = useContext(ViewerContext);
  if (!open) throw new Error("Document viewer provider is missing");
  return open;
}

function idFromHref(href: string) {
  const document = /^\/documents\/([a-z0-9-]+)$/.exec(href);
  if (document) return document[1];
  if (href.startsWith("/documents?")) return new URLSearchParams(href.split("?")[1]).get("document");
  if (href === "/docs/company-card-smartbus.pdf") return "company";
  if (href === "/docs/license-smartbus.pdf") return "license";
  return /^\/docs\/([a-z0-9-]+)\.pdf$/.exec(href)?.[1];
}

export default function DocumentViewerProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<CatalogDocument | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const active = useRef<AbortController | null>(null);
  const open = useCallback(async (id:string) => {
    if (!/^[a-z0-9-]{1,100}$/.test(id)) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    try {
      const response = await fetch(`/api/documents/${id}`,{cache:"no-store",signal:controller.signal});
      if (!response.ok) throw new Error("unavailable");
      const doc:CatalogDocument = await response.json();
      if (!controller.signal.aborted) setSelected(doc);
    } catch {
      if (!controller.signal.aborted) router.push(`/documents/${id}`);
    }
  }, [router]);
  useEffect(() => {
    setSelected(null);
    if (pathname === "/documents") {
      const id = new URLSearchParams(window.location.search).get("document");
      if (id) void open(id);
    }
    return () => active.current?.abort();
  }, [pathname,open]);
  return <ViewerContext.Provider value={open}>{children}{selected && <DocumentViewer key={selected.id} document={selected} onClose={() => setSelected(null)} />}</ViewerContext.Provider>;
}

export function DocumentLink({ href, children, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const open = useContext(ViewerContext);
  return <a {...props} href={href} onClick={(event) => {
    onClick?.(event);
    const id=idFromHref(href);
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && open && id) {
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
      open(id);
    }
  }}>{children}</a>;
}
