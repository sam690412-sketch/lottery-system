// ============================================================
// T02 Auth Foundation — Identity model & layered contexts
// 後端身份模型與分層 context 型別定義。
// 注意：純型別/介面，無執行邏輯、無外部相依、不觸及 ECPay/Webhook/付款/前端。
// ============================================================

/** 權威角色（與 db/schema.ts users.role 對齊） */
export type Role = "guest" | "free" | "vip" | "tester" | "admin";

/**
 * 後端可信的使用者身份。
 * 來源：經簽章驗證的 session token 之 claims（未來由後端登入依 users 表簽發）。
 * 絕不來自 localStorage。
 */
export interface AuthUser {
  /** users.id */
  id: string;
  email: string;
  role: Role;
  /** 簽發/到期（epoch 秒） */
  issuedAt: number;
  expiresAt: number;
}

/** Session token 的負載（claims） */
export interface SessionClaims {
  sub: string; // user id
  email: string;
  role: Role;
  iat: number; // issued at (sec)
  exp: number; // expires at (sec)
}

// ---- 分層 Context（PHASE E）----

/** 最底層：每個請求都有 */
export interface RequestContext {
  req: Request;
  resHeaders: Headers;
}

/** Session 層：附加已解析（未必有效）的 token 字串 */
export interface SessionContext extends RequestContext {
  /** 原始 token（Authorization: Bearer / cookie），可能為 null */
  sessionToken: string | null;
}

/** Auth 層：附加已驗證的使用者（無效/未登入時為 null） */
export interface AuthContext extends SessionContext {
  /** 已驗證使用者；未登入或 token 無效時為 null */
  user: AuthUser | null;
}

/** 身份來源說明（供文件/除錯，非權限判定用） */
export const IDENTITY_SOURCES = {
  user: "users table (role: free/vip) via signed session token",
  tester: "users table (role: tester) via signed session token",
  admin: "users table (role: admin) via signed session token",
} as const;
