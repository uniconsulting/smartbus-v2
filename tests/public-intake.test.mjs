// Run with Node 24: node --test tests/public-intake.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { readPublicJson } from "../lib/public-request.ts";
import { trustedClientIp } from "../lib/client-ip.ts";
import { budgetedWrite, eventLimits, leadLimits, publicQuotaSchema } from "../lib/submission-quota.mjs";
import { pruneSubmissions } from "../lib/submission-retention.mjs";

const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };
const url = "https://smartbus.example/api/lead";
function post(body, headers = jsonHeaders) {
  return new Request(url, { method: "POST", body, headers, duplex: "half" });
}

test("JSON endpoints reject browser cross-origin requests, invalid UTF-8 and oversized chunked bodies", async () => {
  assert.equal((await readPublicJson(post('{"a":1}', { ...jsonHeaders, Origin: "https://smartbus.example" }), 7)).body.a, 1);
  assert.equal((await readPublicJson(post('{"a":1}'), 7)).body.a, 1);
  for (const origin of ["null", "http://smartbus.example", "https://another.example"]) {
    assert.equal((await readPublicJson(post("{}", { ...jsonHeaders, Origin: origin }), 100)).response.status, 403);
  }
  assert.equal((await readPublicJson(post("{}", { ...jsonHeaders, "Sec-Fetch-Site": "cross-site" }), 100)).response.status, 403);
  assert.equal((await readPublicJson(post("{}", { "Content-Type": "text/plain" }), 100)).response.status, 415);
  assert.equal((await readPublicJson(post("{}", { ...jsonHeaders, "Content-Length": "999999" }), 100)).response.status, 413);
  assert.equal((await readPublicJson(post(new Uint8Array([0x7b, 0xff, 0x7d])), 100)).response.status, 400);
  let cancelled = false;
  let chunks = 0;
  const stream = new ReadableStream({
    pull(controller) { chunks++; controller.enqueue(new TextEncoder().encode("аа")); },
    cancel() { cancelled = true; },
  });
  assert.equal((await readPublicJson(post(stream), 6)).response.status, 413);
  assert.equal(cancelled, true);
  assert.ok(chunks < 5);
});

test("client-supplied IP chains never select the rate identity", () => {
  const before = process.env.SMARTBUS_TRUST_PROXY;
  try {
    delete process.env.SMARTBUS_TRUST_PROXY;
    const real = new Headers({ "X-Real-IP": "2001:0db8::1", "X-Forwarded-For": "192.0.2.99" });
    assert.equal(trustedClientIp(real), null);
    process.env.SMARTBUS_TRUST_PROXY = "1";
    assert.equal(trustedClientIp(real), "2001:db8::1");
    assert.equal(trustedClientIp(new Headers({ "X-Forwarded-For": "192.0.2.99" })), null);
    assert.equal(trustedClientIp(new Headers({ "X-Real-IP": "192.0.2.1,192.0.2.2" })), null);
  } finally {
    if (before === undefined) delete process.env.SMARTBUS_TRUST_PROXY;
    else process.env.SMARTBUS_TRUST_PROXY = before;
  }
});

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "smartbus-intake-test-"));
  const url = pathToFileURL(join(directory, "test.sqlite")).href;
  const db = createClient({ url });
  const other = createClient({ url });
  t.after(async () => { db.close(); other.close(); await rm(directory, { recursive: true, force: true }); });
  await db.batch([...publicQuotaSchema,
    "CREATE TABLE lead_requests(id TEXT PRIMARY KEY, at TEXT NOT NULL)",
    "CREATE INDEX lead_requests_at ON lead_requests(at)",
    "CREATE TABLE site_events(id TEXT PRIMARY KEY, at TEXT NOT NULL)",
    "CREATE INDEX site_events_at ON site_events(at)",
  ], "write");
  return { db, other };
}

const now = Date.UTC(2026, 10, 10);
function insert(db, table, limits, id, time = now) {
  return budgetedWrite(db, limits,
    { sql: "SELECT 1 FROM " + table + " WHERE id=?", args: [id] },
    { sql: "INSERT INTO " + table + "(id,at) VALUES(?,?) ON CONFLICT DO NOTHING", args: [id, new Date(time).toISOString()] }, time);
}

