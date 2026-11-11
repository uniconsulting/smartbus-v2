"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { isId } from "@/lib/analytics-contract";
import { issueChatCommand, checkChatCommand } from "@/lib/max-chat-lookup";
import { maxDiagnosticMessage } from "@/lib/max-diagnostics";
import { checkMaxConnection, saveIntegrations } from "@/lib/integrations";
import { deliverLead, deliveryLabels } from "@/lib/integrations-delivery";

export type BotSaveResult = { ok: true; revision: number; message: string } | { ok: false; message: string };

export async function saveBotSettings(data: FormData): Promise<BotSaveResult> {
  await requireAdmin();
  try {
    const revision = await saveIntegrations(data);
    revalidatePath("/adpanel/integrations");
    return { ok: true, revision, message: "Настройки сохранены." };
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/^(Введите|Проверьте|Другой редактор|SMARTBUS_INTEGRATION_KEY|Некорректн)/.test(message))
      return { ok: false, message };
    return { ok: false, message: "Не удалось записать настройки. Проверьте доступ к хранилищу." };
  }
}
export async function retryDelivery(_: string, data: FormData): Promise<string> {
  await requireAdmin();
  const id = data.get("id");
  if (!isId(id)) return "Некорректный номер заявки.";
  try {
    const state = await deliverLead(id, data.get("confirmed") === "on");
    revalidatePath("/adpanel/integrations");
    return deliveryLabels[state.state];
  } catch {
    return "Не удалось проверить состояние заявки.";
  }
}

export async function checkMax(): Promise<string> {
  await requireAdmin();
  try {
    return await checkMaxConnection();
  } catch (error) {
    return maxDiagnosticMessage(error);
  }
}

export async function beginMaxChatLookup() {
  const login = await requireAdmin();
  try {
    return await issueChatCommand(login);
  } catch (error) {
    return { error: maxDiagnosticMessage(error) };
  }
}

export async function resolveMaxChatLookup(command: string) {
  const login = await requireAdmin();
  try {
    return await checkChatCommand(login, command);
  } catch (error) {
    return { error: maxDiagnosticMessage(error) };
  }
}
