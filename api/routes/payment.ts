// ============================================================
// V19.0.2: Payment tRPC Router
// V19.0.5: 添加 createPayment mutation (寫入 MySQL)
// ============================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedProcedure, adminProcedure } from "../middleware";
import { getDb } from "../queries/connection";
import { payments, subscriptions, paymentLogs } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
// P0-PAY-01: 後端權威價格表（金額唯一真相，忽略前端金額）
import { getPlanPrice } from "../lib/pricing";

// ============================================================
// T04b: VIP 權威判定（後端、純函式）
// 來源：DB subscriptions（active 且未過期）為主；payments(paid) 為輔助佐證。
// 絕不使用 localStorage role / 前端傳入 role。
// ============================================================
export interface VipSubRow { status: string; expiresAt: string | Date; plan: string }
export interface VipAuthority {
  isVip: boolean;
  source: "subscription" | "payment" | "payment_pending" | "none";
  plan?: string;
  expiresAt?: string;
  checkedAt: string;
}

/** 由 DB 查詢結果（已綁定本人）推導 VIP 權威。now 預設現在。 */
export function getVipAuthority(
  data: { subs: VipSubRow[]; hasPaidPayment: boolean },
  now: number = Date.now(),
): VipAuthority {
  const checkedAt = new Date(now).toISOString();
  const activeSub = (data.subs || []).find(
    (s) => s.status === "active" && new Date(s.expiresAt).getTime() > now,
  );
  if (activeSub) {
    return {
      isVip: true,
      source: "subscription",
      plan: activeSub.plan,
      expiresAt: new Date(activeSub.expiresAt).toISOString(),
      checkedAt,
    };
  }
  // 有付款紀錄但無 active 訂閱：尚未開通（不給 VIP）
  if (data.hasPaidPayment) {
    return { isVip: false, source: "payment_pending", checkedAt };
  }
  return { isVip: false, source: "none", checkedAt };
}

export const paymentRouter = createRouter({
  /** 查詢「自己」的所有付款（V19.0.8c: authed，userId 來自 session） */
  listByUser: authedProcedure
    .query(async ({ ctx }) => {
      const db = getDb();
      return db
        .select()
        .from(payments)
        .where(eq(payments.userId, ctx.user.id))
        .orderBy(desc(payments.createdAt));
    }),

  /** 查詢「自己」的單筆付款（V19.0.8c: authed，tradeNo + userId 雙條件） */
  getByTradeNo: authedProcedure
    .input(z.object({ tradeNo: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.tradeNo, input.tradeNo),
            eq(payments.userId, ctx.user.id)
          )
        )
        .limit(1);
      return result[0] || null;
    }),

  /** 查詢「自己」的活躍訂閱（V19.0.8c: authed，userId 來自 session） */
  getActiveSubscription: authedProcedure
    .query(async ({ ctx }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, ctx.user.id),
            eq(subscriptions.status, "active")
          )
        )
        .limit(1);
      return result[0] || null;
    }),

  /** 建立付款記錄（P0-PAY-01: 金額由後端權威價格表推導，忽略前端 amount） */
  create: publicQuery
    .input(
      z.object({
        // 識別碼：須與前端送往 ECPay 的 tradeNo 一致（用於 webhook 對帳，故保留）
        paymentNo: z.string(),
        tradeNo: z.string(),
        userId: z.string(),
        // 僅信任 plan；amount/price/totalAmount/durationDays 一律不接受
        plan: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // 後端權威價格：plan 不存在 → BAD_REQUEST
      const price = getPlanPrice(input.plan);
      if (!price) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid plan: ${input.plan}`,
        });
      }
      const plan = input.plan as "monthly" | "quarterly" | "yearly";
      const amount = price.amount; // ← 唯一金額來源（前端傳入值一律忽略）

      const db = getDb();

      // 檢查是否已存在
      const existing = await db
        .select()
        .from(payments)
        .where(eq(payments.tradeNo, input.tradeNo))
        .limit(1);

      if (existing[0]) {
        return { success: false, error: "TradeNo already exists" };
      }

      // 寫入 payments（amount 來自後端價格表）
      await db.insert(payments).values({
        paymentNo: input.paymentNo,
        tradeNo: input.tradeNo,
        userId: input.userId,
        plan: plan,
        amount: amount,
        status: "pending",
      });

      // 記錄 log
      await db.insert(paymentLogs).values({
        paymentId: input.paymentNo,
        tradeNo: input.tradeNo,
        userId: input.userId,
        action: "create",
        detail: `Plan: ${plan}, Amount: ${amount}`,
      });

      return { success: true, amount };
    }),

  /**
   * P0-PAY-01 / TASK C: 停用公開的付款狀態更新。
   * webhook.ts 不呼叫此 procedure（其直接 db.update(payments)），
   * 因此最安全的修法是直接拒絕，避免外部偽造付款狀態。
   * 在後端 auth（authedProcedure）就緒前，一律 FORBIDDEN。
   */
  updateStatus: publicQuery
    .input(
      z.object({
        tradeNo: z.string(),
        status: z.enum(["pending", "paid", "failed", "cancelled", "refunded"]),
        paymentMethod: z.string().optional(),
        providerRef: z.string().optional(),
      })
    )
    .mutation(async () => {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "payment.updateStatus is disabled. Payment status is updated only by the ECPay webhook handler.",
      });
    }),

  /** 查詢付款統計（V19.0.8a: 僅 admin；非 admin → FORBIDDEN，未登入 → UNAUTHORIZED） */
  stats: adminProcedure.query(async () => {
    const db = getDb();
    const allPayments = await db.select().from(payments);
    const allSubs = await db.select().from(subscriptions);

    const completed = allPayments.filter(p => p.status === "paid");
    const revenue = completed.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalRevenue: revenue,
      totalPayments: allPayments.length,
      completedPayments: completed.length,
      activeSubscriptions: allSubs.filter(s => s.status === "active").length,
      refundedPayments: allPayments.filter(p => p.status === "refunded").length,
    };
  }),

  /**
   * T04b: 查詢「自己」的 VIP 權威狀態（authed；無 userId input，只用 ctx.user.id）。
   * 來源 = DB subscriptions(active 未過期) / payments(paid)。不使用 localStorage。
   */
  getMyVipAuthority: authedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const subs = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, ctx.user.id), eq(subscriptions.status, "active")));
    const paid = await db
      .select()
      .from(payments)
      .where(and(eq(payments.userId, ctx.user.id), eq(payments.status, "paid")))
      .limit(1);
    return getVipAuthority(
      {
        subs: subs.map((s) => ({ status: s.status, expiresAt: s.expiresAt, plan: s.plan })),
        hasPaidPayment: paid.length > 0,
      },
    );
  }),
});
