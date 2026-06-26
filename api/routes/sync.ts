// ============================================================
// V19.3.6 Sync API Routes
// POST /api/sync/draws - Sync all lottery draws
// GET /api/sync/status - Get sync status
// GET /api/sync/stats - Get sync statistics
// ============================================================

import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import { syncAllDraws, getSyncStats } from "../lib/taiwanLotteryCrawler";
import type { LotteryFetchType } from "../lib/taiwanLotteryFetcher";

const syncRouter = new Hono();

// ============================================================
// V19.0.8a: Service-token guard for ALL /api/sync/* routes.
// 來源環境變數 SYNC_SERVICE_TOKEN。
//   - 伺服器未設定 token → 503（設定錯誤，fail-closed）
//   - 請求缺 X-Service-Token → 401
//   - 請求 token 錯誤 → 403
// 此 guard 同時保護 forceSeed（TASK C）：匿名/錯 token 無法觸發任何同步。
// 不影響 webhook / ECPay / 前端 / 付款流程。
// ============================================================
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

syncRouter.use("*", async (c, next) => {
  const serverToken = process.env.SYNC_SERVICE_TOKEN;
  if (!serverToken) {
    return c.json({ success: false, error: "Sync service token not configured" }, 503);
  }
  const provided = c.req.header("X-Service-Token");
  if (!provided) {
    return c.json({ success: false, error: "Missing X-Service-Token" }, 401);
  }
  if (!safeEqual(provided, serverToken)) {
    return c.json({ success: false, error: "Invalid X-Service-Token" }, 403);
  }
  await next();
});

/**
 * POST /api/sync/draws
 * Trigger full sync of all lottery draws.
 * Query params:
 *   ?forceSeed=true  - Force use seed data (skip official fetch)
 *   ?maxRecords=100  - Limit records per type
 */
syncRouter.post("/draws", async (c) => {
  try {
    const url = new URL(c.req.url);
    const forceSeed = url.searchParams.get("forceSeed") === "true";
    const maxRecords = parseInt(url.searchParams.get("maxRecords") || "0", 10) || undefined;

    const report = await syncAllDraws({ forceSeed, maxRecords });

    return c.json({
      success: true,
      timestamp: report.timestamp,
      totalAdded: report.totalAdded,
      totalErrors: report.totalErrors,
      usedSeedFallback: report.usedSeedFallback,
      details: report.results.map((r) => ({
        type: r.type,
        added: r.added,
        skipped: r.skipped,
        errors: r.errors,
        source: r.source,
        lastPeriod: r.lastPeriod,
      })),
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Sync failed" },
      500,
    );
  }
});

/**
 * POST /api/sync/draws/:type
 * Sync a single lottery type
 */
syncRouter.post("/draws/:type", async (c) => {
  try {
    const { syncLotteryDraws } = await import("../lib/taiwanLotteryCrawler");
    const type = c.req.param("type") as LotteryFetchType;

    if (!["power", "lotto649", "daily539"].includes(type)) {
      return c.json({ success: false, error: "Invalid lottery type" }, 400);
    }

    const result = await syncLotteryDraws(type);
    return c.json({ success: true, result });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Sync failed" }, 500);
  }
});

/**
 * GET /api/sync/status
 * Get current sync status for all types
 */
syncRouter.get("/status", async (c) => {
  try {
    const stats = await getSyncStats();
    return c.json({
      success: true,
      ...stats,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to get status" },
      500,
    );
  }
});

/**
 * GET /api/sync/stats
 * Get detailed sync statistics
 */
syncRouter.get("/stats", async (c) => {
  try {
    const { getDb } = await import("../queries/connection");
    const { drawHistory, drawSyncLog, drawValidationLog } = await import("../../db/schema");
    const { sql } = await import("drizzle-orm");
    const db = await getDb();

    // Total records
    const [totalRecord] = await db
      .select({ count: sql<number>`count(*)` })
      .from(drawHistory);

    // Records by type
    const byType = await db
      .select({
        type: drawHistory.lotteryType,
        count: sql<number>`count(*)`,
        latest: sql<number>`max(${drawHistory.period})`,
        earliest: sql<number>`min(${drawHistory.period})`,
      })
      .from(drawHistory)
      .groupBy(drawHistory.lotteryType);

    // Sync log summary
    const [syncSummary] = await db
      .select({
        totalSyncs: sql<number>`count(*)`,
        successSyncs: sql<number>`sum(case when ${drawSyncLog.status} = 'success' then 1 else 0 end)`,
        failedSyncs: sql<number>`sum(case when ${drawSyncLog.status} = 'failed' then 1 else 0 end)`,
      })
      .from(drawSyncLog);

    // Recent validation errors
    const recentErrors = await db
      .select()
      .from(drawValidationLog)
      .orderBy(sql`${drawValidationLog.createdAt} desc`)
      .limit(10);

    return c.json({
      success: true,
      totalRecords: totalRecord?.count || 0,
      byType,
      syncSummary,
      recentErrors,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to get stats" },
      500,
    );
  }
});

export default syncRouter;
