"use client";
import { useActionState, useState } from "react";
import { useUnsavedNavigation } from "@/components/admin/useUnsavedNavigation";
import { saveSeo } from "./actions";
import type { SeoPage, SeoFields } from "@/lib/cms-seo";

export default function SeoForm({ page, value, revision, url }: { page: SeoPage; value: SeoFields; revision: number; url:string }) {
  const [draft, setDraft] = useState(value);
  const [baseline, setBaseline] = useState(value);
  const [notice, setNotice] = useState("");
  const [, action, pending] = useActionState(async (previous: {message:string; revision:number}, data:FormData) => {
    const result=await saveSeo(page,previous,data);
    if(result.revision!==previous.revision){
      const next={title:String(data.get("title")).trim(), description:String(data.get("description")).trim(), index:data.get("index")==="on"};
      setBaseline(next); setDraft(next);
    }
    setNotice(result.message); return result;
  }, {message:"", revision});
  const dirty=draft.title!==baseline.title || draft.description!==baseline.description || draft.index!==baseline.index;
  useUnsavedNavigation(dirty);
  return <div className="admin-seo-grid">
    <form action={action} onChange={()=>setNotice("")} className="admin-card admin-form">
      <label className="admin-field">Заголовок в поиске<input name="title" readOnly={pending} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} maxLength={180} required /></label>
      <label className="admin-field">Описание страницы<textarea name="description" readOnly={pending} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} rows={4} required maxLength={400}/></label>
      <label className="admin-checkbox admin-seo-toggle">Разрешить индексацию страницы<input type="checkbox" role="switch" name="index" disabled={pending} checked={draft.index} onChange={e=>setDraft({...draft,index:e.target.checked})}/></label>
      <div className="admin-seo-actions"><button className="admin-primary" disabled={pending || !dirty}>{pending ? "Сохраняем…" : "Сохранить настройки"}</button>
        {notice && <p role="status" className="admin-notice">{notice}</p>}</div>
    </form>
    <aside className="admin-card admin-search-preview" aria-label="Предпросмотр в поиске">
      <h2>В поисковой выдаче</h2><p className="admin-muted">Пример того, как страница может выглядеть в поиске.</p>
      <div><span dir="ltr">{url}</span><strong>{draft.title.trim() || "Заголовок страницы"}</strong><p>{draft.description.trim() || "Описание страницы"}</p></div>
      {!draft.index && <small>Индексация этой страницы отключена.</small>}
    </aside>
  </div>;
}
