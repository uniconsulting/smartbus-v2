import { scrypt } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);

export async function passwordHash(password, salt) {
  return derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}
