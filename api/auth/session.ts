// ============================================================
// T02 Auth Foundation — Session layer (server-side)
// 提供：簽發/驗證 session token、由請求解析出可信使用者。
// 實作：HMAC-SHA256 簽章（node:crypto 內建，無外部相依）。
// 重要：不讀 localStorage；不觸及 ECPay/Webhook/付款/前端。
// 本層為「基礎設施」，T02 不套用到任何 API。
// ============================================================

import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthUser, Role, SessionClaims } from "./types";

const VALID_ROLES: ReadonlyArray<Role> = [
  "guest",
  "free",
  "vip",
  "tester",
  "admin",
];

/** 取得簽章密鑰。缺少時：production 視為設定錯誤（簽發端應 fail-fast）；驗證端則回 null（視為未登入）。 */
function getSecret(): string | null {
  return process.env.SESSION_SECRET || null;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(data: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(data).digest());
}

function isRole(x: unknown): x is Role {
  return typeof x === "string" && (VALID_ROLES as string[]).includes(x);
}

/**
 * 簽發 session token（未來由後端「登入」流程呼叫；T02 不接線到登入）。
 * @throws 若 production 缺少 SESSION_SECRET
 */
export function signSession(
  claims: Omit<SessionClaims, "iat" | "exp">,
  ttlSeconds = 60 * 60 * 24 * 7,
): string {
  const secret = getSecret();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is required to sign sessions in production");
    }
    // 非 production 提供開發用 fallback（不可用於正式）
    return signSessionWith("dev-insecure-secret", claims, ttlSeconds);
  }
  return signSessionWith(secret, claims, ttlSeconds);
}

function signSessionWith(
  secret: string,
  claims: Omit<SessionClaims, "iat" | "exp">,
  ttlSeconds: number,
): string {
  const now = Math.floor(Date.now() / 1000);
  const full: SessionClaims = { ...claims, iat: now, exp: now + ttlSeconds };
  const payload = b64url(JSON.stringify(full));
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

/** 驗證 token；無效/過期/缺密鑰時回 null。 */
export function verifySession(token: string | null | undefined): AuthUser | null {
  if (!token) return null;
  const secret = getSecret() || (process.env.NODE_ENV !== "production" ? "dev-insecure-secret" : null);
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;

  // 常數時間比對簽章
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let claims: SessionClaims;
  try {
    claims = JSON.parse(b64urlDecode(payload).toString("utf8"));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || claims.exp < now) return null;
  if (typeof claims.sub !== "string" || !claims.sub) return null;
  if (!isRole(claims.role)) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    role: claims.role,
    issuedAt: claims.iat,
    expiresAt: claims.exp,
  };
}

/** 從請求解析原始 token：優先 Authorization: Bearer，其次 cookie `session`。 */
export function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  const cookie = req.headers.get("cookie");
  if (cookie) {
    const m = cookie.match(/(?:^|;\s*)session=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

/**
 * 伺服器端取得目前使用者（PHASE C 核心）。
 * 僅依據「經簽章驗證的 token」；無 token / 無效 → null。
 * 不讀 localStorage、不做權限判定（判定交給 procedure）。
 */
export function getCurrentUser(req: Request): AuthUser | null {
  return verifySession(extractToken(req));
}
