import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { database } from "./admin-db.mjs";
import { passwordHash } from "./admin-password.mjs";
import { loginWindowMs, verifyWithinLoginBudget } from "./admin-login-limit";
import { trustedClientIp } from "./client-ip";

const cookieName = "sb_admin";
const lifetime = 12 * 60 * 60;

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function currentAdmin(): Promise<string | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const db = await database();
  const { rows } = await db.execute({ sql: "SELECT login FROM sessions WHERE digest=? AND expires>?", args: [digest(token), Date.now()] });
  return rows.length ? String(rows[0].login) : null;
}

export async function requireAdmin(): Promise<string> {
  const login = await currentAdmin();
  if (!login) redirect("/adpanel/login");
  return login;
}

export async function loginAdmin(login: string, password: string): Promise<"ok" | "invalid" | "limited"> {
  if (!/^[a-z0-9_.@-]{1,100}$/i.test(login) || !password || password.length > 1024) return "invalid";
  const db = await database();
  const now = Date.now();
  const requestHeaders = await headers();
  const jar = await cookies();
  const host = requestHeaders.get("host")?.split(":")[0];
  const secure = host !== "localhost" && host !== "127.0.0.1";
  const address = trustedClientIp(requestHeaders);
  let client = "ip:" + address;
  if (!address) {
    // A proxy-less deployment cannot distinguish network peers. Isolate each
    // browser, while the global budget still bounds work if cookies are rotated.
    let marker = jar.get("sb_login_client")?.value;
    if (!marker || !/^[a-f0-9]{32}$/.test(marker)) {
      marker = randomBytes(16).toString("hex");
      jar.set("sb_login_client", marker, { path: "/adpanel", httpOnly: true, sameSite: "strict", secure, maxAge: loginWindowMs / 1000 });
    }
    client = "browser:" + marker;
  }
  const verifiedHash = await verifyWithinLoginBudget(db, client, login, async () => {
    const { rows } = await db.execute({ sql: "SELECT salt, password_hash FROM accounts WHERE login=?", args: [login] });
    const salt = String(rows[0]?.salt ?? "unregistered-account");
    const hash = String(rows[0]?.password_hash ?? "00".repeat(64));
    const expected = Buffer.from(hash, "hex");
    const computed = await passwordHash(password, salt);
    return expected.length === computed.length && timingSafeEqual(computed, expected) && rows.length ? hash : null;
  });
  if (verifiedHash === "limited") return "limited";
  if (!verifiedHash) return "invalid";
  const token = randomBytes(32).toString("hex");
  const changes = await db.batch([
    { sql: "DELETE FROM sessions WHERE expires<=?", args: [now] },
    { sql: "INSERT INTO sessions(digest,login,expires) SELECT ?,login,? FROM accounts WHERE login=? AND password_hash=?",
      args: [digest(token), now + lifetime*1000, login, verifiedHash] },
  ], "write");
  if (changes[1].rowsAffected === 0) return "invalid";
  jar.set(cookieName, token, { path: "/", httpOnly: true, sameSite: "strict", secure, maxAge: lifetime });
  return "ok";
}

export async function endAdminSession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) {
    const db = await database();
    await db.execute({ sql: "DELETE FROM sessions WHERE digest=?", args: [digest(token)] });
  }
  jar.delete(cookieName);
}
