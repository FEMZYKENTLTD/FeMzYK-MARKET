import crypto from "node:crypto";

/** Pure password utilities — no framework imports, safe to use from seeds/scripts. */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `s1:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [v, salt, hash] = stored.split(":");
    if (v !== "s1") return false;
    const test = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return crypto.timingSafeEqual(test, expected);
  } catch {
    return false;
  }
}
