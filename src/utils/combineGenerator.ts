// ============================================================
// V16 樂合彩組合生成引擎 - C(n,k) 組合
// 49樂合彩 / 39樂合彩 共用
// ============================================================

import type { LotteryType, CombinePlayType } from './lotteryConfig';
import { PLAY_TYPE_CONFIG } from './lotteryConfig';
import type { NumberScore } from '@/types';

export interface ScoredCombination {
  numbers: number[];
  avgScore: number;
  sourceRatios: Record<string, number>;
  details: { number: number; score: number; grade: string }[];
}

export interface CombineResult {
  type: LotteryType;
  playType: CombinePlayType;
  playLabel: string;
  candidateCount: number;
  totalCombinations: number;
  combos: ScoredCombination[];
  warnings?: string[];
}

// C(n,k) 組合生成
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  if (k === 1) return arr.map(e => [e]);
  const result: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const subCombos = combinations(arr.slice(i + 1), k - 1);
    subCombos.forEach(sub => result.push([arr[i], ...sub]));
  }
  return result;
}

// 計算組合的來源比例
function calcComboSourceRatios(
  combo: number[], scores: NumberScore[]
): Record<string, number> {
  const total: Record<string, number> = { 統計: 0, 觀察池: 0, 夢境: 0, 命理: 0 };
  combo.forEach(n => {
    const s = scores.find(sc => sc.number === n);
    if (s && s.sourceScores) {
      Object.entries(s.sourceScores).forEach(([key, val]) => { total[key] = (total[key] || 0) + val; });
    }
  });
  const sum = Object.values(total).reduce((a, b) => a + b, 0);
  if (sum === 0) return { 統計: 100 };
  const ratios: Record<string, number> = {};
  Object.entries(total).forEach(([key, val]) => { ratios[key] = Math.round((val / sum) * 100); });
  return ratios;
}

/** V16.3: 檢查並處理 must_include / must_exclude 衝突 */
function resolveConflicts(mustInclude: number[], mustExclude: number[]): {
  resolvedInclude: number[];
  resolvedExclude: number[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const conflictNums = mustInclude.filter(n => mustExclude.includes(n));
  if (conflictNums.length > 0) {
    for (const n of conflictNums) {
      warnings.push(`號碼 ${String(n).padStart(2, '0')} 同時被強制保留與排除，已依排除優先處理`);
    }
  }
  return {
    resolvedInclude: mustInclude.filter(n => !mustExclude.includes(n)),
    resolvedExclude: mustExclude,
    warnings,
  };
}

/** V16.3: 樂合彩組合產生主函數（含 must_include / must_exclude） */
export function generateLottoCombine(
  lotteryType: 'lotto49c' | 'daily39c',
  playType: CombinePlayType,
  scores: NumberScore[],
  comboCount: number,
  mustInclude: number[] = [],
  mustExclude: number[] = [],
): CombineResult & { warnings?: string[] } {
  const k = PLAY_TYPE_CONFIG[playType].k;
  const warnings: string[] = [];

  // 1. 處理衝突
  const { resolvedInclude, resolvedExclude } = resolveConflicts(mustInclude, mustExclude);
  if (resolvedInclude.length !== mustInclude.length) {
    warnings.push(...resolveConflicts(mustInclude, mustExclude).warnings);
  }

  // 2. 檢查 must_include 數量是否超過玩法
  if (resolvedInclude.length > k) {
    return {
      type: lotteryType,
      playType,
      playLabel: PLAY_TYPE_CONFIG[playType].label,
      candidateCount: 0,
      totalCombinations: 0,
      combos: [],
      warnings: [`強制保留號碼數量(${resolvedInclude.length})超過本玩法可選數量(${k})`],
    };
  }

  // 3. 建立候選池（A/B 級高分號碼 top 15）
  let candidates = scores
    .filter(s => s.grade === 'A' || s.grade === 'B')
    .sort((a, b) => b.total - a.total)
    .slice(0, 15)
    .map(s => s.number);

  // 4. 排除 must_exclude 號碼
  candidates = candidates.filter(n => !resolvedExclude.includes(n));

  // 5. 確保 must_include 號碼在候選池中
  for (const n of resolvedInclude) {
    if (!candidates.includes(n)) {
      candidates.push(n);
    }
  }

  // 6. 如果候選池不足 k 個，擴展到 C 級
  if (candidates.length < k) {
    const extraC = scores
      .filter(s => s.grade === 'C' && !resolvedExclude.includes(s.number))
      .sort((a, b) => b.total - a.total)
      .slice(0, k - candidates.length)
      .map(s => s.number);
    candidates.push(...extraC);
  }

  // 7. 如果候選池仍然不足，從所有非排除號碼補充
  if (candidates.length < k) {
    const extraAll = scores
      .filter(s => !resolvedExclude.includes(s.number) && !candidates.includes(s.number))
      .sort((a, b) => b.total - a.total)
      .slice(0, k - candidates.length)
      .map(s => s.number);
    candidates.push(...extraAll);
  }

  candidates = [...new Set(candidates)]; // 去重

  // 8. 計算還需要從候選池選幾個號碼
  const needFromPool = k - resolvedInclude.length;

  // 9. 生成組合
  let allCombos: number[][];

  if (resolvedInclude.length === 0) {
    // 無 must_include：傳統 C(n,k)
    allCombos = combinations(candidates, k);
  } else {
    // 有 must_include：從候選池中選 needFromPool 個，再與 must_include 合併
    const poolWithoutMust = candidates.filter(n => !resolvedInclude.includes(n));
    if (poolWithoutMust.length < needFromPool) {
      // 從全部非排除號碼中補充
      const allScoresNums = scores
        .filter(s => !resolvedExclude.includes(s.number) && !resolvedInclude.includes(s.number) && !poolWithoutMust.includes(s.number))
        .map(s => s.number);
      poolWithoutMust.push(...allScoresNums.slice(0, needFromPool - poolWithoutMust.length));
    }
    const subCombos = combinations(poolWithoutMust, needFromPool);
    allCombos = subCombos.map(sub => [...resolvedInclude, ...sub]);
  }

  // 10. 去重
  const seen = new Set<string>();
  allCombos = allCombos.filter(combo => {
    const key = [...combo].sort((a, b) => a - b).join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 11. 每組計算綜合評分
  const scoredCombos = allCombos.map(combo => {
    const sortedCombo = [...combo].sort((a, b) => a - b);
    const avgScore = Math.round(sortedCombo.reduce((sum, n) => {
      const s = scores.find(sc => sc.number === n);
      return sum + (s ? s.total : 0);
    }, 0) / k);

    return {
      numbers: sortedCombo,
      avgScore,
      sourceRatios: calcComboSourceRatios(sortedCombo, scores),
      details: sortedCombo.map(n => {
        const s = scores.find(sc => sc.number === n);
        return { number: n, score: s ? s.total : 0, grade: s ? s.grade : 'D' };
      }),
    };
  });

  // 12. 排序取前 N 組
  const topCombos = scoredCombos
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, comboCount);

  return {
    type: lotteryType,
    playType,
    playLabel: PLAY_TYPE_CONFIG[playType].label,
    candidateCount: candidates.length,
    totalCombinations: allCombos.length,
    combos: topCombos,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
