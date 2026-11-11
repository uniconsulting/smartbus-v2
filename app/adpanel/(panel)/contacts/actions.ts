"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { saveContacts } from "@/lib/cms-contacts";
import type { ContactField } from "@/lib/public-contacts";

export type ContactSaveState = { revision: number; message: string; ok: boolean; field?: ContactField };

export async function saveContactForm(previous: ContactSaveState, form: FormData): Promise<ContactSaveState> {
  await requireAdmin();
  const revision = previous.revision;
  if (!Number.isSafeInteger(revision) || revision < 0) {
    return { revision: 0, ok: false, message: "Обновите страницу и повторите сохранение." };
  }
  try {
    const result = await saveContacts(form, revision);
    if ("error" in result) return { revision, ok: false, message: result.error, field: result.field };
    revalidatePath("/", "layout");
    return { revision: result.revision, ok: true, message: "Контакты сохранены на сайте." };
  } catch (error) {
    return { revision, ok: false, message: error instanceof Error && error.message.startsWith("Другой редактор")
      ? error.message : "Не удалось сохранить контакты. Обновите страницу и попробуйте ещё раз." };
  }
}
