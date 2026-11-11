import "server-only";
import { database } from "./admin-db.mjs";
export { dataDirectory } from "./admin-db.mjs";

export async function readRecord<T>(key: string, fallback: T): Promise<{ value: T; revision: number }> {
  const db = await database();
  const { rows } = await db.execute({ sql: "SELECT value, revision FROM records WHERE key = ?", args: [key] });
  if (!rows.length) return { value: fallback, revision: 0 };
  return { value: JSON.parse(String(rows[0].value)), revision: Number(rows[0].revision) };
}

export async function writeRecord<T>(key: string, value: T, expectedRevision: number): Promise<number> {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error("Некорректная версия записи.");
  const db = await database();
  const json = JSON.stringify(value);
  const result = expectedRevision === 0
    ? await db.execute({ sql: "INSERT INTO records(key,value,revision) VALUES (?,?,1) ON CONFLICT(key) DO NOTHING", args: [key, json] })
    : await db.execute({ sql: "UPDATE records SET value=?, revision=revision+1 WHERE key=? AND revision=?", args: [json, key, expectedRevision] });
  if (result.rowsAffected !== 1) throw new Error("Другой редактор уже изменил эти данные. Обновите страницу и повторите правку.");
  return expectedRevision + 1;
}
