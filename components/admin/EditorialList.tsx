"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import ArrowDown02Icon from "@hugeicons/core-free-icons/ArrowDown02Icon";
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import File02Icon from "@hugeicons/core-free-icons/File02Icon";
import FileValidationIcon from "@hugeicons/core-free-icons/FileValidationIcon";
import Folder02Icon from "@hugeicons/core-free-icons/Folder02Icon";
import Pdf01Icon from "@hugeicons/core-free-icons/Pdf01Icon";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Sorting05Icon from "@hugeicons/core-free-icons/Sorting05Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import type { EditorResult } from "@/lib/cms-editions";
import { AdminSelect } from "./AdminSelect";
import "./catalog.css";

type Status = "published" | "changed" | "draft";
type Filter = Status | "all";
type CatalogKind = "articles" | "documents";

export type CatalogItem = {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  status: Status;
  url: string | null;
  cover?: string;
  documentType?: "pdf" | "legal" | "request" | "pending";
};

const documentIcons = { pdf: Pdf01Icon, legal: FileValidationIcon, request: Folder02Icon, pending: File02Icon };
const statusLabels = { published: "На сайте", changed: "Есть правки", draft: "Черновик" };
const copy = {
  articles: { title: "Статьи", action: "Создать статью", search: "Найти статью", none: "Пока нет статей" },
  documents: { title: "Документы", action: "Добавить документ", search: "Найти документ", none: "Пока нет документов" },
};

function normalize(input: string) {
  return input.trim().toLocaleLowerCase("ru").replaceAll("ё", "е").replace(/\s+/g, " ");
}

function ItemArt({ item }: { item: CatalogItem }) {
  if (item.cover) {
    return <div className="catalog-art catalog-art-photo" aria-hidden="true">
      <Image src={item.cover} alt="" width={128} height={88} sizes="88px"
        unoptimized={item.cover.startsWith("/api/")} />
    </div>;
  }
  const kind = item.documentType ?? "pending";
  return <span className={`catalog-art catalog-art-doc catalog-art-${kind}`} aria-hidden="true">
    <HugeiconsIcon icon={documentIcons[kind]} size={26} strokeWidth={1.55} />
  </span>;
}

