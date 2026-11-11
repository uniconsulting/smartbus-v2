"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import type { CatalogDocument } from "@/lib/documents";
import styles from "./glass-folder-cards.module.css";

// Adapted from the supplied Glass Folder reference: back, loose sheets and a
// translucent front hinged on its bottom edge. The artwork uses SmartBus colours.
// Only the shaped top uses SVG. The lower cover grows with the copy,
// preserving circular corners and room for every line at any viewport width.
const BACK = "M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 56Z";
const FRONT = "M0 71A22 22 0 0 1 22 49L118 49C144 49 146 85 172 85L318 85A22 22 0 0 1 340 107L0 107Z";

export default function GlassFolder({ document, onOpen, compact = false }: { document: CatalogDocument; onOpen: () => void; compact?: boolean }) {
  return <button className={styles.folder} data-document={document.id} data-tone={document.tone} data-kind={document.kind} data-compact={compact || undefined} onClick={event => { event.currentTarget.focus({ preventScroll: true }); onOpen(); }} aria-label={`Открыть документ: ${document.title}`} aria-haspopup="dialog" type="button">
    <span className={styles.stage}>
      <span className={styles.shadow} aria-hidden="true" />
      <span className={styles.back} aria-hidden="true"><svg viewBox="0 0 340 56"><path d={BACK} /></svg></span>
      <span className={`${styles.sheet} ${styles.sheetBack}`} aria-hidden="true"><i /><i /><i /><i /></span>
      <span className={`${styles.sheet} ${styles.sheetTop}`} aria-hidden="true"><img src="/brand/logo.webp" alt="" /><i /><i /><i /><i /></span>
      <span className={styles.front}>
        <svg viewBox="0 0 340 107" preserveAspectRatio="none" aria-hidden="true"><path d={FRONT} /></svg>
        <span className={styles.copy}>
          <strong>{document.folderTitle}</strong>
          <span className={styles.description}>{document.description}</span>
          <span className={styles.meta}>{document.meta}</span>
        </span>
        <span className={styles.open} aria-hidden="true"><HugeiconsIcon icon={ArrowUpRight01Icon} size={20} aria-hidden="true" /></span>
      </span>
    </span>
  </button>;
}
