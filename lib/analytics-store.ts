import "server-only";
import type { InStatement } from "@libsql/client";
import { database } from "./admin-db.mjs";
import { type SiteEvent, type Visit } from "./analytics-contract";
import { budgetedWrite, eventLimits, leadLimits, publicQuotaSchema } from "./submission-quota.mjs";
import { pruneSubmissions } from "./submission-retention.mjs";

export type AcceptedLead = {
  name: string;
  phone: string;
  contact?: string;
  task: string;
  route: string;
  passengers: string;
  consent: true;
  consentDocument: string;
  consentRevision?: string;
  createdAt: string;
};
export type Receipt = { id: string; at: string; visit: Visit | null };
export type StoredEvent = SiteEvent & { at: string };
export const dayKey = (date: Date) => date.toISOString().slice(0, 10);
let initialized: Promise<void> | undefined;
let nextPrune = 0;
export async function analyticsDb() {
  const db = await database();
  if (!initialized)
    initialized = db
      .batch(
        [
          "CREATE TABLE IF NOT EXISTS site_events(id TEXT NOT NULL, session TEXT NOT NULL, at TEXT NOT NULL, event TEXT NOT NULL, PRIMARY KEY(session,id))",
          "CREATE INDEX IF NOT EXISTS site_events_at ON site_events(at)",
          "CREATE INDEX IF NOT EXISTS site_events_session_at ON site_events(session,at)",
          "CREATE TABLE IF NOT EXISTS lead_requests(id TEXT PRIMARY KEY, at TEXT NOT NULL, visit TEXT, details TEXT NOT NULL, delivery TEXT NOT NULL DEFAULT 'pending', attempted TEXT, provider TEXT, http_status INTEGER, owner TEXT)",
          "CREATE INDEX IF NOT EXISTS lead_requests_at ON lead_requests(at)",
          ...publicQuotaSchema,
        ],
        "write",
      )
      .then(() => {})
      .catch((error: unknown) => {
        initialized = undefined;
        throw error;
      });
  await initialized;
  if (Date.now() >= nextPrune) {
    nextPrune = Date.now() + 60_000;
    await pruneSubmissions(db);
  }
  return db;
}
export async function acceptLead(id: string, lead: AcceptedLead, visit: Visit | null, ip: string | null, consentArchive: InStatement) {
  const db = await analyticsDb();
  let attributed = visit;
  if (visit) {
    const { rows } = await db.execute({
      sql: "SELECT event FROM site_events WHERE session=? ORDER BY at LIMIT 1",
      args: [visit.session],
    });
    const recorded = rows.length ? (JSON.parse(String(rows[0].event)).visit as Visit) : null;
    if (recorded) attributed = recorded.visitor === visit.visitor ? recorded : null;
  }
  return budgetedWrite(db, leadLimits(lead.contact || lead.phone, ip),
    { sql: "SELECT 1 FROM lead_requests WHERE id=?", args: [id] },
    { sql: "INSERT INTO lead_requests(id,at,visit,details) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING",
      args: [id, lead.createdAt, attributed ? JSON.stringify(attributed) : null, JSON.stringify(lead)] }, Date.now(), [consentArchive]);
}
export async function listReceipts(from = "0000-00-00", to = "9999-12-31", limit = -1): Promise<Receipt[]> {
  const db = await analyticsDb();
  // Personal contact fields stay out of the reporting query.
  const { rows } = await db.execute({
    sql: "SELECT id,at,visit FROM lead_requests WHERE at>=? AND at<? ORDER BY at DESC LIMIT ?",
    args: [from, to + "T24:00", limit],
  });
  return rows.map((r) => ({
    id: String(r.id),
    at: String(r.at),
    visit: r.visit ? JSON.parse(String(r.visit)) : null,
  }));
}
export async function storeEvent(event: SiteEvent, ip: string | null, resolveResource?: () => Promise<string | undefined>) {
  const db = await analyticsDb();
  const identity = [event.visit.session, event.id];
  const result = await budgetedWrite(db, eventLimits(event.visit.session, ip),
    { sql: "SELECT 1 FROM site_events WHERE session=? AND id=?", args: identity },
    { sql: "INSERT INTO site_events(session,id,at,event) VALUES(?,?,?,?) ON CONFLICT(session,id) DO NOTHING",
      args: [...identity, new Date().toISOString(), JSON.stringify(event)] });
  // Resolve only an accepted event's optional resource against published CMS records.
  if (result.status === "accepted" && resolveResource) {
    const resource = await resolveResource();
    if (resource) {
      await db.execute({ sql: "UPDATE site_events SET event=? WHERE session=? AND id=?",
        args: [JSON.stringify({ ...event, resource }), ...identity] });
    }
  }
  return result;
}
export async function eventsBetween(from: string, to: string): Promise<StoredEvent[]> {
  const db = await analyticsDb();
  const { rows } = await db.execute({
    sql: "SELECT at,event FROM site_events WHERE at>=? AND at<? ORDER BY at",
    args: [from, to + "T24:00"],
  });
  return rows.map((r) => ({ ...JSON.parse(String(r.event)), at: String(r.at) }));
}

export async function visitBeforeLead(session: string, at: string): Promise<StoredEvent[]> {
  const db = await analyticsDb();
  const { rows } = await db.execute({
    sql: "SELECT at,event FROM site_events WHERE session=? AND at<=? ORDER BY at DESC LIMIT 12",
    args: [session, at],
  });
  return rows.reverse().map((r) => ({ ...JSON.parse(String(r.event)), at: String(r.at) }));
}
