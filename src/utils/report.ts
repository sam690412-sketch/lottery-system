// ============================================================
// V11 實測報告工具
// ============================================================

import type { LotteryType } from './lotteryConfig';
import { getConfig } from './lotteryConfig';
import type { JournalEntry } from './backtest';

export interface WeeklyReport {
  lotteryType: LotteryType;
  lotteryName: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  totalPeriods: number;
  totalCombos: number;
  totalCost: number;
  winCount: number;
  hitDist: Record<number, number>;
  avgHits: number;
  roi: number;
  bestCombo: { zone1: number[]; hits: number } | null;
  strategies: Record<string, { count: number; avgHits: number }>;
  suggestion: string;
}

/** 計算本週報告 */
export function generateWeeklyReport(entries: JournalEntry[], weekOffset: number = 0): WeeklyReport | null {
  if (entries.length === 0) return null;

  const lt: LotteryType = (entries[0].lotteryType ?? 'power') as LotteryType;
  const config = getConfig(lt);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() - weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekEntries = entries.filter(e => {
    const d = new Date(e.date);
    return d >= weekStart && d <= weekEnd;
  });

  if (weekEntries.length === 0) return null;

  const hitDist: Record<number, number> = {};
  let totalHits = 0;
  let totalCost = 0;
  let winCount = 0;
  let bestCombo: { zone1: number[]; hits: number } | null = null;
  const strategies: Record<string, { count: number; totalHits: number }> = {};

  weekEntries.forEach(e => {
    const hits = e.matchCount || 0;
    hitDist[hits] = (hitDist[hits] || 0) + 1;
    totalHits += hits;
    totalCost += e.cost ?? 0;
    if (e.prize && e.prize !== '未中獎') winCount++;
    if (!bestCombo || hits > bestCombo.hits) bestCombo = { zone1: e.recommendedZone1 ?? e.drawZone1, hits };

    const s = e.strategy ?? 'unknown';
    if (!s) return;
    if (!strategies[s]) strategies[s] = { count: 0, totalHits: 0 };
    strategies[s].count++;
    strategies[s].totalHits += hits;
  });

  const totalPrize = weekEntries.reduce((a, e) => a + (e.prizeAmount || 0), 0);
  const roi = totalCost > 0 ? ((totalPrize - totalCost) / totalCost * 100) : 0;

  const strategiesReport: Record<string, { count: number; avgHits: number }> = {};
  Object.entries(strategies).forEach(([k, v]) => {
    strategiesReport[k] = { count: v.count, avgHits: Math.round(v.totalHits / v.count * 100) / 100 };
  });

  return {
    lotteryType: lt,
    lotteryName: config.name,
    weekNumber: weekOffset + 1,
    startDate: weekStart.toISOString().split('T')[0],
    endDate: weekEnd.toISOString().split('T')[0],
    totalPeriods: weekEntries.length,
    totalCombos: weekEntries.length,
    totalCost,
    winCount,
    hitDist,
    avgHits: Math.round(totalHits / weekEntries.length * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    bestCombo,
    strategies: strategiesReport,
    suggestion: roi < -50 ? 'ROI過低，建議減少組數或暫停' : roi < 0 ? '正常損耗，繼續觀察' : '表現良好',
  };
}
