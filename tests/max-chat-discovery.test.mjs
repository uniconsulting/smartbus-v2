import assert from "node:assert/strict";
import test from "node:test";
import { captureLookupMarker, exactChatId, locateGroup } from "../lib/max-chat-discovery.ts";

const initialPath = "/updates?timeout=0&limit=1&types=message_created";
const from = marker => "/updates?timeout=0&limit=100&types=message_created&marker=" + marker;
const challenge = () => ({ issued: Date.now(), command: "/smartbus_test", marker: "0", bot: "fixture" });
const message = (c, id, text = c.command, chatType = "chat", timestamp = c.issued) => ({
  timestamp, update_type: "message_created",
  message: { recipient: { chat_type: chatType, chat_id: id }, body: { text } },
});

function requests(sequence) {
  const remaining = [...sequence];
  return {
    fetch: async path => {
      const step = remaining.shift();
      assert.ok(step, "Unexpected request " + path);
      assert.equal(path, step[0]);
      return step[1];
    },
    done: () => assert.equal(remaining.length, 0),
  };
}
const noWebhook = ["/subscriptions", { subscriptions: [] }];

test("capture the exact next marker before a command, including when MAX returns no prior updates", async () => {
  for (const marker of [0, "9223372036854775807", "-9223372036854775808"]) {
    const api = requests([noWebhook, [initialPath, { updates: [], marker }]]);
    assert.deepEqual(await captureLookupMarker(api.fetch), { marker: String(marker) });
    api.done();
  }
  for (const marker of [null, undefined, Number.MAX_SAFE_INTEGER + 1, "9223372036854775808", "9&marker=3"]) {
    const api = requests([noWebhook, [initialPath, { updates: [], marker }]]);
    assert.match((await captureLookupMarker(api.fetch)).error, /позицию/);
  }
  assert.equal(exactChatId(0), null);
});

test("an active webhook prevents polling both when issuing and when checking a command", async () => {
  for (const step of [captureLookupMarker, fetch => locateGroup(challenge(), fetch)]) {
    const api = requests([["/subscriptions", { subscriptions: [{}] }]]);
    assert.match((await step(api.fetch)).error, /webhook/);
    api.done();
  }
});

test("fresh, exact group messages are found after unrelated events and keep full chat ID precision", async () => {
  const c = challenge();
  const other = [
    message(c, 1, c.command, "dialog"), message(c, 2, c.command, "channel"),
    message(c, 3, c.command + " "), message(c, 4, c.command, "chat", c.issued - 1),
    message(c, 5, c.command, "chat", c.issued + 60_000),
    { ...message(c, 6), update_type: "message_edited" },
  ];
  const id = "-9223372036854775808";
  const api = requests([noWebhook, [from(c.marker), { updates: [...other, message(c, id), message(c, id)], marker: "15" }]]);
  assert.deepEqual(await locateGroup(c, api.fetch), { id });
  api.done();
  const ambiguous = requests([noWebhook, [from(c.marker), { updates: [message(c, 1), message(c, 2)] }]]);
  assert.match((await locateGroup(c, ambiguous.fetch)).error, /нескольких группах/);
  const invalid = requests([noWebhook, [from(c.marker), { updates: [message(c, "9223372036854775808")] }]]);
  assert.match((await locateGroup(c, invalid.fetch)).error, /точный/);
});

test("reuse initial position on a retry and follow only server-issued cursors on full pages", async () => {
  const c = challenge();
  const unrelated = message(c, 9, "unrelated");
  const api = requests([
    noWebhook, [from("0"), { updates: [unrelated], marker: 1 }],
    noWebhook, [from("0"), { updates: Array(100).fill(unrelated), marker: "9223372036854775807" }],
    [from("9223372036854775807"), { updates: [message(c, -123)], marker: 200 }],
  ]);
  assert.match((await locateGroup(c, api.fetch)).error, /права администратора/);
  assert.deepEqual(await locateGroup(c, api.fetch), { id: "-123" });
  api.done();
});

test("expired or legacy commands, conflicting pages, repeated cursors and a busy queue cannot bind a group", async () => {
  const c = challenge();
  for (const change of [{ marker: undefined }, { issued: c.issued - 301000 }]) {
    assert.match((await locateGroup({ ...c, ...change }, requests([]).fetch)).error, /устарела/);
  }
  const full = Array(100).fill(message(c, -1));
  const conflicts = requests([noWebhook, [from("0"), { updates: full, marker: 1 }], [from("1"), { updates: [message(c, -2)] }]]);
  assert.match((await locateGroup(c, conflicts.fetch)).error, /нескольких группах/);
  const stalled = requests([noWebhook, [from("0"), { updates: full, marker: 0 }]]);
  await assert.rejects(locateGroup(c, stalled.fetch), /MAX_INVALID_RESPONSE/);
  const busy = requests([noWebhook, ...[0, 1, 2].map(i => [from(i), { updates: full, marker: i + 1 }])]);
  assert.match((await locateGroup(c, busy.fetch)).error, /слишком много/);
  busy.done();
});
