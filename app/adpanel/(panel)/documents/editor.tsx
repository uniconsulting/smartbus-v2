"use client";

import { useState } from "react";
import File02Icon from "@hugeicons/core-free-icons/File02Icon";
import Folder02Icon from "@hugeicons/core-free-icons/Folder02Icon";
import FileEditIcon from "@hugeicons/core-free-icons/FileEditIcon";
import type { Edition } from "@/lib/cms-editions";
import type { ManagedDocument } from "@/lib/cms-documents";
import { Field, SectionFields, sectionRows, value } from "@/components/admin/EditorialFields";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { EditorWorkspace } from "@/components/admin/EditorWorkspace";
import { editDocument } from "./actions";

const tones = [
  { id: "violet", name: "Светло-фиолетовая" }, { id: "plum", name: "Графитовая" },
  { id: "lavender", name: "Лавандовая" }, { id: "gray", name: "Серая" },
];

export default function DocumentEditor({ item, revision, saved }: {
  saved: string; item: Edition<ManagedDocument> | null; revision: number;
}) {
  const d = item?.draft;
  const [kind, setKind] = useState<ManagedDocument["kind"]>(d?.kind ?? "pdf");
  function collect(form: FormData) {
    return { title: value(form, "title"), slug: value(form, "slug"), folderTitle: value(form, "folderTitle"),
      meta: value(form, "meta"), description: value(form, "description"), tone: value(form, "tone"), kind, group: value(form, "group"),
      legal: kind === "legal" ? { subtitle: value(form, "subtitle"), updated: value(form, "updated"), sections: sectionRows(form, false) } : null };
  }
  const panels = [
    { id: "basic", icon: File02Icon, label: "Основное", heading: "Основные данные", content: <>
      <Field label="Название документа" name="title" initial={d?.title} required max={250}/>
      <div className="edition-pair">
        <Field label="Постоянный адрес после /documents/" name="slug" initial={d?.slug} required max={100} readOnly={Boolean(item)}
          placeholder="nazvanie-dokumenta" hint={item ? "Адрес закреплён за этим документом." : "Строчные латинские буквы, цифры и дефисы. После сохранения адрес закрепится за документом."}/>
        <AdminSelect label="Группа" name="group" defaultValue={d?.group ?? "cooperation"}
        options={[{ value: "cooperation", label: "Для сотрудничества" }, { value: "visitors", label: "Для посетителей сайта" }]}/>
      </div>
    </> },
    { id: "folder", icon: Folder02Icon, label: "Папка в каталоге", heading: "Папка в каталоге", content: <>
      <div className="edition-pair">
        <Field label="Название на папке" name="folderTitle" initial={d?.folderTitle} multiline rows={2} max={200}
          hint="По умолчанию совпадает с названием документа."/>
        <Field label="Подпись внизу папки" name="meta" initial={d?.meta} max={180}/>
      </div>
      <Field label="Описание папки" name="description" initial={d?.description} multiline max={1200}/>
      <fieldset className="edition-tones"><legend>Оформление папки</legend>
        <div>{tones.map(tone => <label key={tone.id}>
          <input type="radio" name="tone" value={tone.id} defaultChecked={(d?.tone ?? "violet") === tone.id}/>
          <i data-tone={tone.id} aria-hidden="true"/><span>{tone.name}</span>
        </label>)}</div>
      </fieldset>
    </> },
    { id: "content", icon: FileEditIcon, label: "Содержимое", heading: "Содержимое документа", content: <>
      <AdminSelect label="Тип документа" name="kind" defaultValue={d?.kind ?? "pdf"} onValueChange={next => setKind(next as ManagedDocument["kind"])}
        options={[{ value: "pdf", label: "PDF-файл" }, { value: "legal", label: "Текстовый документ" }, { value: "request", label: "По запросу" }, { value: "pending", label: "Готовится" }]}/>
      <div hidden={kind !== "pdf"} className="edition-upload">
        {item && d?.pdf && <a className="edition-filelink" href={`/api/admin/document-preview/${item.id}`} target="_blank" rel="noopener">
          Открыть текущий PDF <span aria-hidden="true">↗</span></a>}
        <label className="admin-field edition-field"><span>{d?.pdf ? "Заменить PDF" : "Прикрепить PDF"}</span>
          <input name="file" type="file" accept=".pdf,application/pdf" disabled={kind !== "pdf"}/>
          <small>PDF до 10 МиБ. Файл нужен для публикации.</small>
        </label>
      </div>
      <div hidden={kind !== "legal"} className="edition-legal">
        <Field label="Редакция" name="updated" initial={d?.legal?.updated} max={180}/>
        <Field label="Введение" name="subtitle" initial={d?.legal?.subtitle} multiline max={1500}/>
        <SectionFields initial={d?.legal?.sections ?? []}/>
      </div>
      {kind === "request" && <p className="edition-kind-hint">Посетители смогут запросить документ через форму на сайте.</p>}
      {kind === "pending" && <p className="edition-kind-hint">В каталоге появится папка готовящегося документа.</p>}
    </> },
  ];
  return <EditorWorkspace base="documents" singular="документа" title={d ? "Редактор документа" : "Новый документ"} materialTitle={d?.title} id={item?.id ?? null}
    revision={revision} saved={saved} published={Boolean(item?.published)} hasDraft={Boolean(item?.published && JSON.stringify(d) !== JSON.stringify(item.published))}
    collect={collect} edit={editDocument} panels={panels} maxFileSize={10}/>;
}
