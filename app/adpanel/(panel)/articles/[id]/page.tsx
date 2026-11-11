import { requireAdmin } from "@/lib/admin-auth";
import { notFound } from "next/navigation";
import { readArticleEditions } from "@/lib/cms-articles";
import ArticleEditor from "../editor";

export default async function ArticleEditorPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string}>}) {
  await requireAdmin();
  const {id}=await params;
  const {saved}=await searchParams;
  const {value,revision}=await readArticleEditions();
  const item=value.find(s=>s.id===id);
  if(id!=="new" && !item)notFound();
  return <ArticleEditor key={id} item={item??null} revision={revision} saved={saved??""}
    options={value.filter(s=>s.id!==id).map(s=>({slug:s.published?.slug??s.draft.slug,title:s.draft.title}))}/>;
}
