"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { EditionMode, EditorResult } from "@/lib/cms-editions";
import { HugeiconsIcon } from "@hugeicons/react";
import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import type { IconSvgElement } from "@hugeicons/react";
import { AdminModeStrip } from "./AdminModeStrip";
import "./editors.css";

type Panel = { id: string; label: string; icon: IconSvgElement; heading: string; content: ReactNode };
type EditAction = (id: string | null, revision: number, mode: EditionMode, raw: unknown, upload?: FormData) => Promise<EditorResult>;
type Notice = { error: boolean; text: string };
const successMessages: Record<string, string> = {
  save: "Черновик сохранён.", publish: "Изменения опубликованы.", unpublish: "Материал снят с публикации.",
};

export function EditorWorkspace({ base, singular, title, materialTitle, id, revision, saved, published, hasDraft, panels, collect, edit, maxFileSize }: {
  base: "articles" | "documents"; singular: string; title: string; materialTitle?: string; id: string | null; revision: number;
  saved: string; published: boolean; hasDraft: boolean; panels: Panel[]; collect: (form: FormData) => unknown;
  edit: EditAction; maxFileSize: number;
}) {
  const router = useRouter();
  const prefix = useId();
  const [active, setActive] = useState(panels[0].id);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [notice, setNotice] = useState<Notice | null>(() => successMessages[saved] ? { error: false, text: successMessages[saved] } : null);
  const [currentRevision, setRevision] = useState(revision);
  const kept = useRef(false);
  const basePath = `/adpanel/${base}`;
  const status = !published ? "Черновик" : hasDraft ? "Черновик изменений" : "Опубликовано";

  function changed() {
    kept.current = false;
    setDirty(true);
    setNotice(null);
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!kept.current) { event.preventDefault(); event.returnValue = ""; }
    };
    const guardLink = (event: MouseEvent) => {
      if (kept.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const to = new URL(link.href, window.location.href);
      if (to.origin === location.origin && to.pathname === location.pathname && to.search === location.search) return;
      if (!window.confirm("Покинуть редактор? Несохранённые изменения будут потеряны.")) {
        event.preventDefault();
        event.stopPropagation();
      } else kept.current = true;
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", guardLink, true); };
  }, [dirty]);

  function selectTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "Home" ? 0 : event.key === "End" ? panels.length - 1
      : event.key === "ArrowRight" ? (index + 1) % panels.length
      : event.key === "ArrowLeft" ? (index + panels.length - 1) % panels.length : null;
    if (next === null) return;
    event.preventDefault();
    setActive(panels[next].id);
    document.getElementById(`${prefix}-tab-${panels[next].id}`)?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const mode = (submitter?.value || "save") as EditionMode;
    if (mode === "unpublish" || mode === "remove") {
      if (!window.confirm(mode === "remove" ? `Удалить черновик ${singular}?` : "Снять материал с публикации?")) return;
    } else {
      const invalid = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input:invalid, textarea:invalid, select:invalid");
      if (invalid) {
        const tabId = invalid.closest<HTMLElement>("[data-editor-panel]")?.dataset.editorPanel;
        if (tabId) setActive(tabId);
        requestAnimationFrame(() => { invalid.focus(); invalid.reportValidity(); });
        return;
      }
    }
    const data = new FormData(form);
    const upload = new FormData();
    const file = data.get("file");
    if ((mode === "publish" || mode === "save") && file instanceof File && file.size) {
      if (file.size > maxFileSize * 1024 * 1024) {
        setNotice({ error: true, text: `Файл должен быть не больше ${maxFileSize} МиБ.` });
        return;
      }
      upload.set("file", file);
    }
    locked.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const result = await edit(id, currentRevision, mode, collect(data), upload);
      if (!result.ok) { setNotice({ error: true, text: result.error }); return; }
      setRevision(result.revision);
      if (mode === "save" || mode === "publish") {
        const fileInput = form.querySelector<HTMLInputElement>("input[type=file]");
        if (fileInput) fileInput.value = "";
      }
      if (mode !== "unpublish") { kept.current = true; setDirty(false); }
      if (mode === "remove") { router.push(basePath); return; }
      const destination = `${basePath}/${result.id}?saved=${mode}`;
      if (location.pathname + location.search === destination) router.refresh();
      else router.replace(destination, { scroll: false });
      setNotice({ error: false, text: mode === "unpublish" && dirty
        ? "Материал снят с публикации. Изменения в форме ещё не сохранены." : successMessages[mode] });
    } catch {
      setNotice({ error: true, text: "Сохранить изменения не удалось. Проверьте соединение и повторите попытку." });
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return <section className="edition-work">
    <header className="edition-header">
      <div className="edition-meta">
        <Link className="edition-back" href={basePath}><HugeiconsIcon icon={ArrowLeft02Icon} size={17} aria-hidden="true"/> {base === "articles" ? "Все статьи" : "Все документы"}</Link>
        {id && <span className="edition-status" data-state={published && !hasDraft ? "published" : "draft"}>{status}</span>}
      </div>
      <h1>{title}</h1>
      {materialTitle && <p className="edition-material-title">{materialTitle}</p>}
    </header>
    <form noValidate onSubmit={submit} onChange={changed} onClick={event => {
      if (event.target instanceof Element && event.target.closest("[data-editor-change]") && !event.defaultPrevented) changed();
    }} className="edition-form" aria-busy={busy}>
      <div className="edition-surface">
        <AdminModeStrip className="edition-tabs" role="tablist" count={panels.length}
          activeIndex={panels.findIndex(panel => panel.id === active)} aria-label="Разделы редактора">
          {panels.map((panel, i) => <button key={panel.id} id={`${prefix}-tab-${panel.id}`} type="button" role="tab"
            aria-selected={active === panel.id} aria-controls={`${prefix}-panel-${panel.id}`} tabIndex={active === panel.id ? 0 : -1}
            onClick={() => setActive(panel.id)} onKeyDown={e => selectTab(e, i)}>
            <HugeiconsIcon icon={panel.icon} size={19} strokeWidth={1.65} aria-hidden="true"/>
            <span>{panel.label}</span>
          </button>)}
        </AdminModeStrip>
        {panels.map(panel => <section key={panel.id} id={`${prefix}-panel-${panel.id}`} role="tabpanel" data-editor-panel={panel.id}
          aria-labelledby={`${prefix}-tab-${panel.id}`} hidden={active !== panel.id} className="edition-panel">
          <h2>{panel.heading}</h2>
          <fieldset disabled={busy} className="edition-fields" aria-label={panel.heading}>{panel.content}</fieldset>
        </section>)}
      </div>
      <div className="edition-savebar">
        <div className="edition-feedback" role={notice?.error ? "alert" : "status"} aria-atomic="true" data-tone={notice?.error ? "error" : dirty ? "edited" : "normal"}>
          {busy ? "Сохраняем…" : notice?.text || (dirty ? "Есть несохранённые изменения" : id ? "Изменения сохранены" : "Черновик ещё не сохранён")}
        </div>
        <div className="edition-save-actions">
          <button className="admin-secondary" type="submit" value="save" disabled={busy}>Сохранить черновик</button>
          <button className="admin-primary" type="submit" value="publish" disabled={busy}>Опубликовать</button>
        </div>
      </div>
      {id && <button className="edition-remove" type="submit" value={published ? "unpublish" : "remove"} disabled={busy}>
        {published ? "Снять с публикации" : "Удалить черновик"}
      </button>}
    </form>
  </section>;
}
