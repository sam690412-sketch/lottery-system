// ============================================================
// V19.1 Auth Integration — auth router
// POST /api/auth/login   簽發 session token
// GET  /api/auth/me      驗證 token，回傳目前使用者
// POST /api/auth/logout  前端清 token 用（本版無 server-side blacklist）
// 不觸及 ECPay/Webhook/付款/前端 UI/VIP/Admin gating。
// ============================================================

import { Hono } from "hono";
import { performLogin } from "../auth/loginService";
import { verifyCredentials } from "../auth/credentials";
import { getCurrentUser } from "../auth/session";
import {
  migrateMemberCredential,
  MigrationError,
  type MigrationUserRepo,
} from "../auth/migrationService";
import { checkMigrationRateLimit, resolveClientIp } from "../auth/migrationRateLimit";

const authRouter = new Hono();

/** POST /api/auth/login → { token, user } | { error } */
authRouter.post("/login", async (c) => {
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  const username = String(body?.username ?? "");
  const password = String(body?.password ?? "");
  const result = await performLogin(username, password, verifyCredentials);
  return c.json(result.body, result.status as any);
});

/** GET /api/auth/me → { authenticated, user } */
authRouter.get("/me", (c) => {
  const user = getCurrentUser(c.req.raw);
  if (!user) {
    return c.json({ authenticated: false, user: null });
  }
  return c.json({
    authenticated: true,
    user: { id: user.id, username: user.email, role: user.role },
  });
});

/** POST /api/auth/logout → { success } （前端負責清除 token） */
authRouter.post("/logout", (c) => c.json({ success: true }));

/**
 * POST /api/auth/migrate — 會員憑證遷移（T04a）。
 * 收 { email, password } → 建立 free users row（scrypt）。冪等：已存在不覆蓋。
 * 拒絕任何 role/vip/admin/subscription 等欄位（見 migrationService.FORBIDDEN_FIELDS）。
 * 不回傳 token（遷移≠登入）。
 */
authRouter.post("/migrate", async (c) => {
  let body: Record<string, unknown> = {};
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  // T04a-1: abuse guard — rate limit by IP+email and IP, BEFORE entering the service.
  const ip = resolveClientIp(c.req.raw.headers);
  const emailForRl = typeof body?.email === "string" ? body.email : "";
  const rl = checkMigrationRateLimit(ip, emailForRl);
  if (!rl.allowed) {
    const retrySec = Math.max(1, Math.ceil((rl.retryAfterMs ?? 0) / 1000));
    c.header("Retry-After", String(retrySec));
    return c.json({ error: "Too many migration attempts", reason: rl.reason }, 429);
  }

  // DB-backed repo：查 email、建立 free user
  const repo: MigrationUserRepo = {
    findByEmail: async (email) => {
      const { getDb } = await import("../queries/connection");
      const { users } = await import("@db/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
      return rows[0] ? { id: rows[0].id } : null;
    },
    insertFreeUser: async (row) => {
      const { getDb } = await import("../queries/connection");
      const { users } = await import("@db/schema");
      await getDb().insert(users).values(row);
    },
  };

  try {
    const result = await migrateMemberCredential(body, repo);
    return c.json(result);
  } catch (e) {
    if (e instanceof MigrationError) {
      return c.json({ error: e.message }, e.status as any);
    }
    return c.json({ error: "internal error" }, 500);
  }
});

export default authRouter;
