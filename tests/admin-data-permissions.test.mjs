import assert from "node:assert/strict";
import { chmod, lstat, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { createClient } from "@libsql/client";
import { database } from "../lib/admin-db.mjs";

test("rejects a shared directory without chmod, then secures an existing WAL database in a private directory", async t => {
  const dir = await mkdtemp(join(tmpdir(), "smartbus-data-permissions-"));
  process.env.SMARTBUS_DATA_DIR = dir;
  t.after(() => rm(dir, { recursive: true, force: true }));
  await chmod(dir, 0o755);
  await assert.rejects(database, /SMARTBUS_DATA_DIR/);
  assert.equal((await stat(dir)).mode & 0o777, 0o755);
  assert.deepEqual(await readdir(dir), []);

  await chmod(dir, 0o700);
  const file = join(dir, "smartbus.sqlite");
  const previous = createClient({ url: pathToFileURL(file).href });
  try {
    await previous.execute("PRAGMA journal_mode = WAL");
    await previous.execute("CREATE TABLE existing_account_fixture (id INTEGER PRIMARY KEY)");
    await previous.execute("INSERT INTO existing_account_fixture VALUES(7)");
    const files = [file, file + "-wal", file + "-shm"];
    for (const name of files) await chmod(name, 0o644);
    const db = await database();
    try {
      assert.equal((await db.execute("SELECT id FROM existing_account_fixture")).rows[0].id, 7);
      for (const name of files) assert.equal((await lstat(name)).mode & 0o777, 0o600);
    } finally {
      db.close();
    }
  } finally {
    previous.close();
  }
});