export default function EditorialList({ items, kind, revision, reorder }: {
  items: CatalogItem[];
  kind: CatalogKind;
  revision: number;
  reorder: (id: string, revision: number, mode: "up" | "down") => Promise<EditorResult>;
}) {
  const router = useRouter();
  const rows = useRef<HTMLUListElement>(null);
  const movedRows = useRef<{ row: HTMLElement; top: number }[]>([]);
  const keyboardMove = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [busy, start] = useTransition();
  const labels = copy[kind];
  const base = `/adpanel/${kind}`;
  const needle = normalize(query);
  const matches = items.filter(item => ordering || (
    (filter === "all" || item.status === filter || (filter === "published" && item.status === "changed")) &&
    (!needle || normalize(`${item.title} ${item.subtitle} ${item.slug}`).includes(needle))
  ));

  useLayoutEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const { row, top } of movedRows.current) {
        const distance = top - row.offsetTop;
        if (distance && row.isConnected) {
          row.animate([{ transform: `translateY(${distance}px)` }, { transform: "none" }],
            { duration: 240, easing: "cubic-bezier(.22,.72,.24,1)" });
        }
      }
    }
    movedRows.current = [];
  }, [revision]);

  useLayoutEffect(() => {
    const button = keyboardMove.current;
    if (busy || !button) return;
    keyboardMove.current = null;
    if (document.activeElement !== document.body && document.activeElement !== button) return;
    const next = button.disabled ? button.parentElement?.querySelector<HTMLButtonElement>("button:enabled") : button;
    next?.focus({ preventScroll: true });
  }, [busy]);

  function toggleOrder() {
    setOrdering(active => !active);
    setError("");
    setAnnouncement("");
  }

  function clearFilters() {
    setQuery("");
    setFilter("all");
    searchRef.current?.focus();
  }

  function move(item: CatalogItem, mode: "up" | "down", index: number, keyboardButton: HTMLButtonElement | null) {
    const adjacent = index + (mode === "up" ? -1 : 1);
    movedRows.current = [index, adjacent].flatMap(position => {
      const row = rows.current?.children[position];
      return row instanceof HTMLElement ? [{ row, top: row.offsetTop }] : [];
    });
    keyboardMove.current = keyboardButton;
    setError("");
    setAnnouncement("");
    start(async () => {
      try {
        const result = await reorder(item.id, revision, mode);
        if (!result.ok) {
          movedRows.current = [];
          setError(result.error);
          return;
        }
        setAnnouncement(`«${item.title}». Позиция ${index + (mode === "up" ? 0 : 2)} из ${items.length}.`);
        router.refresh();
      } catch {
        movedRows.current = [];
        setError("Не удалось изменить порядок. Проверьте соединение и повторите попытку.");
      }
    });
  }

  return <section className="admin-catalog" aria-labelledby="catalog-title">
    <header className="catalog-header">
      <h1 id="catalog-title">{labels.title}</h1>
      <Link className="admin-primary" href={`${base}/new`}>
        <HugeiconsIcon icon={PlusSignIcon} size={18} aria-hidden="true" />{labels.action}
      </Link>
    </header>

    {items.length > 0 && <div className="catalog-tools">
      {ordering ? <p className="catalog-order-hint">Меняйте порядок стрелками. Изменения сохраняются сразу.</p> :
        <div className="catalog-filters">
          <div className="catalog-search">
            <HugeiconsIcon icon={Search01Icon} size={19} aria-hidden="true" />
            <input ref={searchRef} type="search" aria-label={labels.search} placeholder={labels.search}
              value={query} onChange={event => setQuery(event.target.value)} />
            {query && <button type="button" className="catalog-clear" aria-label="Очистить поиск" onClick={() => {
              setQuery("");
              searchRef.current?.focus();
            }}><HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden="true" /></button>}
          </div>
          <AdminSelect className="catalog-select" label="Статус публикации" hideLabel
            value={filter} onValueChange={next => setFilter(next as Filter)} options={[
              { value: "all", label: "Все статусы" }, { value: "published", label: "На сайте" },
              { value: "changed", label: "Есть правки" }, { value: "draft", label: "Черновик" },
            ]}/>
        </div>}
      {items.length > 1 && <button type="button" className="catalog-order-toggle" aria-pressed={ordering}
        disabled={busy} onClick={toggleOrder}>
        <HugeiconsIcon icon={ordering ? Tick02Icon : Sorting05Icon} size={18} aria-hidden="true" />
        {ordering ? "Готово" : "Порядок"}
      </button>}
    </div>}

    {error && <p className="admin-notice" role="alert">{error}</p>}
    <div className={`catalog-paper catalog-${kind}`}>
      <div className="catalog-columns" aria-hidden="true">
        <span>{ordering ? "Позиция и название" : "Название"}<b>{matches.length}</b></span>
        <span>Статус</span><span>{ordering ? "Переместить" : "Действия"}</span>
      </div>
      <span aria-live="polite" className="catalog-sr">
        {announcement || `Количество материалов в списке: ${matches.length}.`}
      </span>
      {matches.length ? <ul ref={rows} role="list" className="catalog-rows" aria-busy={busy}>
        {matches.map((item, index) => <li key={item.id} className="catalog-row">
          <div className="catalog-material">
            {ordering ? <span className="catalog-rank">{String(index + 1).padStart(2, "0")}</span> : <ItemArt item={item} />}
            <div className="catalog-description">
              <h2><Link href={`${base}/${item.id}`}>{item.title}</Link></h2>
              {item.subtitle && <p>{item.subtitle}</p>}
            </div>
          </div>
          <span className={`catalog-status catalog-status-${item.status}`}
            title={item.status === "changed" ? "Опубликованная версия доступна на сайте. В черновике есть изменения." : undefined}>
            {statusLabels[item.status]}
          </span>
          <div className="catalog-actions">
            {ordering ? <>
              <button type="button" className="catalog-icon-action" disabled={busy || index === 0}
                onClick={event => move(item, "up", index, event.detail === 0 ? event.currentTarget : null)} title="Поднять" aria-label={`Поднять «${item.title}»`}>
                <HugeiconsIcon icon={ArrowUp02Icon} size={19} aria-hidden="true" />
              </button>
              <button type="button" className="catalog-icon-action" disabled={busy || index === items.length - 1}
                onClick={event => move(item, "down", index, event.detail === 0 ? event.currentTarget : null)} title="Опустить" aria-label={`Опустить «${item.title}»`}>
                <HugeiconsIcon icon={ArrowDown02Icon} size={19} aria-hidden="true" />
              </button>
            </> : <>
              <Link className="catalog-edit" href={`${base}/${item.id}`} aria-label={`Редактировать «${item.title}»`}>
                <HugeiconsIcon icon={PencilEdit01Icon} size={17} aria-hidden="true" /><span>Редактировать</span><span className="catalog-abbreviated">Изменить</span>
              </Link>
              {item.url && <a className="catalog-icon-action" href={item.url} target="_blank" rel="noopener"
                title="Открыть на сайте" aria-label={`Открыть «${item.title}» на сайте в новой вкладке`}>
                <HugeiconsIcon icon={ArrowUpRight01Icon} size={19} aria-hidden="true" />
              </a>}
            </>}
          </div>
        </li>)}
      </ul> : <div className="catalog-empty">
        <HugeiconsIcon icon={items.length ? Search01Icon : Folder02Icon} size={32} strokeWidth={1.5} aria-hidden="true" />
        <h2>{items.length ? "Ничего не найдено" : labels.none}</h2>
        {items.length > 0 && <button type="button" className="admin-secondary" onClick={clearFilters}>Сбросить фильтры</button>}
      </div>}
    </div>
  </section>;
}
