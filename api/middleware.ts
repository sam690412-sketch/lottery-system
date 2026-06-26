import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;

// 既有 public procedure（不變）——維持向後相容，現有 API 不受影響。
export const publicQuery = t.procedure;

// ============================================================
// T02 Auth Foundation — procedures（已建立，但本版「不套用」到任何 API）
// 透過 middleware 強制身份/角色；context.user 來自簽章驗證的 session。
// ============================================================

/** 需登入：無有效使用者 → UNAUTHORIZED */
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  // 將 user 收窄為非 null 傳遞給後續
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** 需 admin：非 admin → FORBIDDEN */
export const adminProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin role required" });
  }
  return next({ ctx });
});

/** 需 tester（或 admin）：否則 FORBIDDEN */
export const testerProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "tester" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Tester role required" });
  }
  return next({ ctx });
});
