import { requireAdmin } from "@/lib/admin-auth";
import { notFound } from "next/navigation";
import { readDocumentEditions } from "@/lib/cms-documents";
import DocumentEditor from "../editor";

export default async function DocumentEditorPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string}>}) {
  await requireAdmin();
  const {id}=await params;
  const {saved}=await searchParams;
  const {value,revision}=await readDocumentEditions();
  const item=value.find(s=>s.id===id);
  if(id!=="new" && !item)notFound();
  return <DocumentEditor key={id} item={item??null} revision={revision} saved={saved??""}/>;
}
