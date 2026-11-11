// Run once per minute from the application or the operator's scheduler.
// Each pass takes a bounded batch so housekeeping releases SQLite's write lock promptly.
export async function pruneSubmissions(db, now = new Date(), limit = 500) {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  // February 29 has no counterpart in the preceding non-leap year.
  if (cutoff.getUTCMonth() !== now.getUTCMonth()) cutoff.setUTCDate(0);
  const expired = cutoff.toISOString();
  const [leads, events, counters] = await db.batch([
    { sql: "DELETE FROM lead_requests WHERE rowid IN (SELECT rowid FROM lead_requests WHERE at<=? ORDER BY at LIMIT ?)", args: [expired, limit] },
    { sql: "DELETE FROM site_events WHERE rowid IN (SELECT rowid FROM site_events WHERE at<=? ORDER BY at LIMIT ?)", args: [expired, limit] },
    { sql: "DELETE FROM public_rate_limits WHERE rowid IN (SELECT rowid FROM public_rate_limits WHERE expires<=? ORDER BY expires LIMIT ?)", args: [now.getTime(), limit] },
  ], "write");
  return { leads: leads.rowsAffected, events: events.rowsAffected, counters: counters.rowsAffected };
}
