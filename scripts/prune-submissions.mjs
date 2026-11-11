// Run from the deployed project directory, with the same environment as next start.
import { access } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
import { dataDirectory, database } from "../lib/admin-db.mjs";
import { pruneSubmissions } from "../lib/submission-retention.mjs";
import { publicQuotaSchema } from "../lib/submission-quota.mjs";

const projectRequire = createRequire(import.meta.resolve("next/package.json"));
projectRequire("@next/env").loadEnvConfig(process.cwd(), process.env.NODE_ENV === "development");
await access(join(dataDirectory(), "smartbus.sqlite")); // Never initialize an unused location from cron.
const db = await database();
try {
  const { rows } = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('site_events','lead_requests')");
  if (rows.length === 2) {
    await db.batch(publicQuotaSchema, "write");
    const removed = await pruneSubmissions(db);
    console.log("Удалено заявок: %d, событий: %d, счётчиков: %d.", removed.leads, removed.events, removed.counters);
  }
} finally {
  db.close();
}
