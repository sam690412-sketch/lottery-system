// ============================================================
// V19.3.6 Taiwan Lottery Crawler
// Batches sync operations, handles validation & logging
// ============================================================

import { getDb } from "../queries/connection";
import { drawHistory, drawSyncLog, drawValidationLog } from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  fetchLatestDraw,
  loadSeedData,
  validateDrawRecord,
} from "./taiwanLotteryFetcher";
import type { LotteryFetchType, RawDrawData } from "./taiwanLotteryFetcher";

export interface CrawlResult {
  type: LotteryFetchType;
  added: number;
  skipped: number;
  errors: number;
  source: "official" | "seed";
  lastPeriod: number;
}

export interface SyncReport {
  timestamp: string;
  results: CrawlResult[];
  totalAdded: number;
  totalErrors: number;
  usedSeedFallback: boolean;
}

/**
 * Crawl + sync draws for a single lottery type.
 * Strategy: try official API first, fall back to seed data.
 */
export async function syncLotteryDraws(
  type: LotteryFetchType,
  opts: { forceSeed?: boolean; maxRecords?: number } = {},
): Promise<CrawlResult> {
  const db = await getDb();
  const result: CrawlResult = {
    type,
    added: 0,
    skipped: 0,
    errors: 0,
    source: "seed",
    lastPeriod: 0,
  };

  // Get last synced period from DB
  const lastDraw = await db
    .select()
    .from(drawHistory)
    .where(eq(drawHistory.lotteryType, type))
    .orderBy(desc(drawHistory.period))
    .limit(1);

  const lastPeriod = lastDraw.length > 0 ? lastDraw[0].period : 0;

  // Try official fetch first
  let draws: RawDrawData[] = [];
  if (!opts.forceSeed) {
    const latest = await fetchLatestDraw(type);
    if (latest) {
      // We got the latest draw - check if we need historical seed data too
      const errs = validateDrawRecord(type, latest);
      if (errs.length === 0) {
        draws.push(latest);
        result.source = "official";
      }
    }
  }

  // If no official data, load from seed
  if (draws.length === 0) {
    draws = await loadSeedData(type);
    result.source = "seed";
  }

  // Apply maxRecords limit
  if (opts.maxRecords && draws.length > opts.maxRecords) {
    draws = draws.slice(0, opts.maxRecords);
  }

  // Insert new records (incremental)
  for (const draw of draws) {
    if (draw.period <= lastPeriod) {
      result.skipped++;
      continue;
    }

    // Validate
    const valErrors = validateDrawRecord(type, draw);
    if (valErrors.length > 0) {
      result.errors++;
      // Log validation error
      await db.insert(drawValidationLog).values({
        lotteryType: type,
        period: draw.period,
        errorType: valErrors[0] as any,
        message: valErrors.join("; "),
      }).catch(() => {}); // ignore logging errors
      continue;
    }

    // Insert
    try {
      await db.insert(drawHistory).values({
        lotteryType: type,
        period: draw.period,
        drawDate: draw.date,
        zone1: JSON.stringify(draw.zone1),
        zone2: draw.zone2,
        source: result.source,
      });
      result.added++;
      if (draw.period > result.lastPeriod) result.lastPeriod = draw.period;
    } catch {
      result.errors++;
    }
  }

  // Log sync
  await db.insert(drawSyncLog).values({
    lotteryType: type,
    newRecords: result.added,
    status: result.errors > 0 ? (result.added > 0 ? "partial" : "failed") : "success",
    message: `added=${result.added} skipped=${result.skipped} errors=${result.errors} source=${result.source}`,
  }).catch(() => {});

  return result;
}

/**
 * Sync all 3 lottery types
 */
export async function syncAllDraws(
  opts?: { forceSeed?: boolean; maxRecords?: number },
): Promise<SyncReport> {
  const types: LotteryFetchType[] = ["power", "lotto649", "daily539"];
  const results: CrawlResult[] = [];

  for (const type of types) {
    const r = await syncLotteryDraws(type, opts);
    results.push(r);
  }

  const totalAdded = results.reduce((s, r) => s + r.added, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors, 0);

  return {
    timestamp: new Date().toISOString(),
    results,
    totalAdded,
    totalErrors,
    usedSeedFallback: results.some(r => r.source === "seed"),
  };
}

/**
 * Get latest draw from DB
 */
export async function getLatestDrawFromDB(type: LotteryFetchType) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(drawHistory)
    .where(eq(drawHistory.lotteryType, type))
    .orderBy(desc(drawHistory.period))
    .limit(1);

  if (!rows.length) return null;
  const row = rows[0];
  return {
    period: row.period,
    date: row.drawDate,
    zone1: typeof row.zone1 === "string" ? JSON.parse(row.zone1) : row.zone1,
    zone2: row.zone2,
    source: row.source,
  };
}

/**
 * Get recent draws from DB
 */
export async function getRecentDrawsFromDB(type: LotteryFetchType, count: number) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(drawHistory)
    .where(eq(drawHistory.lotteryType, type))
    .orderBy(desc(drawHistory.period))
    .limit(count);

  return rows.map((row) => ({
    period: row.period,
    date: row.drawDate,
    zone1: typeof row.zone1 === "string" ? JSON.parse(row.zone1) : row.zone1,
    zone2: row.zone2,
    source: row.source,
  }));
}

/**
 * Get sync statistics
 */
export async function getSyncStats() {
  const db = await getDb();

  // Count by type
  const typeCounts = await db
    .select({ type: drawHistory.lotteryType, count: sql<number>`count(*)` })
    .from(drawHistory)
    .groupBy(drawHistory.lotteryType);

  // Latest sync per type
  const latestSyncs = await db
    .select()
    .from(drawSyncLog)
    .orderBy(desc(drawSyncLog.syncTime))
    .limit(10);

  // Error count in last 7 days
  const errorCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(drawValidationLog)
    .where(sql`${drawValidationLog.createdAt} > DATE_SUB(NOW(), INTERVAL 7 DAY)`);

  return {
    typeCounts,
    latestSyncs,
    recentErrors: errorCount[0]?.count || 0,
  };
}

import { sql } from "drizzle-orm";
