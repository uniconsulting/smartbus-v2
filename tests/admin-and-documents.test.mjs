import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, open, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { database } from "../lib/admin-db.mjs";
import { verifyWithinLoginBudget, loginWindowMs } from "../lib/admin-login-limit.ts";
import { trustedClientIp } from "../lib/client-ip.ts";
import { pdfResponse } from "../lib/pdf-response.ts";

test("admin login budgets isolate clients and bound rotating, concurrent and rejected attempts", async t => {
  const dir = await mkdtemp(join(tmpdir(), "smartbus-auth-check-"));
  process.env.SMARTBUS_DATA_DIR = dir;
  const db = await database();
  t.after(async () => { db.close(); await rm(dir, { recursive: true, force: true }); });

  for (const suffix of ["", "-shm", "-wal"]) {
    assert.equal((await stat(join(dir, "smartbus.sqlite" + suffix))).mode & 0o777, 0o600);
  }
  const fail = async () => null;
  const good = async () => "verified";
  const never = () => assert.fail("request should not start password hashing");
  let now = Date.now();
  const attempt = (client, login, verify) => verifyWithinLoginBudget(db, client, login, verify, now);

  for (const source of ["ip:", "browser:"]) {
    for (let i = 0; i < 10; i++) {
      assert.equal(await attempt(source + "attacker", "editor", fail), null);
      now += 1001;
    }
    assert.equal(await attempt(source + "attacker", "editor", never), "limited");
    assert.equal(await attempt(source + "other-client", "editor", good), "verified");
    now += loginWindowMs + 1;
  }

  for (let i = 0; i < 30; i++) {
    assert.equal(await attempt("ip:sprayer", "invented-" + i, fail), null);
    now += 1001;
  }
  assert.equal(await attempt("ip:sprayer", "new-name", never), "limited");
  for (let i = 0; i < 4; i++) assert.equal(await attempt("browser:rotated-" + i, "editor", fail), null);
  const count = async () => (await db.execute("SELECT COUNT(*) AS n FROM admin_login_limits")).rows[0].n;
  const before = await count();
  for (let i = 0; i < 20; i++) {
    assert.equal(await attempt("browser:discarded-" + i, "unseen-" + i, never), "limited");
  }
  assert.equal(await count(), before);
  now += 1001;
  assert.equal(await attempt("ip:allowed", "editor", good), "verified");

  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const pending = [attempt("ip:1", "editor", () => gate), attempt("ip:2", "editor", () => gate)];
  assert.equal(await attempt("ip:3", "editor", never), "limited");
  release(null);
  assert.deepEqual(await Promise.all(pending), [null, null]);

  now += loginWindowMs + 1;
  assert.equal(await attempt("ip:sprayer", "new-name", good), "verified");
  assert.equal(await count(), 2);
});

test("only explicitly trusted X-Real-IP identifies a network peer", () => {
  const previous = process.env.SMARTBUS_TRUST_PROXY;
  try {
    const headers = new Headers({ "X-Real-IP": "192.0.2.12", "X-Forwarded-For": "192.0.2.99" });
    delete process.env.SMARTBUS_TRUST_PROXY;
    assert.equal(trustedClientIp(headers), null);
    process.env.SMARTBUS_TRUST_PROXY = "1";
    assert.equal(trustedClientIp(headers), "192.0.2.12");
    headers.delete("X-Real-IP");
    assert.equal(trustedClientIp(headers), null);
    headers.set("X-Real-IP", "192.0.2.1, 192.0.2.2");
    assert.equal(trustedClientIp(headers), null);
  } finally {
    if (previous === undefined) delete process.env.SMARTBUS_TRUST_PROXY;
    else process.env.SMARTBUS_TRUST_PROXY = previous;
  }
});

test("PDF metadata and rejected ranges avoid reads, partial streams close on completion and cancellation", async t => {
  const dir = await mkdtemp(join(tmpdir(), "smartbus-pdf-check-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "fixture.pdf");
  const bytes = Buffer.alloc(1024 * 1024, 65);
  bytes.write("PDF-header");
  await writeFile(path, bytes);
  const fixture = await open(path);
  const proto = Object.getPrototypeOf(fixture);
  await fixture.close();
  const calls = [];
  const ordinaryStream = proto.createReadStream;
  t.mock.method(proto, "readFile", () => assert.fail("full-buffer file read"));
  t.mock.method(proto, "createReadStream", function(options) {
    const stream = ordinaryStream.call(this, options);
    calls.push({ options, stream });
    return stream;
  });
  const request = (method, range, signal) => pdfResponse(path, "fixture.pdf", new Request("https://example.test/docs/fixture.pdf", {
    method, headers: range ? { Range: range } : undefined, signal,
  }));

  for (const range of [undefined, "bytes=0-0"]) {
    const head = await request("HEAD", range);
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-length"), String(bytes.length));
    assert.equal(head.body, null);
  }
  for (const range of ["bytes=4-2", "bytes=-0", "bytes=invalid", "bytes=" + bytes.length + "-"]) {
    const result = await request("GET", range);
    assert.equal(result.status, 416);
    assert.equal(result.headers.get("content-range"), "bytes */" + bytes.length);
    assert.equal(result.body, null);
  }
  assert.equal(calls.length, 0);

  for (const [range, start, end] of [["bytes=1-2", 1, 2], ["bytes=0-0", 0, 0],
    ["bytes=-8", bytes.length - 8, bytes.length - 1], ["bytes=999999-", 999999, bytes.length - 1],
    ["bytes=999999-9999999", 999999, bytes.length - 1]]) {
    const result = await request("GET", range);
    assert.equal(result.status, 206);
    assert.equal(result.headers.get("content-range"), `bytes ${start}-${end}/${bytes.length}`);
    assert.equal(result.headers.get("content-length"), String(end - start + 1));
    const { options, stream } = calls.at(-1);
    assert.equal(options.start, start);
    assert.equal(options.end, end);
    const closed = once(stream, "close");
    assert.deepEqual(Buffer.from(await result.arrayBuffer()), bytes.subarray(start, end + 1));
    await closed;
  }

  const conditional = await pdfResponse(path, "fixture.pdf", new Request("https://example.test/docs/fixture.pdf", {
    headers: { Range: "bytes=0-0", "If-Range": '"old-version"' },
  }));
  assert.equal(conditional.status, 200);
  assert.equal(conditional.headers.get("content-length"), String(bytes.length));
  assert.deepEqual(Buffer.from(await conditional.arrayBuffer()), bytes);

  const full = await request("GET");
  const { stream } = calls.at(-1);
  const closed = new Promise(resolve => stream.once("close", resolve));
  assert.equal(full.status, 200);
  await full.body.cancel();
  await closed;
  assert.ok(stream.bytesRead < bytes.length);
  const interrupted = new AbortController();
  const aborted = await request("GET", undefined, interrupted.signal);
  const abortedStream = calls.at(-1).stream;
  const abortClosed = new Promise(resolve => abortedStream.once("close", resolve));
  interrupted.abort();
  await assert.rejects(aborted.arrayBuffer());
  await abortClosed;
  assert.equal(abortedStream.closed, true);
});
