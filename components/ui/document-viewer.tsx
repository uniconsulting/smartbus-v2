"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import Download01Icon from "@hugeicons/core-free-icons/Download01Icon";
import MinusSignIcon from "@hugeicons/core-free-icons/MinusSignIcon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import SidebarLeftIcon from "@hugeicons/core-free-icons/SidebarLeftIcon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon";
import RotateClockwiseIcon from "@hugeicons/core-free-icons/RotateClockwiseIcon";
import type { CatalogDocument } from "@/lib/documents";
import { leadRequestHref, leadTasks } from "@/lib/lead-request";
import { usePublicContacts } from "@/components/ContactProvider";
import PDFViewer from "./pdf-viewer";
import styles from "./document-viewer.module.css";

export default function DocumentViewer({ document: item, onClose }: { document: CatalogDocument; onClose: () => void }) {
  const contacts = usePublicContacts();
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [sidebar, setSidebar] = useState(false);
  const legal = item.kind === "legal" ? item.legal : null;
  useEffect(() => {
    const el = dialog.current;
    const previousFocus = window.document.activeElement as HTMLElement | null;
    const overflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    el?.showModal();
    setSidebar(window.matchMedia("(min-width: 1001px)").matches);
    return () => { el?.close(); window.document.body.style.overflow = overflow; if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, []);
  const goToSection = (index: number) => {
    content.current?.querySelector(`#reader-section-${index}`)?.scrollIntoView({ block: "start", behavior: "instant" });
    if (window.matchMedia("(max-width: 1000px)").matches) setSidebar(false);
  };
  const request = () => { onClose(); router.push(leadRequestHref(item.id === "licenses" ? leadTasks.licenses : item.id === "proposal" ? leadTasks.proposal : `Запрос документа: ${item.title}`)); };
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="document-viewer-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.shell}>
      <header className={styles.toolbar}>
        <span id="document-viewer-title" className="visually-hidden">{item.title}</span>
        <div className={styles.actions}>
          {legal && <button type="button" className={styles.iconButton} onClick={() => setSidebar(s => !s)} aria-label="Показать содержание документа" aria-expanded={sidebar} aria-controls="document-viewer-contents" title="Содержание"><HugeiconsIcon icon={SidebarLeftIcon} size={21} aria-hidden="true" /></button>}
          {(item.kind === "pdf" || item.kind === "legal") && <div className={styles.zoom}>
            <button type="button" className={styles.iconButton} onClick={() => setZoom(z => Math.max(75, z - 25))} disabled={zoom <= 75} aria-label="Уменьшить масштаб" title="Уменьшить"><HugeiconsIcon icon={MinusSignIcon} size={18} aria-hidden="true" /></button>
            <button type="button" className={styles.zoomReset} onClick={() => setZoom(100)} aria-label={`Масштаб ${zoom} процентов. Вернуть исходный масштаб`} title="Сбросить масштаб">{zoom}%</button>
            <button type="button" className={styles.iconButton} onClick={() => setZoom(z => Math.min(200, z + 25))} disabled={zoom >= 200} aria-label="Увеличить масштаб" title="Увеличить"><HugeiconsIcon icon={PlusSignIcon} size={18} aria-hidden="true" /></button>
          </div>}
          {item.kind === "pdf" && <><span className={styles.pageCount}>{pageCount ? `Страниц: ${pageCount}` : "—"}</span><button type="button" className={`${styles.iconButton} ${styles.rotate}`} onClick={() => setRotation(r => (r + 90) % 360)} aria-label="Повернуть документ" title="Повернуть"><HugeiconsIcon icon={RotateClockwiseIcon} size={20} aria-hidden="true" /></button><a className={styles.download} href={item.href} download={`${item.title} ООО СмартБас.pdf`} title="Скачать оригинал PDF"><HugeiconsIcon icon={Download01Icon} size={20} aria-hidden="true" /><span>Скачать</span></a></>}
          <button autoFocus type="button" className={`${styles.iconButton} ${styles.close}`} onClick={onClose} aria-label="Закрыть документ" title="Закрыть (Esc)"><HugeiconsIcon icon={Cancel01Icon} size={23} aria-hidden="true" /></button>
        </div>
      </header>
      <div className={styles.workspace}>
        {legal && <aside className={styles.sidebar} data-open={sidebar} id="document-viewer-contents" aria-label="Содержание документа" hidden={!sidebar}>
          <strong>Содержание</strong><nav>{legal.sections.map((section, index) => <button type="button" key={section.heading} onClick={() => goToSection(index)}>{section.heading}</button>)}</nav><small>{legal.updated}</small>
        </aside>}
        {item.kind === "pdf" ? <PDFViewer src={item.href} zoom={zoom} rotation={rotation} onPageCount={setPageCount} /> : <div className={styles.readerViewport} ref={content}>
          <article className={styles.paper} style={{ "--reader-scale": zoom / 100 } as CSSProperties}>
            <div className={styles.paperBrand}><img src="/brand/logo.webp" alt="SmartBus" width={160} height={40} /><span>{legal?.updated ?? "Для сотрудничества"}</span></div>
            <h1>{item.title}</h1>
            <p className={styles.subtitle}>{legal?.subtitle ?? item.description}</p>
            {legal ? legal.sections.map((section, index) => <section key={section.heading} id={`reader-section-${index}`}>
              <h2>{section.heading}</h2>{section.paragraphs.map((paragraph, p) => <p key={p} className={/^\d+\.\d/.test(paragraph) ? styles.numbered : undefined}>{paragraph}</p>)}
            </section>) : item.kind === "pending" ? <section>
              <h2>Файл будет добавлен</h2>
              <p>Документ ещё не загружен. Он появится здесь после добавления файла.</p>
            </section> : <section className={styles.request}>
              <h2>{item.id === "licenses" ? "Получить актуальные документы" : item.id === "proposal" ? "Условия и стоимость вашей поездки" : "Запросить документ"}</h2>
              <p>{item.id === "licenses" ? "Напишите, какие документы нужны для закупки или проверки компании. Мы уточним перечень и возможность предоставления копий." : item.id === "proposal" ? "Укажите маршрут, дату, время поездки и число пассажиров. Эти данные нужны, чтобы рассчитать стоимость и согласовать условия работы." : "Оставьте контакт — мы свяжемся с вами по запросу документа."}</p>
              <button type="button" className="button button-primary" onClick={request}>{item.id === "licenses" ? "Запросить документы" : "Оставить запрос"}<HugeiconsIcon icon={ArrowUpRight01Icon} size={18} aria-hidden="true" /></button>
              <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
            </section>}
            {legal && <footer className={styles.paperFooter}><span>Есть вопрос по документу?</span><a href={`mailto:${contacts.infoEmail}`}>{contacts.infoEmail} <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} aria-hidden="true" /></a></footer>}
          </article>
          {legal && <div className={styles.readerEnd}><button type="button" onClick={() => content.current?.scrollTo({ top: 0, behavior: "instant" })}><HugeiconsIcon icon={ArrowLeft02Icon} size={16} aria-hidden="true" />К началу документа</button><button type="button" onClick={onClose}>Закрыть документ<HugeiconsIcon icon={ArrowRight02Icon} size={16} aria-hidden="true" /></button></div>}
        </div>}
      </div>
    </div>
  </dialog>;
}
