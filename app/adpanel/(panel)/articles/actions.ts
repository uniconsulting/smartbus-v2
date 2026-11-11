"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { changeArticle } from "@/lib/cms-articles";
import { EditorialError, editorMessage, type EditionMode, type EditorResult } from "@/lib/cms-editions";

export async function editArticle(id: string | null, revision: number, mode: EditionMode, raw: unknown, upload?: FormData): Promise<EditorResult> {
  await requireAdmin();
  try {
    const file=upload?.get("file");
    if (typeof file==="string") throw new EditorialError("Выберите файл обложки.");
    const result = await changeArticle(id,revision,mode,raw,file||undefined);
    revalidatePath("/adpanel/articles","layout");
    revalidatePath("/articles","layout");
    revalidatePath("/sitemap.xml");
    return {ok:true,...result};
  } catch (e) {return {ok:false,error:editorMessage(e, "Не удалось сохранить статью. Повторите попытку.")};}
}
export async function reorderArticle(id: string, revision: number, mode: "up" | "down") {
  await requireAdmin();
  if (mode !== "up" && mode !== "down") return {ok:false as const,error:"Некорректное действие."};
  return editArticle(id,revision,mode,null);
}
