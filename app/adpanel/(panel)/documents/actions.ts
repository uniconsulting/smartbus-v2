"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { changeDocument } from "@/lib/cms-documents";
import { EditorialError, editorMessage, type EditionMode, type EditorResult } from "@/lib/cms-editions";

export async function editDocument(id:string|null, revision:number, mode:EditionMode, raw:unknown, upload?:FormData):Promise<EditorResult> {
  await requireAdmin();
  try {
    const file=upload?.get("file");
    if(typeof file==="string")throw new EditorialError("Выберите PDF-файл.");
    const result=await changeDocument(id,revision,mode,raw,file||undefined);
    revalidatePath("/adpanel/documents","layout");
    revalidatePath("/documents","layout");
    return {ok:true,...result};
  }catch(e){return {ok:false,error:editorMessage(e, "Не удалось сохранить документ. Повторите попытку.")};}
}
export async function reorderDocument(id:string,revision:number,mode:"up"|"down") {
  await requireAdmin();
  if(mode!=="up" && mode!=="down")return {ok:false as const,error:"Некорректное действие."};
  return editDocument(id,revision,mode,null);
}
