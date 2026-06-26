// ============================================================
// V19.1 Auth Integration — credential verifier
// 權威來源：users 表（T01 建立；T03 帳號遷移後才有資料）。
// 過渡用：可選 env bootstrap admin（BOOTSTRAP_ADMIN_USER/PASSWORD），
//   讓首位 admin 在 T03 之前可登入，且「不硬編碼 admin123」。
// 不改 Admin gating（授權檢查）；只提供「登入驗證」來源。
// ============================================================

import { timingSafeEqual } from "node:crypto";
import { getDb } from "../queries/connection";
import { users } from "@db/schema";
import { eq, or } from "drizzle-orm";
import { verifyPassword } from "./password";
import type { VerifiedUser } from "./loginService";
import type { Role } from "./types";

function constEq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** 可選過渡：env 設定的 bootstrap admin（兩個變數都設定才啟用）。 */
export function bootstrapVerify(username: string, password: string): VerifiedUser | null {
  const bu = process.env.BOOTSTRAP_ADMIN_USER;
  const bp = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!bu || !bp) return null;
  if (constEq(username, bu) && constEq(password, bp)) {
    return { id: "admin-bootstrap", username: bu, email: bu, role: "admin" };
  }
  return null;
}

/** 權威：查 users 表（email 或 id），比對 scrypt 密碼雜湊。 */
export async function dbVerifyCredentials(
  username: string,
  password: string,
): Promise<VerifiedUser | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(or(eq(users.email, username), eq(users.id, username)))
    .limit(1);
  const u = rows[0];
  if (!u || u.isActive === false) return null;
  if (!verifyPassword(password, u.passwordHash)) return null;
  return { id: u.id, username: u.email, email: u.email, role: u.role as Role };
}

/** 對外：先 bootstrap（若設定），否則查 DB。 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<VerifiedUser | null> {
  const boot = bootstrapVerify(username, password);
  if (boot) return boot;
  return dbVerifyCredentials(username, password);
}
