import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { writeFile, unlink } from "node:fs/promises";
import { privateOutputPath } from "./private-output.mjs";
import { database } from "../lib/admin-db.mjs";
import { passwordHash } from "../lib/admin-password.mjs";

// Resolve the same data directory as next start, including .env.local.
const projectRequire = createRequire(import.meta.resolve("next/package.json"));
projectRequire("@next/env").loadEnvConfig(process.cwd(), process.env.NODE_ENV === "development");

const [rawLogin, output, flag] = process.argv.slice(2);
const login = rawLogin?.trim().toLowerCase();
if (!login || !/^[a-z0-9_.@-]{1,100}$/.test(login) || !output || (flag && flag !== "--reset")) {
  console.error("Формат: pnpm admin:account <логин> <новый локальный файл для пароля> [--reset]");
  process.exit(1);
}
const privateFile = await privateOutputPath(output);
const db = await database();
const salt = randomBytes(24).toString("hex");
const password = randomBytes(24).toString("base64url");
const hash = (await passwordHash(password, salt)).toString("hex");
const result = await db.execute({ sql: "SELECT login FROM accounts WHERE login=?", args: [login] });
if (result.rows.length && flag !== "--reset") throw new Error("Логин уже существует. Для смены пароля укажите --reset.");
await writeFile(privateFile, `SmartBus\nЛогин: ${login}\nПароль: ${password}\n`, { flag: "wx", mode: 0o600 });
try {
  const sql = flag === "--reset" ? "INSERT INTO accounts VALUES(?,?,?) ON CONFLICT(login) DO UPDATE SET salt=excluded.salt,password_hash=excluded.password_hash" : "INSERT INTO accounts VALUES(?,?,?)";
  await db.batch([{ sql, args: [login, salt, hash] }, { sql: "DELETE FROM sessions WHERE login=?", args: [login] }], "write");
} catch (error) { await unlink(privateFile); throw error; }
console.log("Учётная запись готова. Данные для входа записаны в указанный файл.");
db.close();
