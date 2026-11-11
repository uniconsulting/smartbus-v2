"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { writeRecord } from "@/lib/admin-store";
import { seoPages, type SeoPage } from "@/lib/cms-seo";

export async function saveSeo(key: SeoPage, previous: { message: string; revision: number }, data: FormData) {
  await requireAdmin();
  const revision = previous.revision;
  const failed = { message: "Проверьте заголовок и описание страницы.", revision };
  if (!Object.hasOwn(seoPages, key)) return failed;
  const title = String(data.get("title") ?? "").trim();
  const description = String(data.get("description") ?? "").trim();
  if (!title || !description || title.length > 180 || description.length > 400) return failed;
  try {
    const next = await writeRecord("seo-"+key, { title, description, index: data.get("index") === "on" }, revision);
    revalidatePath(seoPages[key].path); revalidatePath("/sitemap.xml"); revalidatePath("/adpanel/seo");
    return { message: "Настройки опубликованы.", revision: next };
  } catch (err) { return { message: err instanceof Error && err.message.startsWith("Другой редактор") ? err.message : "Не удалось сохранить настройки.", revision }; }
}
