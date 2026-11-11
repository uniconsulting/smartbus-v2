import "server-only";
import { dayKey, eventsBetween, listReceipts, visitBeforeLead } from "./analytics-store";
import { actions, pages, type Visit } from "./analytics-contract";

function validDay(s: string | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return Number.isFinite(+d) && dayKey(d) === s;
}
function group<K>(map: Map<K, number>, key: K) {
  map.set(key, (map.get(key) ?? 0) + 1);
}
export async function readAnalyticsReport(filter: { from?: string; to?: string; source?: string } = {}) {
  const today = dayKey(new Date());
  const to = validDay(filter.to) && filter.to <= today ? filter.to : today;
  const from =
    validDay(filter.from) && filter.from <= to
      ? filter.from
      : dayKey(new Date(+new Date(to) - 29 * 86400000));
  const [events, receipts] = await Promise.all([eventsBetween(from, to), listReceipts(from, to)]);
  const inRange = receipts.filter((r) => r.at.slice(0, 10) >= from && r.at.slice(0, 10) <= to);
  const source = filter.source || "";
  const matches = (visit: Visit | null) => !source || (visit?.source ?? "unattributed") === source;
  const active = events.filter((e) => matches(e.visit));
  const leads = inRange.filter((l) => matches(l.visit));
  const visits = new Set<string>(),
    visitors = new Set<string>(),
    converted = new Set<string>();
  const channels = new Map<string, { visit: Visit; sessions: Set<string>; leads: number }>();
  const pageViews = new Map<string, number>(),
    actionCounts = new Map<string, number>();
  const timeline = new Map<string, { sessions: Set<string>; leads: number }>();
  function day(at: string) {
    const key = at.slice(0, 10);
    if (!timeline.has(key)) timeline.set(key, { sessions: new Set(), leads: 0 });
    return timeline.get(key)!;
  }
  function count(visit: Visit, at: string) {
    visits.add(visit.session);
    visitors.add(visit.visitor);
    day(at).sessions.add(visit.session);
    const key = [visit.source, visit.medium, visit.campaign, visit.content, visit.term].join("/");
    if (!channels.has(key)) channels.set(key, { visit, sessions: new Set(), leads: 0 });
    const entry = channels.get(key)!;
    entry.sessions.add(visit.session);
    return entry;
  }
  for (const e of active) {
    count(e.visit, e.at);
    if (e.action === "view")
      group(pageViews, e.resource ? pages[e.page] + " · " + e.resource : pages[e.page]);
    else group(actionCounts, actions[e.action]);
  }
  for (const l of leads) {
    day(l.at).leads++;
    if (l.visit) {
      count(l.visit, l.at).leads++;
      converted.add(l.visit.session);
    }
  }
  return {
    from,
    to,
    source,
    visits: visits.size,
    visitors: visitors.size,
    leads: leads.length,
    converted: converted.size,
    unattributed: leads.filter((l) => !l.visit).length,
    sources: [
      ...new Set([
        ...events.map((e) => e.visit.source),
        ...inRange.map((r) => r.visit?.source ?? "unattributed"),
      ]),
    ].sort(),
    channels: [...channels.values()]
      .map((c) => ({
        source: c.visit.source,
        medium: c.visit.medium,
        campaign: c.visit.campaign,
        content: c.visit.content,
        term: c.visit.term,
        sessions: c.sessions.size,
        leads: c.leads,
      }))
      .sort((a, b) => b.leads - a.leads || b.sessions - a.sessions),
    timeline: [...timeline]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, x]) => ({ date, sessions: x.sessions.size, leads: x.leads })),
    pageViews: [...pageViews].sort((a, b) => b[1] - a[1]),
    actionCounts: [...actionCounts].sort((a, b) => b[1] - a[1]),
    conversions: await Promise.all(
      leads
        .slice(0, 30)
        .map(async (lead) => ({
          id: lead.id,
          at: lead.at,
          visit: lead.visit,
          steps: (lead.visit ? await visitBeforeLead(lead.visit.session, lead.at) : []).map(
            (e) =>
              (e.action === "view" ? pages[e.page] : actions[e.action]) +
              (e.resource ? " · " + e.resource : ""),
          ),
        })),
    ),
  };
}
