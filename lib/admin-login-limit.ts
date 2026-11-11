import { createHash } from "node:crypto";
import type { Client } from "@libsql/client";

export const loginWindowMs = 15 * 60 * 1000;
const maxConcurrent = 2;
let active = 0;

export async function verifyWithinLoginBudget<T>(
  db: Client,
  client: string,
  login: string,
  verify: () => Promise<T | null>,
  now = Date.now(),
): Promise<T | null | "limited"> {
  if (active >= maxConcurrent) return "limited";
  active++;
  try {
    const hash = (value: string) => createHash("sha256").update(value).digest("hex");
    const source = "source:" + hash(client);
    const pair = "pair:" + hash(client + "\0" + login);
    // Admit and charge all three budgets in one write transaction. Rejected
    // attempts neither consume a different budget nor create rows for new names.
    const [, result] = await db.batch([
      { sql: "DELETE FROM admin_login_limits WHERE expires<=?", args: [now] },
      {
        sql: `WITH budget(key,expires,cap) AS (
                VALUES (?, ?, 10), (?, ?, 30), ('global', ?, 4)
              ), allowed AS MATERIALIZED (
                SELECT NOT EXISTS (
                  SELECT 1 FROM budget JOIN admin_login_limits USING(key)
                  WHERE attempts>=cap
                ) AS ok
              )
              INSERT INTO admin_login_limits(key,expires,attempts)
              SELECT key,expires,1 FROM budget WHERE (SELECT ok FROM allowed)
              ON CONFLICT(key) DO UPDATE SET attempts=attempts+1`,
        args: [pair, now + loginWindowMs, source, now + loginWindowMs, now + 1000],
      },
    ], "write");
    if (result.rowsAffected !== 3) return "limited";
    const value = await verify();
    if (value !== null) await db.execute({ sql: "DELETE FROM admin_login_limits WHERE key=?", args: [pair] });
    return value;
  } finally {
    active--;
  }
}