test("distinct senders share durable quotas, duplicate receipts skip charges and rejected writes roll back", async t => {
  const { db, other } = await fixture(t);
  const variants = ["+7 (900) 000-00-00", "8 900 000 00 00", "9000000000"];
  for (const [index, contact] of variants.entries()) {
    assert.equal((await insert(index % 2 ? other : db, "lead_requests", leadLimits(contact, null), "lead" + index)).status, "accepted");
  }
  const limits = leadLimits(variants[0], null);
  assert.equal((await insert(other, "lead_requests", limits, "lead1")).status, "duplicate");
  const blocked = await insert(other, "lead_requests", limits, "lead3");
  assert.equal(blocked.status, "limited");
  assert.equal(blocked.retryAfter, 600);
  assert.deepEqual((await db.execute("SELECT used FROM public_rate_limits")).rows.map(r => r.used), [3, 3, 3]);
  assert.equal((await insert(db, "lead_requests", limits, "lead3", now + 600_001)).status, "accepted");
  const same = await Promise.all([db, other].map(connection => insert(connection, "lead_requests", leadLimits("@synthetic", null), "retry")));
  assert.deepEqual(same.map(receipt => receipt.status).sort(), ["accepted", "duplicate"]);
  const events = eventLimits("synthetic", "192.0.2.1");
  for (let i = 0; i < 80; i++) assert.equal((await insert(db, "site_events", events, "event" + i)).status, "accepted");
  assert.equal((await insert(db, "site_events", events, "blocked")).status, "limited");
  for (let i = 0; i < 70; i++) {
    assert.equal((await insert(db, "site_events", eventLimits("rotated" + i, "192.0.2.1"), "rotated" + i)).status, "accepted");
  }
  assert.equal((await insert(other, "site_events", eventLimits("new", "192.0.2.1"), "blocked again")).status, "limited");
  assert.equal((await insert(other, "site_events", eventLimits("new", "192.0.2.2"), "different-IP")).status, "accepted");
});

test("indexed retention deletes a bounded batch of expired rows and preserves current rows", async t => {
  const { db } = await fixture(t);
  for (const table of ["lead_requests", "site_events"]) {
    for (const id of ["old-1", "old-2", "old-3", "current"]) {
      await db.execute({ sql: "INSERT INTO " + table + " VALUES(?,?)", args: [id, id === "current" ? "2026-11-10T00:00:00.000Z" : "2025-11-10T00:00:00.000Z"] });
    }
  }
  assert.deepEqual(await pruneSubmissions(db, new Date(now), 2), { leads: 2, events: 2, counters: 0 });
  assert.deepEqual(await pruneSubmissions(db, new Date(now), 2), { leads: 1, events: 1, counters: 0 });
  for (const table of ["lead_requests", "site_events"]) {
    assert.deepEqual((await db.execute("SELECT id FROM " + table)).rows.map(row => row.id), ["current"]);
  }
});

test("a failed receipt rolls back its consent archive and quotas; duplicate retries cannot change the archive", async t => {
  const { db } = await fixture(t);
  await db.execute("CREATE TABLE records(key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  const exists = { sql: "SELECT 1 FROM lead_requests WHERE id=?", args: ["id"] };
  const archive = value => ({ sql: "INSERT INTO records VALUES('terms',?)", args: [value] });
  const limits = leadLimits("@fixture", null);
  await assert.rejects(budgetedWrite(db, limits, exists, "INSERT INTO lead_requests VALUES('id',NULL)", now, [archive("first")]));
  for (const table of ["records", "public_rate_limits", "lead_requests"]) {
    assert.equal((await db.execute("SELECT COUNT(*) AS n FROM " + table)).rows[0].n, 0);
  }
  const save = { sql: "INSERT INTO lead_requests VALUES('id',?)", args: [new Date(now).toISOString()] };
  assert.equal((await budgetedWrite(db, limits, exists, save, now, [archive("first")])).status, "accepted");
  assert.equal((await budgetedWrite(db, limits, exists, save, now, [archive("replacement")])).status, "duplicate");
  assert.equal((await db.execute("SELECT value FROM records")).rows[0].value, "first");
});
