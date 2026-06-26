// ============================================================
// V19.0.2 PHASE B: Real Webhook Endpoint
// POST /api/payment/ecpay/return
// ECPay ReturnURL - 公開 URL，可被 ECPay 呼叫，回傳 1|OK
// ============================================================

import { Hono } from "hono";
import { createHash } from "node:crypto";
import { getECPayConfig } from "@/payment/ecpayConfig";
import { getDb } from "../queries/connection";
import { payments, subscriptions, webhookLogs, paymentLogs } from "@db/schema";
import { eq } from "drizzle-orm";

const webhook = new Hono();

/** ECPay ReturnURL - Server-side Webhook */
webhook.post("/api/payment/ecpay/return", async (c) => {
  const body = await c.req.parseBody();
  const payload: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    payload[key] = String(value);
  }

  const tradeNo = payload.MerchantTradeNo || "";
  const ip = c.req.header("x-forwarded-for") || "unknown";

  // 1. 驗證 CheckMacValue（V19.0.5: 真正 SHA256，不跳過）
  const config = getECPayConfig();
  let cmvValid = false;
  if (payload.CheckMacValue) {
    const sortedKeys = Object.keys(payload).filter(k => k !== 'CheckMacValue').sort();
    const paramStr = sortedKeys.map(k => `${k}=${payload[k]}`).join('&');
    const raw = `HashKey=${config.hashKey}&${paramStr}&HashIV=${config.hashIV}`;
    const encoded = encodeURIComponent(raw).toLowerCase()
      .replace(/%2d/g, '-').replace(/%5f/g, '_').replace(/%2e/g, '.')
      .replace(/%21/g, '!').replace(/%2a/g, '*').replace(/%28/g, '(').replace(/%29/g, ')')
      .replace(/%20/g, '+');
    const computed = createHash('sha256').update(encoded).digest('hex').toUpperCase();
    cmvValid = payload.CheckMacValue === computed;
  }

  if (!cmvValid) {
    await logWebhook(tradeNo, payload, "invalid_signature", ip, "CheckMacValue verification failed");
    return c.text("1|OK"); // 仍回應 OK 避免 ECPay 重送，但業務邏輯已阻擋
  }

  // 2. 查詢付款記錄
  const db = getDb();
  const existing = await db.select().from(payments).where(eq(payments.tradeNo, tradeNo)).limit(1);
  const payment = existing[0];

  if (!payment) {
    await logWebhook(tradeNo, payload, "failed", ip, "Payment not found");
    return c.text("1|OK");
  }

  // 3. 金額比對
  const tradeAmt = parseInt(payload.TradeAmt || "0");
  if (tradeAmt !== payment.amount) {
    await logWebhook(tradeNo, payload, "amount_mismatch", ip, `Amount mismatch: ${tradeAmt} vs ${payment.amount}`);
    return c.text("1|OK");
  }

  // 4. RtnCode 判斷
  const rtnCode = payload.RtnCode;
  if (rtnCode !== "1" && rtnCode !== "2") {
    await db.update(payments).set({ status: "failed" }).where(eq(payments.id, payment.id));
    await logPayment(payment.paymentNo, tradeNo, payment.userId, "fail", "pending", "failed", `RtnCode: ${rtnCode}`);
    await logWebhook(tradeNo, payload, "failed", ip, `RtnCode: ${rtnCode}`);
    return c.text("1|OK");
  }

  // 5. 重複通知檢查
  if (payment.status === "paid") {
    await logWebhook(tradeNo, payload, "duplicate", ip);
    return c.text("1|OK");
  }

  // 6. 更新付款為已付款
  await db.update(payments).set({
    status: "paid",
    paidAt: new Date(),
    paymentMethod: payload.PaymentType || "Credit",
    providerRef: payload.TradeNo || tradeNo,
  }).where(eq(payments.id, payment.id));

  await logPayment(payment.paymentNo, tradeNo, payment.userId, "pay", "pending", "paid");

  // 7. 建立訂閱
  const plan = payment.plan;
  const periodDays = plan === "monthly" ? 30 : plan === "quarterly" ? 90 : 365;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

  await db.insert(subscriptions).values({
    userId: payment.userId,
    paymentId: payment.paymentNo,
    plan,
    status: "active",
    startedAt: now,
    expiresAt,
    autoRenew: "true",
    nextBillingAt: expiresAt,
  });

  await logPayment(payment.paymentNo, tradeNo, payment.userId, "activate", "pending", "active", `Plan: ${plan}`);

  // 8. 記錄 webhook
  await logWebhook(tradeNo, payload, "processed", ip);

  return c.text("1|OK");
});

/** 輔助：記錄 webhook log */
async function logWebhook(
  tradeNo: string,
  payload: Record<string, string>,
  status: "verified" | "invalid_signature" | "amount_mismatch" | "duplicate" | "failed" | "processed",
  ip: string,
  error?: string
) {
  try {
    const db = getDb();
    await db.insert(webhookLogs).values({
      type: "ecpay_return",
      tradeNo,
      status,
      payload: payload as unknown as Record<string, string>,
      ip,
      error: error || null,
    });
  } catch {
    // ignore logging errors
  }
}

/** 輔助：記錄 payment log */
async function logPayment(
  paymentId: string,
  tradeNo: string,
  userId: string,
  action: "create" | "pay" | "fail" | "cancel" | "refund" | "expire" | "activate" | "downgrade",
  fromStatus?: string,
  toStatus?: string,
  detail?: string
) {
  try {
    const db = getDb();
    await db.insert(paymentLogs).values({
      paymentId,
      tradeNo,
      userId,
      action,
      fromStatus: fromStatus || null,
      toStatus: toStatus || null,
      detail: detail || null,
    });
  } catch {
    // ignore logging errors
  }
}

export default webhook;
