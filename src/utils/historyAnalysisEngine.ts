// ============================================================
// V22 — Historical Analysis Engine（區間 + 模式）Part 2
// 不修改 13 層/統計演算法；只負責「選資料範圍」交給既有分析使用。
// ============================================================
import type { LotteryType } from '@/utils/lotteryConfig';
import { getRange, getHistoryByDate, getHistoryByGame } from '@/utils/historyEngine';
import type { LotteryResult } from '@/providers/historyProvider';

export type AnalysisRange = 100 | 300 | 500 | 1000 | 'all';
export type AnalysisMode = 'historical' | 'recent' | 'average';
export const RANGE_OPTIONS: AnalysisRange[] = [100, 300, 500, 1000, 'all'];

/** 依區間取資料（最近 N 期或全部）。 */
export function getByRange(game: LotteryType, range: AnalysisRange): LotteryResult[] {
  return range === 'all' ? getHistoryByGame(game) : getRange(game, range);
}
/** 自訂日期區間（例：2015~2026）。 */
export function getByCustomDate(game: LotteryType, from: string, to: string): LotteryResult[] {
  return getHistoryByDate(game, from, to);
}
/**
 * 模式權重（給既有分析做加權參考；不改統計公式本身）。
 * historical=偏重全期、recent=偏重近期、average=均等。回傳每期權重陣列（與資料同序）。
 */
export function modeWeights(results: LotteryResult[], mode: AnalysisMode): number[] {
  const n = results.length;
  if (n === 0) return [];
  if (mode === 'average') return results.map(() => 1);
  if (mode === 'recent') return results.map((_, i) => 1 + (i / Math.max(1, n - 1))); // 越近期權重越高
  return results.map((_, i) => 1 + ((n - 1 - i) / Math.max(1, n - 1)));            // historical：越早期略高
}

// ============================================================
// V22 — DataSync（Part 7）：每日同步介面（Adapter Pattern，不寫死來源）
// 目前無正式 API → 提供介面 + 預設 noop adapter；接上官方來源時實作 fetchLatest 即可。
// ============================================================
export interface SyncResult { ok: boolean; added: number; message: string; source: string }
export interface SyncAdapter {
  source: string;
  /** 取得最新一期（接官方 API/CSV 時實作；目前預設不可用）。 */
  fetchLatest(game: LotteryType): Promise<LotteryResult | null>;
}
const noopSyncAdapter: SyncAdapter = {
  source: 'none',
  async fetchLatest() { return null; }, // 尚未接正式來源
};
let activeSync: SyncAdapter = noopSyncAdapter;
export function setSyncAdapter(adapter: SyncAdapter): void { activeSync = adapter; }
/** 每日同步最新開獎（目前無正式來源 → 誠實回報尚未設定）。 */
export async function syncLatest(game: LotteryType): Promise<SyncResult> {
  try {
    const latest = await activeSync.fetchLatest(game);
    if (!latest) return { ok: false, added: 0, message: '尚未設定官方資料來源（請接入官方 API/CSV adapter）', source: activeSync.source };
    // 實際寫入由真實 adapter 的 provider 負責；此處僅回報
    return { ok: true, added: 1, message: `已同步 ${game} 第 ${latest.issue} 期`, source: activeSync.source };
  } catch (e) {
    return { ok: false, added: 0, message: '同步失敗：' + (e instanceof Error ? e.message : String(e)), source: activeSync.source };
  }
}
