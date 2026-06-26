// ============================================================
// V16-2 — Builder Step 2 統計整合（只呼叫既有 statistics.ts，不重寫演算法）
// 產生 baseNumberPool 供後續夢境/生日/命理步驟使用。
// 不碰權限/付款/gating。
// ============================================================
import type { LotteryType } from '@/utils/lotteryConfig';
import { getHistoricalData, getMaxNumber, getBigSmallThreshold } from '@/data/historicalData';
import {
  calcHotCold,
  calcMissingRank,
  calcOddEven,
  calcBigSmall,
  type HotColdItem,
  type MissingItem,
  type OddEvenResult,
  type BigSmallResult,
} from '@/utils/statistics';

export interface BuilderStatsResult {
  lotteryType: LotteryType;
  maxNum: number;
  drawCount: number;
  hotTop10: HotColdItem[];
  coldTop10: HotColdItem[];
  missing: MissingItem[];
  oddEven: OddEvenResult;
  bigSmall: BigSmallResult;
  summary: string;
}

export interface BaseNumberPoolEntry {
  num: number;
  weight: number;       // 統計權重（熱號高、冷號低）
  reasons: string[];    // 形成原因（供後續顯示）
}

export interface BaseNumberPool {
  source: 'statistics';
  weightPct: number;    // 統計權重佔比（顯示用，30%）
  entries: BaseNumberPoolEntry[];
}

/**
 * Step 2：呼叫既有 statistics.ts，回傳分析結果。
 * 純包裝；不修改 statistics.ts。
 */
export function runBuilderStatistics(lotteryType: LotteryType): BuilderStatsResult {
  const draws = getHistoricalData(lotteryType);
  const maxNum = getMaxNumber(lotteryType);
  const hot = calcHotCold(draws, 'hot', 10);
  const cold = calcHotCold(draws, 'cold', 10);
  const missing = calcMissingRank(draws, maxNum);
  const oddEven = calcOddEven(draws);
  const bigSmall = calcBigSmall(draws, getBigSmallThreshold(lotteryType));

  const summary =
    `共分析 ${draws.length} 期。熱號 ${hot.slice(0, 3).map((h) => h.number).join('、')}；` +
    `冷號 ${cold.slice(0, 3).map((c) => c.number).join('、')}；` +
    `奇偶 ${oddEven.oddRate} / ${oddEven.evenRate}。`;

  return { lotteryType, maxNum, drawCount: draws.length, hotTop10: hot, coldTop10: cold, missing, oddEven, bigSmall, summary };
}

/**
 * 由統計結果產生 baseNumberPool（純衍生）。
 * 熱號權重高、冷號權重低；供後續步驟疊加。
 */
export function buildBaseNumberPool(stats: BuilderStatsResult): BaseNumberPool {
  const map = new Map<number, BaseNumberPoolEntry>();
  const ensure = (n: number): BaseNumberPoolEntry => {
    let e = map.get(n);
    if (!e) { e = { num: n, weight: 0, reasons: [] }; map.set(n, e); }
    return e;
  };

  // 熱號：高權重（Top10 由高到低給 30→21）
  stats.hotTop10.forEach((h, i) => {
    const e = ensure(h.number);
    e.weight += 30 - i;
    e.reasons.push('熱號');
  });
  // 冷號：低權重加成（可作為養號候選，給 5）
  stats.coldTop10.forEach((c) => {
    const e = ensure(c.number);
    e.weight += 5;
    e.reasons.push('冷號');
  });

  const entries = Array.from(map.values()).sort((a, b) => b.weight - a.weight);
  return { source: 'statistics', weightPct: 30, entries };
}
