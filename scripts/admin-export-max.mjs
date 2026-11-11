import { createRequire } from "node:module";
import { open, unlink } from "node:fs/promises";
import { database } from "../lib/admin-db.mjs";
import { openSecret } from "../lib/integration-crypto.mjs";
import { privateOutputPath } from "./private-output.mjs";

const require = createRequire(import.meta.resolve("next/package.json"));
require("@next/env").loadEnvConfig(process.cwd(), process.env.NODE_ENV === "development");

async function main() {
  if (process.argv.length !== 3) throw new Error("Укажите путь к новому закрытому файлу вне репозитория.");
  const output = await privateOutputPath(process.argv[2]);
  const db = await database();
  try {
    const { rows } = await db.execute({ sql: "SELECT value FROM records WHERE key=?", args: ["integrations"] });
    const settings = JSON.parse(String(rows[0]?.value ?? "{}"));
    if (["local", "telegram"].includes(settings.mode)) throw new Error("Сначала выберите MAX для доставки.");
    const token = settings.maxToken ? await openSecret(settings.maxToken, "max") : process.env.MAX_BOT_TOKEN;
    const chat = settings.maxChat ?? process.env.MAX_CHAT_ID;
    if (!token || !/^[A-Za-z0-9_:.-]{10,512}$/.test(token) || !/^-?[1-9]\d{0,18}$/.test(chat || "")) {
      throw new Error("Сначала сохраните токен MAX и числовой ID группы в админ-панели.");
    }
    const handle = await open(output, "wx", 0o600);
    try {
      await handle.writeFile(`MAX_BOT_TOKEN=${token}\nMAX_CHAT_ID=${chat}\n`);
      await handle.sync();
    } catch (error) {
      await unlink(output);
      throw error;
    } finally {
      await handle.close();
    }
    console.log("Файл MAX для закрытой передачи создан.");
  } finally {
    db.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
