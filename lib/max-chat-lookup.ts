import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { readRecord, writeRecord } from "./admin-store";
import { captureLookupMarker, expired, locateGroup, type Challenge, type Lookup } from "./max-chat-discovery";
import { maxLookupJson } from "./integrations-max";
import { savedMaxToken } from "./integrations";

export { exactChatId, locateGroup } from "./max-chat-discovery";

const recordKey = (login: string) => "max-chat-lookup:" + login;
const tokenFingerprint = (token: string) => createHash("sha256").update(token).digest("hex");

export async function issueChatCommand(login: string): Promise<{ command: string } | { error: string }> {
  const token = await savedMaxToken();
  if (!token) return { error: "Сначала сохраните токен бота MAX." };
  const key = recordKey(login);
  const { revision } = await readRecord<Challenge | null>(key, null);
  const start = await captureLookupMarker(path => maxLookupJson(token, path));
  if ("error" in start) return start;
  const command = "/smartbus_" + randomBytes(12).toString("hex");
  await writeRecord(key, { command, issued: Date.now(), marker: start.marker, bot: tokenFingerprint(token) }, revision);
  return { command };
}

export async function checkChatCommand(login: string, command: unknown): Promise<Lookup> {
  if (typeof command !== "string" || !/^\/smartbus_[a-f0-9]{24}$/.test(command)) return { error: expired };
  const key = recordKey(login);
  const { value, revision } = await readRecord<Challenge | null>(key, null);
  if (!value || value.command !== command) return { error: expired };
  const token = await savedMaxToken();
  if (!token) return { error: "Сначала сохраните токен бота MAX." };
  // Earlier challenges and challenges for another bot do not carry a usable cursor.
  if (value.bot !== tokenFingerprint(token)) return { error: expired };
  const result = await locateGroup(value, path => maxLookupJson(token, path));
  if ("id" in result) {
    try { await writeRecord(key, null, revision); } catch { return { error: expired }; }
  }
  return result;
}
