"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon";
import GlassFolder from "@/components/ui/glass-folder-cards";
import { useDocumentViewer } from "@/components/DocumentViewerProvider";
import type { CatalogDocument } from "@/lib/documents";
import styles from "./DocumentsLibrary.module.css";

function FolderRow({ documents, id, title, description, compact = false }: { documents: CatalogDocument[]; id: string; title: string; description: string; compact?: boolean }) {
  const open = useDocumentViewer();
  const track = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState({ left: false, right: false });
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      const style = window.getComputedStyle(el);
      const leftInset = Number.parseFloat(style.paddingLeft) || 0;
      const rightInset = Number.parseFloat(style.paddingRight) || 0;
      setPosition({
        left: el.scrollLeft > leftInset + 2,
        right: el.scrollWidth - el.clientWidth - el.scrollLeft > rightInset + 2,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); el.removeEventListener("scroll", update); };
  }, []);
  const move = (direction: number) => {
    const el = track.current;
    if (!el) return;
    const step = el.firstElementChild?.getBoundingClientRect().width ?? 280;
    const gap = Number.parseFloat(window.getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: direction * (step + gap), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  return <section className={styles.group} aria-labelledby={`${id}-title`}>
    <div className={styles.heading}>
      <div><h2 id={`${id}-title`}>{title.replace(/\u00a0/g, " ")}</h2><p>{description}</p></div>
      {(position.left || position.right) && <div className={styles.controls}>
        <button type="button" onClick={() => move(-1)} disabled={!position.left} aria-label={`Прокрутить папки «${title.replace(/\.$/, "")}» влево`} aria-controls={id}><HugeiconsIcon icon={ArrowLeft02Icon} size={20} aria-hidden="true" /></button>
        <button type="button" onClick={() => move(1)} disabled={!position.right} aria-label={`Прокрутить папки «${title.replace(/\.$/, "")}» вправо`} aria-controls={id}><HugeiconsIcon icon={ArrowRight02Icon} size={20} aria-hidden="true" /></button>
      </div>}
    </div>
    <ul ref={track} id={id} className={styles.track} data-compact={compact || undefined}
      data-scroll-left={position.left || undefined} data-scroll-right={position.right || undefined} aria-label={title}>
      {documents.map((document) => <li key={document.id}><GlassFolder document={document} compact={compact} onOpen={() => open(document.id)} /></li>)}
    </ul>
  </section>;
}

export default function DocumentsLibrary({ documents }: {documents: CatalogDocument[]}) {
  const cooperationDocuments=documents.filter(d=>d.group==="cooperation");
  const visitorDocuments=documents.filter(d=>d.group==="visitors");
  return <div className={`sb-section ${styles.library}`}>
    {cooperationDocuments.length > 0 && <FolderRow id="cooperation-folders" documents={cooperationDocuments} title="Для сотрудничества" description="Здесь собраны реквизиты и документы для сотрудничества" compact />}
    {visitorDocuments.length > 0 && <FolderRow id="visitor-folders" documents={visitorDocuments} title="Для посетителей сайта" description="Здесь описаны правила использования сайта и обработки персональных данных" compact />}
    {!documents.length && <p>Опубликованных документов пока нет.</p>}
  </div>;
}
