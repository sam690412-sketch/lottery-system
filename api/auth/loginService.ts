// ============================================================
// V19.1 Auth Integration — login service (server-side, pure logic)
// performLogin 以依賴注入的 verifier 驗證帳密，成功後用 signSession 簽發 token。
// 將「驗證來源」與「token 簽發」解耦，使核心邏輯可離線單元測試。
// 不觸及 ECPay/Webhook/付款/前端；不回傳 localStorage role（role 來自 verifier→token）。
// ============================================================

import { signSession } from "./session";
import type { Role } from "./types";

export interface VerifiedUser {
  id: string;
  username: string;
  email: string;
  role: Role;
}

export type CredentialVerifier = (
  username: string,
  password: string,
) => Promise<VerifiedUser | null>;

export interface LoginResult {
  status: number;
  body:
    | { token: string; user: { id: string; username: string; role: Role } }
    | { error: string };
}

export async function performLogin(
  username: string,
  password: string,
  verify: CredentialVerifier,
): Promise<LoginResult> {
  if (!username || !password) {
    return { status: 400, body: { error: "username and password required" } };
  }
  const u = await verify(username, password);
  if (!u) {
    return { status: 401, body: { error: "Invalid credentials" } };
  }
  // role 來自已驗證的使用者，並寫入簽章 token（非 localStorage）
  const token = signSession({ sub: u.id, email: u.email, role: u.role });
  return {
    status: 200,
    body: { token, user: { id: u.id, username: u.username, role: u.role } },
  };
}
