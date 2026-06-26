// ============================================================
// V19.1 Auth Integration — password hashing (server-side, pure)
// scrypt via node:crypto（內建，無外部相依）。
// 格式：scrypt$<saltHex>$<hashHex>
// 註：T09 將評估升級至 argon2/bcrypt；T03 帳號遷移時據此 rehash。
// 不觸及 ECPay/Webhook/付款/前端。
// ============================================================

import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  let salt: Buffer, expected: Buffer;
  try {
    salt = Buffer.from(parts[1], "hex");
    expected = Buffer.from(parts[2], "hex");
  } catch {
    return false;
  }
  if (expected.length === 0) return false;
  const actual = scryptSync(plain, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
