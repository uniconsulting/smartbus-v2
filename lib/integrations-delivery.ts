import "server-only";
import { maxRequest } from "./integrations-max";
import { leadNotification } from "./lead-notification";
import { randomUUID } from "node:crypto";
import { analyticsDb, type AcceptedLead } from "./analytics-store";
import { destination, integrationSettings, type Destination } from "./integrations";

type State = "pending" | "sending" | "sent" | "local" | "unconfigured" | "rejected" | "uncertain";
export type Delivery = { state: State; at?: string; provider?: string; status?: number };
export const deliveryLabels: Record<State, string> = {
  pending: "Ожидает отправки",
  sending: "Отправляется",
  sent: "Доставлено",
  local: "Сохранена на сайте",
  unconfigured: "Не настроен получатель",
  rejected: "Сервис отклонил запрос",
  uncertain: "Нужно проверить чат",
};

export async function deliveryFor(id: string): Promise<Delivery> {
  const db = await analyticsDb();
  const { rows } = await db.execute({
    sql: "SELECT delivery,attempted,provider,http_status FROM lead_requests WHERE id=?",
    args: [id],
  });
  if (!rows[0]) throw new Error("Заявка не найдена.");
  const row = rows[0],
    at = row.attempted ? String(row.attempted) : undefined;
  const state =
    row.delivery === "sending" && at && Date.now() - Date.parse(at) > 60_000
      ? "uncertain"
      : (row.delivery as State);
  return {
    state,
    at,
    provider: row.provider ? String(row.provider) : undefined,
    status: row.http_status ? Number(row.http_status) : undefined,
  };
}
async function send(d: Destination, text: string, format?: "html"): Promise<number> {
  if (d.provider === "telegram") {
    const res = await fetch("https://api.telegram.org/bot" + d.token + "/sendMessage", {
      method: "POST",
      redirect: "error",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: d.id, text, link_preview_options: { is_disabled: true } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return res.status;
    const result = await res.json().catch(() => null);
    return result?.ok === true ? res.status : 502;
  }
  const url = new URL("https://platform-api2.max.ru/messages");
  url.searchParams.set(d.kind, d.id);
  url.searchParams.set("disable_link_preview", "true");
  return maxRequest(d.token, url.pathname + url.search, { text, format });
}
export async function deliverLead(id: string, confirmUncertain = false, transport = send): Promise<Delivery> {
  const db = await analyticsDb();
  const owner = randomUUID(),
    at = new Date().toISOString();
  const claim = await db.execute({
    sql: "UPDATE lead_requests SET delivery='sending', attempted=?, owner=?, http_status=NULL WHERE id=? AND (delivery IN ('pending','local','unconfigured','rejected') OR (?=1 AND (delivery='uncertain' OR (delivery='sending' AND attempted<?))))",
    args: [at, owner, id, confirmUncertain ? 1 : 0, new Date(Date.now() - 60_000).toISOString()],
  });
  if (!claim.rowsAffected) return deliveryFor(id);
  async function finish(state: State, provider: string | null = null, status: number | null = null) {
    await db.execute({
      sql: "UPDATE lead_requests SET delivery=?,provider=?,http_status=?,owner=NULL WHERE id=? AND owner=?",
      args: [state, provider, status, id, owner],
    });
    return deliveryFor(id);
  }
  const d = await destination().catch(() => null);
  if (!d) {
    const settings = await integrationSettings();
    return finish(settings.mode === "local" ? "local" : "unconfigured");
  }
  const { rows } = await db.execute({ sql: "SELECT details FROM lead_requests WHERE id=?", args: [id] });
  const lead: AcceptedLead = JSON.parse(String(rows[0].details));
  try {
    const { text, format } = leadNotification(lead, d.provider === "max");
    const status = await transport(d, text, format);
    return finish(
      status >= 200 && status < 300 ? "sent" : status >= 400 && status < 500 ? "rejected" : "uncertain",
      d.provider,
      status,
    );
  } catch {
    return finish("uncertain", d.provider);
  }
}
