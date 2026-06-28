// ============================================================
// V22 Data Platform — History Engine（查詢 API）
// 不修改任何既有分析程式；只提供統一查詢。資料來自 historyProvider。
// ============================================================
import type { LotteryType } from '@/utils/lotteryConfig';
import { loadResults, getDataSourceKind, type LotteryResult } from '@/providers/historyProvider';

const ALL_GAMES: LotteryType[] = ['power', 'lotto649', 'daily539'];

/** 全部歷史（所有支援彩種）。 */
export function getAllHistory(): Record<string, LotteryResult[]> {
  const out: Record<string, LotteryResult[]> = {};
  for (const g of ALL_GAMES) out[g] = loadResults(g);
  return out;
}
/** 指定彩種全部歷史（依期數升冪）。 */
export function getHistoryByGame(game: LotteryType): LotteryResult[] {
  return [...loadResults(game)].sort((a, b) => a.issue - b.issue);
}
/** 依日期區間（含端點，YYYY-MM-DD）。 */
export function getHistoryByDate(game: LotteryType, from: string, to: string): LotteryResult[] {
  return getHistoryByGame(game).filter((r) => r.date >= from && r.date <= to);
}
/** 依期數查單期。 */
export function getHistoryByIssue(game: LotteryType, issue: number): LotteryResult | null {
  return getHistoryByGame(game).find((r) => r.issue === issue) || null;
}
/** 最新一期。 */
export function getLatestResult(game: LotteryType): LotteryResult | null {
  const all = getHistoryByGame(game);
  return all.length ? all[all.length - 1] : null;
}
/** 取最近 N 期（count<=0 表示全部）。 */
export function getRange(game: LotteryType, count: number): LotteryResult[] {
  const all = getHistoryByGame(game);
  if (count <= 0 || count >= all.length) return all;
  return all.slice(all.length - count);
}
/** 資料概況（給首頁顯示「已分析 N 期 / 更新時間 / 來源」）。 */
export function getDataSummary(game: LotteryType): { count: number; latestDate: string | null; updatedAt: string | null; source: string } {
  const all = getHistoryByGame(game);
  const latest = all.length ? all[all.length - 1] : null;
  return { count: all.length, latestDate: latest?.date || null, updatedAt: latest?.updatedAt || null, source: getDataSourceKind() };
}
