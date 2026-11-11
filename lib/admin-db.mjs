import { chmod, mkdir, lstat, open } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";

export function dataDirectory() {
  return resolve(process.env.SMARTBUS_DATA_DIR || join(process.cwd(), "data"));
}

async function prepareSqliteFile(path, create) {
  const info = await lstat(path).catch(error => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!info) {
    if (create) {
      const handle = await open(path, "wx", 0o600).catch(error => {
        if (error.code === "EEXIST") return null;
        throw error;
      });
      if (handle) await handle.close();
      else await prepareSqliteFile(path, false);
    }
    return;
  }
  if (!info.isFile() || info.nlink !== 1) throw new Error("Для SQLite нужен отдельный обычный файл.");
  // Leave live database descriptors entirely to SQLite (its POSIX locks are process-wide).
  if ((info.mode & 0o777) !== 0o600) {
    await chmod(path, 0o600).catch(error => {
      if (create || error.code !== "ENOENT") throw error;
    });
  }
}

async function openDatabase() {
  const directory = dataDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const dir = await lstat(directory);
  if (!dir.isDirectory() || (dir.mode & 0o077) !== 0) {
    throw new Error("SMARTBUS_DATA_DIR должен указывать на отдельный приватный каталог с правами 0700. Проверьте путь и права владельца перед запуском.");
  }
  const file = join(directory, "smartbus.sqlite");
  // SQLite derives permissions for new WAL and SHM files from the database at open.
  await prepareSqliteFile(file, true);
  for (const suffix of ["-wal", "-shm", "-journal"]) await prepareSqliteFile(file + suffix, false);
  const db = createClient({ url: pathToFileURL(file).href });
  await db.execute("PRAGMA busy_timeout = 5000");
  await db.execute("PRAGMA journal_mode = WAL");
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS records (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, revision INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS accounts (
      login TEXT PRIMARY KEY, salt TEXT NOT NULL, password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      digest TEXT PRIMARY KEY, login TEXT NOT NULL, expires INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires);
    CREATE TABLE IF NOT EXISTS admin_login_limits (
      key TEXT PRIMARY KEY, expires INTEGER NOT NULL, attempts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS admin_login_expires ON admin_login_limits(expires);
  `);
  return db;
}

/** @type {Promise<import("@libsql/client").Client> | undefined} */
let pending;
export function database() {
  pending ??= openDatabase().catch(error => { pending = undefined; throw error; });
  return pending;
}
