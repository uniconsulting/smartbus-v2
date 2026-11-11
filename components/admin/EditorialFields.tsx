"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ArticleSection } from "@/lib/articles";

export function Field({ label, name, initial = "", required, multiline = false, rows = 3, max = 1500, readOnly, hint, placeholder, onValue }: {
  label: string; name: string; initial?: string; required?: boolean; multiline?: boolean; rows?: number;
  max?: number; readOnly?: boolean; hint?: string; placeholder?: string; onValue?: (text: string) => void;
}) {
  const id = useId();
  const props = { id, name, defaultValue: initial, maxLength: max, required, readOnly, placeholder,
    "aria-describedby": hint ? id + "-hint" : undefined };
  return <div className="admin-field edition-field">
    <label htmlFor={id}>{label}{required && <span aria-hidden="true" className="edition-required"> *</span>}</label>
    {multiline ? <textarea {...props} rows={rows} onChange={e => onValue?.(e.target.value)} />
      : <input {...props} onChange={e => onValue?.(e.target.value)} />}
    {hint && <small id={id + "-hint"}>{hint}</small>}
  </div>;
}

export const value = (form: FormData, name: string) => String(form.get(name) ?? "");
export const paragraphs = (s: string) => s.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean);

export function sectionRows(form: FormData, article: boolean) {
  return form.getAll("sectionOrder").map(key => ({
    heading: value(form, `heading-${key}`),
    paragraphs: paragraphs(value(form, `paragraphs-${key}`)),
    ...(article && { bullets: value(form, `bullets-${key}`).split(/\r?\n/).map(s => s.trim()).filter(Boolean),
      after: paragraphs(value(form, `after-${key}`)) }),
  }));
}

function SectionRow({ rowKey, section, index, count, article, newRow, onMove, onRemove }: {
  rowKey: number; section: ArticleSection; index: number; count: number; article: boolean; newRow: boolean;
  onMove: (distance: number) => void; onRemove: () => void;
}) {
  const [heading, setHeading] = useState(section.heading);
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!newRow) return;
    const element = details.current;
    if (element) { element.open = true; element.querySelector<HTMLInputElement>(".edition-field input")?.focus(); }
  }, [newRow]);
  return <details className="edition-block" ref={details}>
    <summary><span className="edition-block-index">{String(index + 1).padStart(2, "0")}</span>
      <span>{heading.trim() || "Раздел без названия"}</span><i aria-hidden="true"/></summary>
    <div className="edition-block-body">
      <input name="sectionOrder" type="hidden" value={rowKey}/>
      <Field label="Заголовок раздела" name={`heading-${rowKey}`} initial={section.heading} max={article ? 250 : 300} onValue={setHeading}/>
      <Field label="Абзацы" name={`paragraphs-${rowKey}`} initial={section.paragraphs?.join("\n\n")} multiline rows={5} max={120000} hint="Разделяйте абзацы пустой строкой."/>
      {article && <>
        <Field label="Маркированный список" name={`bullets-${rowKey}`} initial={section.bullets?.join("\n")} multiline rows={2} max={50000} hint="Каждый пункт начинается с новой строки."/>
        <Field label="Абзацы после списка" name={`after-${rowKey}`} initial={section.after?.join("\n\n")} multiline max={100000}/>
      </>}
      <div className="edition-block-actions">
        <button className="admin-secondary" data-editor-change type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Поднять раздел ${index + 1}`}>↑ Выше</button>
        <button className="admin-secondary" data-editor-change type="button" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Опустить раздел ${index + 1}`}>↓ Ниже</button>
        <button className="edition-remove" type="button" data-editor-change onClick={e => {
          if (window.confirm("Удалить этот раздел из редактируемой версии?")) onRemove(); else e.preventDefault();
        }}>Удалить раздел</button>
      </div>
    </div>
  </details>;
}

export function SectionFields({ initial, article = false }: { initial: ArticleSection[]; article?: boolean }) {
  const [rows, setRows] = useState(() => initial.map((section, i) => ({ key: i, section })));
  const next = useRef(initial.length);
  const firstNew = useRef(initial.length);
  function move(index: number, distance: number) {
    setRows(list => {
      const result = [...list];
      [result[index], result[index + distance]] = [result[index + distance], result[index]];
      return result;
    });
  }
  return <div className="edition-blocks">
    <h3>Разделы текста <small>{rows.length}</small></h3>
    {rows.map(({ key, section }, i) => <SectionRow key={key} rowKey={key} section={section} index={i} count={rows.length}
      article={article} newRow={key >= firstNew.current} onMove={distance => move(i, distance)}
      onRemove={() => setRows(list => list.filter(row => row.key !== key))}/>)}
    <button className="edition-add" type="button" data-editor-change disabled={rows.length >= 80}
      onClick={() => setRows([...rows, { key: next.current++, section: { heading: "", paragraphs: [] } }])}>
      <span aria-hidden="true">＋</span> Добавить раздел
    </button>
  </div>;
}
