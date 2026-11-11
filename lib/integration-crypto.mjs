import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { link, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dataDirectory } from "./admin-db.mjs";

async function cipherKey(create) {
  const configured = process.env.SMARTBUS_INTEGRATION_KEY;
  if (configured) {
    const bytes = Buffer.from(configured, "base64");
    if (bytes.length !== 32) throw new Error("SMARTBUS_INTEGRATION_KEY должен содержать 32 байта в base64.");
    return bytes;
  }
  const dir = dataDirectory();
  const target = join(dir, ".integration-key");
  try {
    return await readFile(target);
  } catch (error) {
    if (!create || error.code !== "ENOENT") throw error;
  }
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const temp = join(dir, ".key-" + randomUUID());
  try {
    await writeFile(temp, randomBytes(32), { mode: 0o600, flag: "wx" });
    try {
      await link(temp, target);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    return await readFile(target);
  } finally {
    await rm(temp, { force: true });
  }
}
export async function sealSecret(token, provider) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", await cipherKey(true), iv);
  cipher.setAAD(Buffer.from(provider));
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(value => value.toString("base64")).join(".");
}
export async function openSecret(value, provider) {
  const [iv, tag, ciphertext] = value.split(".").map(s => Buffer.from(s, "base64"));
  const cipher = createDecipheriv("aes-256-gcm", await cipherKey(false), iv);
  cipher.setAAD(Buffer.from(provider));
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(ciphertext), cipher.final()]).toString("utf8");
}
