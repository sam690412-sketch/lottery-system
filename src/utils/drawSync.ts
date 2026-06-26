// ============================================================
// V19.3 Draw Sync Service - Historical Data Import & Management
// ============================================================

import type { DrawRecord } from '@/types';
import { loadDrawHistory, saveDrawHistory } from './drawHistoryRepository';
import type { LotteryType } from './lotteryAnalytics';

/** 資料品質資訊 */
export interface DataQualityInfo {
  lotteryType: LotteryType;
  totalRecords: number;
  firstPeriod: number;
  lastPeriod: number;
  firstDate: string;
  lastDate: string;
  lastSyncAt: string;
  syncStatus: 'synced' | 'pending' | 'empty';
  coverage: string; // e.g. "2020-01-01 ~ 2025-12-31"
}

const SYNC_META_KEY = 'v193-sync-meta';

interface SyncMeta { lastSync: string; version: string; sources: Record<string, { imported: number; lastPeriod: number }>; }

/** 載入同步元資料 */
function loadSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { lastSync: '', version: '19.3', sources: {} };
}

/** 保存同步元資料 */
function saveSyncMeta(meta: SyncMeta) {
  try { localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

/** 檢查是否需要首次匯入 */
export function needsHistoricalImport(): boolean {
  const meta = loadSyncMeta();
  // 從未同步過，或版本太舊
  if (!meta.lastSync) return true;
  // 檢查現有資料量
  const power = loadDrawHistory('power');
  const lotto = loadDrawHistory('lotto649');
  const daily = loadDrawHistory('daily539');
  return power.length < 10 && lotto.length < 10 && daily.length < 10;
}

/** 匯入歷史資料（從靜態 JSON） */
export async function importHistoricalData(onProgress?: (pct: number, msg: string) => void): Promise<{ total: number; imported: number; errors: number }> {
  const result = { total: 0, imported: 0, errors: 0 };

  try {
    onProgress?.(5, '載入歷史資料檔...');
    // Dynamic import of JSON
    const rawModule = await import('@/data/historicalDraws.json');
    const raw = rawModule.default || rawModule;

    const sources: { key: LotteryType; data: Array<{ period: number; date: string; zone1: number[]; zone2: number }> }[] = [
      { key: 'power',    data: raw.power || [] },
      { key: 'lotto649', data: raw.lotto649 || [] },
      { key: 'daily539', data: raw.daily539 || [] },
    ];

    for (const src of sources) {
      result.total += src.data.length;
      onProgress?.(10 + Math.floor((result.imported / result.total) * 80), `匯入 ${src.key}: ${src.data.length} 筆...`);

      // Merge with existing data (deduplicate by period)
      const existing = loadDrawHistory(src.key);
      const existingPeriods = new Set(existing.map(r => r.period));

      const newRecords: DrawRecord[] = [...existing];
      for (const d of src.data) {
        if (!existingPeriods.has(d.period)) {
          newRecords.push({
            period: d.period,
            date: d.date,
            zone1: d.zone1,
            zone2: d.zone2,
            zone3: [],
            zone4: [],
          });
        }
      }

      // Sort by period
      newRecords.sort((a, b) => a.period - b.period);
      saveDrawHistory(src.key, newRecords);
      result.imported += src.data.length;

      // Update meta
      const meta = loadSyncMeta();
      meta.sources[src.key] = {
        imported: newRecords.length,
        lastPeriod: newRecords.length > 0 ? newRecords[newRecords.length - 1].period : 0,
      };
      saveSyncMeta(meta);
    }

    // Finalize
    const meta = loadSyncMeta();
    meta.lastSync = new Date().toISOString();
    saveSyncMeta(meta);
    onProgress?.(100, '匯入完成');

  } catch (err) {
    result.errors++;
    console.error('[DrawSync] Import error:', err);
  }

  return result;
}

/** 獲取資料品質資訊 */
export function getDataQuality(lotteryType: LotteryType): DataQualityInfo {
  const records = loadDrawHistory(lotteryType);
  const meta = loadSyncMeta();

  if (records.length === 0) {
    return {
      lotteryType, totalRecords: 0, firstPeriod: 0, lastPeriod: 0,
      firstDate: '', lastDate: '', lastSyncAt: meta.lastSync || '',
      syncStatus: 'empty', coverage: '',
    };
  }

  const first = records[0];
  const last = records[records.length - 1];
  return {
    lotteryType,
    totalRecords: records.length,
    firstPeriod: first.period,
    lastPeriod: last.period,
    firstDate: first.date,
    lastDate: last.date,
    lastSyncAt: meta.lastSync || '',
    syncStatus: meta.lastSync ? 'synced' : 'pending',
    coverage: `${first.date} ~ ${last.date}`,
  };
}

/** 獲取所有彩種的資料品質 */
export function getAllDataQuality(): DataQualityInfo[] {
  return (['power', 'lotto649', 'daily539'] as LotteryType[]).map(getDataQuality);
}

/** 取得最近 N 期的真實資料 */
export function getRecentDraws(lotteryType: LotteryType, count: number): DrawRecord[] {
  const all = loadDrawHistory(lotteryType);
  return all.slice(-count);
}

/** 取得所有資料（用於分析引擎） */
export function getAllDraws(lotteryType: LotteryType): DrawRecord[] {
  return loadDrawHistory(lotteryType);
}

/** 初始化（在 App 啟動時呼叫） */
export async function initializeDrawData(): Promise<boolean> {
  if (needsHistoricalImport()) {
    console.log('[DrawSync] First run - importing historical data...');
    const result = await importHistoricalData();
    console.log(`[DrawSync] Imported ${result.imported}/${result.total} records`);
    return result.imported > 0;
  }
  console.log('[DrawSync] Data already present, skipping import');
  return true;
}
