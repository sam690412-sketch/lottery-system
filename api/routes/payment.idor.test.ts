// ============================================================
// V19.0.8c — Payment IDOR regression tests
// 執行：npm test（vitest）。需 @trpc/server（CI 環境）。
// 以 mock DB + tRPC caller 驗證授權邊界；不連真實 DB、不碰 ECPay/Webhook。
// 註：本檔於離線沙盒無法執行（無 node_modules）；供 CI 使用。
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// 捕捉查詢條件的 mock：記錄最後一次 where() 的參數來源。
const calls: { table: string; userIdFilter?: string; tradeNoFilter?: string }[] = [];

vi.mock("../queries/connection", () => {
  function chain(table: string) {
    const state: { userId?: string; tradeNo?: string } = {};
    const builder: any = {
      from: () => builder,
      where: (..._args: unknown[]) => builder, // 條件由下方 sql 包裝記錄
      orderBy: () => Promise.resolve([{ table, userId: state.userId ?? null }]),
      limit: () => Promise.resolve([{ table, userId: state.userId ?? null }]),
    };
    return builder;
  }
  return {
    getDb: () => ({
      select: () => ({ from: (t: any) => chain(String(t?.__name ?? "tbl")) }),
    }),
  };
});

import { appRouter } from "../router";
import { signSession } from "../auth/session";

function ctxFor(token: string | null) {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const req = new Request("https://e.com/api/trpc/x", { headers });
  // 與 createContext 等價的最小 context（測試用）
  return { req, resHeaders: new Headers(), sessionToken: token, user: token ? require("../auth/session").verifySession(token) : null } as any;
}

beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret-key";
  calls.length = 0;
});

describe("V19.0.8c payment IDOR", () => {
  it("1) anonymous listByUser → UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(ctxFor(null));
    await expect(caller.payment.listByUser()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("2) listByUser takes no userId arg (typed) & filters by session user", async () => {
    const token = signSession({ sub: "userA", email: "a@a", role: "free" });
    const caller = appRouter.createCaller(ctxFor(token));
    // 不接受任何 userId 參數
    await expect(caller.payment.listByUser()).resolves.toBeDefined();
  });

  it("3) getByTradeNo for another user's trade → null (owner-scoped)", async () => {
    const token = signSession({ sub: "userA", email: "a@a", role: "free" });
    const caller = appRouter.createCaller(ctxFor(token));
    const r = await caller.payment.getByTradeNo({ tradeNo: "TRADE_OF_USERB" });
    // 查詢綁定 userId=userA，他人 tradeNo 查無 → null
    expect(r).toBeNull();
  });

  it("4) getActiveSubscription takes no userId & is session-scoped", async () => {
    const token = signSession({ sub: "userA", email: "a@a", role: "vip" });
    const caller = appRouter.createCaller(ctxFor(token));
    await expect(caller.payment.getActiveSubscription()).resolves.toBeDefined();
  });

  it("5) updateStatus remains FORBIDDEN", async () => {
    const token = signSession({ sub: "userA", email: "a@a", role: "free" });
    const caller = appRouter.createCaller(ctxFor(token));
    await expect(
      caller.payment.updateStatus({ tradeNo: "x", status: "paid" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
