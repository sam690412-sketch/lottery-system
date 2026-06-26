// ============================================================
// V19.0.3: Internal Test Router
// 僅測試用，生產環境應移除
// ============================================================

import { Hono } from "hono";
import { getDb } from "../queries/connection";
import { payments, subscriptions, paymentLogs, webhookLogs, auditLogs } from "@db/schema";
import { count, eq } from "drizzle-orm";

const test = new Hono();

/** 取得所有表格統計 */
test.get("/api/test/db-status", async (c) => {
  const db = getDb();
  const [
    paymentsCount,
    subscriptionsCount,
    paymentLogsCount,
    webhookLogsCount,
    auditLogsCount,
  ] = await Promise.all([
    db.select({ count: count() }).from(payments),
    db.select({ count: count() }).from(subscriptions),
    db.select({ count: count() }).from(paymentLogs),
    db.select({ count: count() }).from(webhookLogs),
    db.select({ count: count() }).from(auditLogs),
  ]);

  return c.json({
    tables: {
      payments: paymentsCount[0]?.count ?? 0,
      subscriptions: subscriptionsCount[0]?.count ?? 0,
      payment_logs: paymentLogsCount[0]?.count ?? 0,
      webhook_logs: webhookLogsCount[0]?.count ?? 0,
      audit_logs: auditLogsCount[0]?.count ?? 0,
    },
    status: "connected",
    timestamp: new Date().toISOString(),
  });
});

/** 建立測試付款記錄 */
test.post("/api/test/create-payment", async (c) => {
  const body = await c.req.json();
  const db = getDb();
  const tradeNo = body.tradeNo || `TEST${Date.now()}`;

  await db.insert(payments).values({
    paymentNo: `PAY-${tradeNo}`,
    tradeNo,
    userId: body.userId || "test-user-001",
    plan: body.plan || "monthly",
    amount: body.amount || 299,
    status: "pending",
  });

  return c.json({ success: true, tradeNo });
});

/** 查詢付款狀態 */
test.get("/api/test/payment/:tradeNo", async (c) => {
  const db = getDb();
  const tradeNo = c.req.param("tradeNo");
  const result = await db.select().from(payments).where(eq(payments.tradeNo, tradeNo)).limit(1);

  if (!result[0]) return c.json({ error: "Not found" }, 404);

  // Also get subscription
  const subs = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, result[0].userId)).limit(1);

  // Get logs
  const logs = await db.select().from(paymentLogs)
    .where(eq(paymentLogs.tradeNo, tradeNo)).limit(10);

  const webhookEntries = await db.select().from(webhookLogs)
    .where(eq(webhookLogs.tradeNo, tradeNo)).limit(10);

  return c.json({
    payment: result[0],
    subscription: subs[0] || null,
    payment_logs: logs,
    webhook_logs: webhookEntries,
  });
});

/** 清理測試資料 */
test.post("/api/test/cleanup", async (c) => {
  const db = getDb();
  // Delete test records
  const testPrefix = "TEST";

  const allPayments = await db.select().from(payments);
  const testPayments = allPayments.filter(p => p.tradeNo.startsWith(testPrefix));
  for (const p of testPayments) {
    await db.delete(payments).where(eq(payments.id, p.id));
    await db.delete(subscriptions).where(eq(subscriptions.userId, p.userId));
    await db.delete(paymentLogs).where(eq(paymentLogs.tradeNo, p.tradeNo));
    await db.delete(webhookLogs).where(eq(webhookLogs.tradeNo, p.tradeNo));
  }

  return c.json({ cleaned: testPayments.length });
});

export default test;
