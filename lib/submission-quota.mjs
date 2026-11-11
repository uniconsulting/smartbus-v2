import { createHmac } from "node:crypto";

const minute = 60_000;
const day = 24 * 60 * minute;
const keys = new WeakMap();

export const publicQuotaSchema = [
  "CREATE TABLE IF NOT EXISTS public_rate_limits(key TEXT PRIMARY KEY, used INTEGER NOT NULL, capacity INTEGER NOT NULL, expires INTEGER NOT NULL, CONSTRAINT public_quota_capacity CHECK(used<=capacity))",
  "CREATE INDEX IF NOT EXISTS public_rate_expiry ON public_rate_limits(expires)",
  "CREATE TABLE IF NOT EXISTS public_rate_key (id INTEGER PRIMARY KEY CHECK(id=1), secret TEXT NOT NULL)",
  "INSERT OR IGNORE INTO public_rate_key(id,secret) VALUES(1,hex(randomblob(32)))",
];

async function digestKey(db) {
  if (!keys.has(db)) {
    keys.set(db, db.execute("SELECT secret FROM public_rate_key WHERE id=1")
      .then(({ rows }) => Buffer.from(String(rows[0].secret), "hex"))
      .catch(error => { keys.delete(db); throw error; }));
  }
  return keys.get(db);
}

function contactKey(value) {
  if (/^\+?[\d()\s-]+$/.test(value)) {
    let digits = value.replace(/\D/g, "");
    if (digits.length === 10) digits = "7" + digits;
    if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
    return digits;
  }
  // Ignore URL tracking parameters, spelling variants and trailing slashes.
  if (value.startsWith("@")) return value.toLowerCase();
  const url = new URL(/^https?:\/\//i.test(value) ? value : "https://" + value);
  const path = url.pathname.toLowerCase().replace(/\/+$/, "");
  if (["t.me", "telegram.me"].includes(url.hostname)) return "@" + path.slice(1);
  return "max:" + path;
}

export function leadLimits(contact, ip) {
  const result = [
    ["lead-total", "", 60, 10 * minute],
    ["lead-day", "", 500, day],
    ["lead-contact", contactKey(contact), 3, 10 * minute],
  ];
  if (ip) result.push(["lead-ip", ip, 10, 10 * minute]);
  return result;
}

export function eventLimits(session, ip) {
  const result = [
    ["event-total", "", 600, minute],
    ["event-day", "", 20_000, day],
    ["event-session", session, 80, minute],
  ];
  if (ip) result.push(["event-ip", ip, 150, minute]);
  return result;
}

// A constraint violation rolls back *all* counters and the write in one transaction.
// Existing idempotency keys skip every counter and the final INSERT never overwrites a receipt.
export async function budgetedWrite(db, limits, existing, write, now = Date.now(), beforeWrite = []) {
  const secret = await digestKey(db);
  const buckets = limits.map(([scope, identity, capacity, period]) => ({
    key: scope + ":" + createHmac("sha256", secret).update(identity).digest("hex"),
    capacity, period,
  }));
  const placeholders = buckets.map(() => "?").join(",");
  const args = existing?.args ?? [];
  const skip = existing ? " WHERE NOT EXISTS (" + existing.sql + ")" : " WHERE 1";
  const known = await db.execute({
    sql: "SELECT " + (existing ? "EXISTS(" + existing.sql + ")" : "0") + " AS duplicate, " +
      "(SELECT MAX(expires) FROM public_rate_limits WHERE key IN (" + placeholders +
      ") AND used>=capacity AND expires>?) AS blocked_until",
    args: [...args, ...buckets.map(bucket => bucket.key), now],
  });
  if (known.rows[0].duplicate) return { status: "duplicate", retryAfter: 0 };
  if (known.rows[0].blocked_until) return {
    status: "limited", retryAfter: Math.max(1, Math.ceil((Number(known.rows[0].blocked_until) - now) / 1000)),
  };
  const statements = buckets.map(bucket => ({
    sql: "INSERT INTO public_rate_limits(key,used,capacity,expires) SELECT ?,1,?,?" + skip +
      " ON CONFLICT(key) DO UPDATE SET used=CASE WHEN expires<=? THEN 1 ELSE used+1 END," +
      " capacity=excluded.capacity, expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END",
    args: [bucket.key, bucket.capacity, now + bucket.period, ...args, now, now],
  }));
  try {
    const rows = await db.batch([...statements, ...beforeWrite, write], "write");
    return { status: rows[rows.length - 1].rowsAffected ? "accepted" : "duplicate", retryAfter: 0 };
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("public_quota_capacity")) throw error;
    const { rows } = await db.execute({
      sql: "SELECT MAX(expires) AS expires FROM public_rate_limits WHERE key IN (" + placeholders +
        ") AND used>=capacity AND expires>?",
      args: [...buckets.map(bucket => bucket.key), now],
    });
    return { status: "limited", retryAfter: Math.max(1, Math.ceil((Number(rows[0]?.expires ?? now) - now) / 1000)) };
  }
}
