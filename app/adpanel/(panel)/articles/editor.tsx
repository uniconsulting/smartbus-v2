"use client";

import { useEffect, useState } from "react";
import type { Article } from "@/lib/articles";
import Layout01Icon from "@hugeicons/core-free-icons/Layout01Icon";
import Image01Icon from "@hugeicons/core-free-icons/Image01Icon";
import TextAlignLeftIcon from "@hugeicons/core-free-icons/TextAlignLeftIcon";
import Link01Icon from "@hugeicons/core-free-icons/Link01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Edition } from "@/lib/cms-editions";
import { articleCovers } from "@/lib/article-covers";
import { Field, SectionFields, paragraphs, sectionRows, value } from "@/components/admin/EditorialFields";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { EditorWorkspace } from "@/components/admin/EditorWorkspace";
import { editArticle } from "./actions";

const covers: { id: Article["visual"]; label: string }[] = [
  { id: "bus", label: "Посадка сотрудников" }, { id: "route", label: "Маршрут" },
  { id: "fleet", label: "Автопарк" }, { id: "control", label: "Диспетчерская" }, { id: "brief", label: "Документы" },
];

export default function ArticleEditor({ item, revision, options, saved }: {
  saved: string; item: Edition<Article> | null; revision: number; options: { slug: string; title: string }[];
}) {
  const a = item?.draft;
  const [coverSource, setCoverSource] = useState(a?.customCover ? "custom" : "library");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function collect(form: FormData) {
    return { coverSource, coverAlt: value(form, "coverAlt"), title: value(form, "title"), slug: value(form, "slug"),
      category: value(form, "category"), visual: value(form, "visual"), focus: value(form, "focus"),
      seoTitle: value(form, "seoTitle"), description: value(form, "description"), intro: paragraphs(value(form, "intro")),
      conclusion: paragraphs(value(form, "conclusion")), sections: sectionRows(form, true), relatedSlugs: form.getAll("related") };
  }
  const customSrc = preview || (item && a?.customCover ? `/api/admin/article-cover/${item.id}?v=${encodeURIComponent(a.customCover.file)}` : "");
  const panels = [
    { id: "card", icon: Layout01Icon, label: "Карточка", heading: "Карточка статьи", content: <>
      <Field label="Заголовок" name="title" initial={a?.title} max={250} required/>
      <div className="edition-pair">
        <Field label="Адрес после /articles/" name="slug" initial={a?.slug} required max={100} placeholder="primer-stati" hint="Строчные латинские буквы, цифры и дефисы."/>
        <Field label="Категория" name="category" initial={a?.category} max={120}/>
      </div>
      <Field label="Краткое описание для карточки" name="focus" initial={a?.focus} multiline max={1000}/>
    </> },
    { id: "cover", icon: Image01Icon, label: "Обложка", heading: "Обложка статьи", content: <>
      <AdminSelect label="Источник обложки" name="coverSource" defaultValue={a?.customCover ? "custom" : "library"} onValueChange={setCoverSource}
        options={[{ value: "library", label: "Из библиотеки" }, { value: "custom", label: "Своё изображение" }]}/>
      <fieldset className="edition-cover-list" hidden={coverSource !== "library"}><legend>Фотография из библиотеки</legend>
        <div>{covers.map(cover => <label className="edition-cover" key={cover.id}>
          <input name="visual" type="radio" value={cover.id} defaultChecked={(a?.visual ?? "bus") === cover.id}/>
          <span className="edition-thumbnail">
            <img src={articleCovers[cover.id].src} alt="" loading="lazy" width="160" height="96"/>
            <span className="edition-cover-tick" aria-hidden="true"><HugeiconsIcon icon={Tick02Icon} size={15} strokeWidth={2.2}/></span>
          </span>
          <span className="edition-cover-caption">{cover.label}</span>
        </label>)}</div>
      </fieldset>
      <div className="edition-upload" hidden={coverSource !== "custom"}>
        {customSrc && <img className="edition-preview" src={customSrc} alt="Предпросмотр своей обложки"/>}
        <label className="admin-field edition-field"><span>Файл обложки</span>
          <input type="file" name="file" accept="image/jpeg,image/png,image/webp" disabled={coverSource !== "custom"}
            onChange={e => setFile(e.target.files?.[0] ?? null)}/>
          <small>JPEG, PNG или WebP до 8 МиБ и 25 Мп.</small>
        </label>
      </div>
      <Field label="Описание изображения (alt)" name="coverAlt" initial={a?.coverAlt} max={400}
        hint={coverSource === "custom" ? "Кратко опишите изображение перед публикацией." : "Для библиотечных фотографий описание уже задано. При желании его можно уточнить."}/>
    </> },
    { id: "body", icon: TextAlignLeftIcon, label: "Текст", heading: "Текст статьи", content: <>
      <Field label="Вступление" name="intro" initial={a?.intro.join("\n\n")} multiline rows={4} max={120000} hint="Разделяйте абзацы пустой строкой."/>
      <SectionFields initial={a?.sections ?? []} article/>
      <Field label="Заключение" name="conclusion" initial={a?.conclusion?.join("\n\n")} multiline rows={4} max={120000}/>
    </> },
    { id: "settings", icon: Link01Icon, label: "Связи и SEO", heading: "Для поисковых систем", content: <>
      <Field label="SEO-заголовок" name="seoTitle" initial={a?.seoTitle} max={250} hint="Если оставить поле пустым, используем заголовок статьи."/>
      <Field label="SEO-описание" name="description" initial={a?.description} multiline max={1000} hint="По умолчанию совпадает с кратким описанием карточки."/>
      {options.length > 0 && <fieldset className="edition-related"><legend>Статьи по теме</legend>
        {options.map(option => <label key={option.slug}><input type="checkbox" name="related" value={option.slug}
          defaultChecked={a?.relatedSlugs.includes(option.slug)}/><span>{option.title}</span></label>)}
      </fieldset>}
    </> },
  ];
  return <EditorWorkspace base="articles" singular="статьи" title={a ? "Редактор статьи" : "Новая статья"} materialTitle={a?.title} id={item?.id ?? null}
    revision={revision} saved={saved} published={Boolean(item?.published)} hasDraft={Boolean(item?.published && JSON.stringify(a) !== JSON.stringify(item.published))}
    collect={collect} edit={editArticle} panels={panels} maxFileSize={8}/>;
}
