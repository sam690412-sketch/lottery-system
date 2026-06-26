// ============================================================
// V14.0 威力彩13層選號漏斗 - 整合觀察池/夢境/命理權重
// ============================================================

import type { NumberScore } from '@/types';
import { PRIMES, MIRROR_PAIRS } from './lottery';
// V14.0: observation/dream/meta weights are passed as Record<number, number>

/** 魯棒標準化 */
function robustNorm(vals: number[], targetMean = 55, spread = 30): number[] {
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((a, b) => a + b * b, 0) / vals.length - mean * mean) || 1;
  return vals.map(v => {
    const z = (v - mean) / std;
    return Math.max(5, Math.min(100, targetMean + z * spread));
  });
}

/** V14.0 13層評分 + 外部權重 */
export function calculate13LayerScores(
  stats: {
    freq1: Record<number, number>;
    freq300: Record<number, number>;
    freq50: Record<number, number>;
    gaps: Record<number, number>;
    tailFreq: Record<number, number>;
    consecFreq: Record<number, number>;
  },
  userZone1: number[],
  hexWeights: Record<number, number>,
  enableHex: boolean,
  // V14.0: 觀察池權重
  observationWeights?: Record<number, number>,
  // V14.0: 夢境權重
  dreamWeights?: Record<number, number>,
  // V14.0: 命理權重
  metaphysicsWeights?: Record<number, number>,
  // V14.0: 統計期數標記
): NumberScore[] {
  // V16: 動態確定號碼範圍（從 stats.freq1 的 keys 推斷）
  const maxNumber = Math.max(...Object.keys(stats.freq1).map(Number).filter(n => n > 0), 38);
  const nums = Array.from({ length: maxNumber }, (_, i) => i + 1);
  const hasObs = observationWeights && Object.keys(observationWeights).length > 0;
  const hasDream = dreamWeights && Object.keys(dreamWeights).length > 0;
  const hasMeta = metaphysicsWeights && Object.keys(metaphysicsWeights).length > 0;

  // Layer 1: 歷史熱度
  const l1_raw = nums.map(n => stats.freq1[n] || 0);
  const l1 = robustNorm(l1_raw, 58, 22);

  // Layer 2: 近期冷熱
  const l2_raw = nums.map(n => stats.freq50[n] || 0);
  const l2 = robustNorm(l2_raw, 55, 25);

  // Layer 3: 遺漏期數
  const l3_raw = nums.map(n => {
    const g = stats.gaps[n] || 0;
    if (g <= 10) return g * 3;
    if (g <= 40) return 30 + (g - 10) * 1.5;
    if (g <= 80) return 75 + (g - 40) * 0.5;
    return 95 - (g - 80) * 0.3;
  });
  const l3 = robustNorm(l3_raw, 50, 28);

  // Layer 4: 區間分布
  const l4_raw = nums.map(n => stats.freq1[n] || 0);
  const l4 = robustNorm(l4_raw, 52, 20);

  // Layer 5: 奇偶比例
  const oddFreq = nums.filter(n => n % 2 === 1).reduce((a, n) => a + (stats.freq1[n] || 0), 0);
  const evenFreq = nums.filter(n => n % 2 === 0).reduce((a, n) => a + (stats.freq1[n] || 0), 0);
  const l5 = nums.map(n => {
    const isOdd = n % 2 === 1;
    const ratio = isOdd ? (stats.freq1[n] || 0) / (oddFreq / 19) : (stats.freq1[n] || 0) / (evenFreq / 19);
    return ratio * 50;
  });
  const l5n = robustNorm(l5, 55, 20);

  // Layer 6: 大小比例
  const bigFreq = nums.filter(n => n >= 20).reduce((a, n) => a + (stats.freq1[n] || 0), 0);
  const smallFreq = nums.filter(n => n < 20).reduce((a, n) => a + (stats.freq1[n] || 0), 0);
  const l6 = nums.map(n => {
    const isBig = n >= 20;
    const ratio = isBig ? (stats.freq1[n] || 0) / (bigFreq / 19) : (stats.freq1[n] || 0) / (smallFreq / 19);
    return ratio * 50;
  });
  const l6n = robustNorm(l6, 55, 20);

  // Layer 7: 和值合理性
  const l7 = nums.map(n => {
    const sum6 = n * 6;
    if (sum6 >= 100 && sum6 <= 135) return 80;
    if (sum6 >= 90 && sum6 <= 140) return 60;
    return 40;
  });

  // Layer 8: 尾數分布
  const l8_raw = nums.map(n => stats.tailFreq[n % 10] || 0);
  const l8 = robustNorm(l8_raw, 58, 20);

  // Layer 9: 連號機率
  const l9_raw = nums.map(n => stats.consecFreq[n] || 0);
  const l9 = robustNorm(l9_raw, 50, 25);

  // Layer 10: 質數比例
  const l10 = nums.map(n => PRIMES.includes(n) ? 75 : 35);

  // Layer 11: 鏡像號
  const l11_raw = nums.map(n => stats.freq1[MIRROR_PAIRS[n] || n] || 0);
  const l11 = robustNorm(l11_raw, 52, 20);

  // Layer 12: 養號權重
  const l12 = nums.map(n => {
    if (userZone1.includes(n)) return 100;
    const minDist = Math.min(...userZone1.map(m => Math.abs(n - m)));
    if (minDist <= 1) return 55;
    if (minDist <= 3) return 25;
    if (minDist <= 5) return 10;
    return 0;
  });

  // Layer 13: 多卦象權重
  const l13 = nums.map(n => enableHex ? (hexWeights[n] || 10) : 50);
  const l13n = robustNorm(l13, 55, 25);

  // V14.0: Layer 14 - 觀察池權重（直接給高分，不經 robustNorm）
  const l14n = nums.map(n => hasObs ? Math.min(100, (observationWeights![n] || 0) * 1.8 + 30) : 50);

  // V14.0: Layer 15 - 夢境權重（直接給高分，不經 robustNorm）
  const l15n = nums.map(n => hasDream ? Math.min(100, (dreamWeights![n] || 0) * 1.5 + 25) : 50);

  // V14.0: Layer 16 - 命理權重（直接給高分，不經 robustNorm）
  const l16n = nums.map(n => hasMeta ? Math.min(100, (metaphysicsWeights![n] || 0) * 1.5 + 25) : 50);

  // 權重配置 (V14.0: 調整為容納新層)
  const W = {
    l1: 0.08, l2: 0.06, l3: 0.05, l4: 0.04, l5: 0.04,
    l6: 0.04, l7: 0.04, l8: 0.05, l9: 0.04, l10: 0.04,
    l11: 0.04, l12: 0.12, l13: 0.08,
    l14: hasObs ? 0.10 : 0, l15: hasDream ? 0.10 : 0, l16: hasMeta ? 0.10 : 0,
  };

  // 若沒有外部權重，重新分配基礎權重
  if (!hasObs && !hasDream && !hasMeta) {
    W.l1 = 0.10; W.l2 = 0.08; W.l3 = 0.06; W.l4 = 0.05; W.l5 = 0.05;
    W.l6 = 0.05; W.l7 = 0.05; W.l8 = 0.06; W.l9 = 0.05; W.l10 = 0.05;
    W.l11 = 0.05; W.l12 = 0.15; W.l13 = 0.10;
  }

  // 計算總分
  const scores: NumberScore[] = nums.map((n, i) => {
    const layers: Record<string, number> = {
      '歷史熱度': Math.round(l1[i]), '近期冷熱': Math.round(l2[i]), '遺漏期數': Math.round(l3[i]),
      '區間分布': Math.round(l4[i]), '奇偶比例': Math.round(l5n[i]), '大小比例': Math.round(l6n[i]),
      '和值合理性': Math.round(l7[i]), '尾數分布': Math.round(l8[i]), '連號機率': Math.round(l9[i]),
      '質數比例': Math.round(l10[i]), '鏡像號': Math.round(l11[i]), '養號權重': Math.round(l12[i]),
      '多卦象': Math.round(l13n[i]),
    };
    if (hasObs) layers['統計觀察池'] = Math.round(l14n[i]);
    if (hasDream) layers['夢境權重'] = Math.round(l15n[i]);
    if (hasMeta) layers['命理權重'] = Math.round(l16n[i]);

    let total =
      l1[i] * W.l1 + l2[i] * W.l2 + l3[i] * W.l3 +
      l4[i] * W.l4 + l5n[i] * W.l5 + l6n[i] * W.l6 +
      l7[i] * W.l7 + l8[i] * W.l8 + l9[i] * W.l9 +
      l10[i] * W.l10 + l11[i] * W.l11 + l12[i] * W.l12 + l13n[i] * W.l13;
    if (hasObs) total += l14n[i] * W.l14;
    if (hasDream) total += l15n[i] * W.l15;
    if (hasMeta) total += l16n[i] * W.l16;

    // V14.1: 計算每個來源類別的貢獻分數（用於來源比例顯示）
    const sourceScores: Record<string, number> = {};
    // 統計 = layers 1-13
    sourceScores['統計'] =
      l1[i] * W.l1 + l2[i] * W.l2 + l3[i] * W.l3 +
      l4[i] * W.l4 + l5n[i] * W.l5 + l6n[i] * W.l6 +
      l7[i] * W.l7 + l8[i] * W.l8 + l9[i] * W.l9 +
      l10[i] * W.l10 + l11[i] * W.l11 + l12[i] * W.l12 + l13n[i] * W.l13;
    sourceScores['觀察池'] = hasObs ? l14n[i] * W.l14 : 0;
    sourceScores['夢境'] = hasDream ? l15n[i] * W.l15 : 0;
    sourceScores['命理'] = hasMeta ? l16n[i] * W.l16 : 0;

    return {
      number: n,
      total: Math.round(total),
      grade: total >= 80 ? 'A' : total >= 60 ? 'B' : total >= 40 ? 'C' : 'D',
      layers,
      sourceScores,
      isRecommended: total >= 60,
      isUserNumber: userZone1.includes(n),
    };
  });

  return scores.sort((a, b) => b.total - a.total);
}

/** 產生組合 */
export function generateCombinations(
  scores: NumberScore[],
  userZone1: number[],
  strategy: string,
  count: 2 | 3,
): import('@/types').Combination[] {
  const aList = scores.filter(s => s.grade === 'A').map(s => s.number);
  const bList = scores.filter(s => s.grade === 'B').map(s => s.number);
  const cList = scores.filter(s => s.grade === 'C').map(s => s.number);
  const abPool = [...aList, ...bList];

  const keepCount = strategy === '保守' ? 5 : strategy === '平衡' ? 3 : strategy === '進取' ? 2 : strategy === '夢境強化' ? 3 : strategy === '卦象強化' ? 3 : 4;

  const combos: import('@/types').Combination[] = [];

  for (let i = 0; i < count; i++) {
    const sortedUser = [...userZone1].sort((a, b) => {
      const sa = scores.find(s => s.number === a)?.total || 0;
      const sb = scores.find(s => s.number === b)?.total || 0;
      return sb - sa;
    });
    const kept = sortedUser.slice(0, keepCount);
    const needed = 6 - kept.length;
    const pool = abPool.filter(n => !kept.includes(n));
    let selected: number[] = [];

    if (strategy === '保守') {
      selected = pool.slice(0, needed);
    } else if (strategy === '平衡') {
      const offset = i * 2;
      selected = [...pool.slice(offset, offset + Math.ceil(needed / 2)), ...pool.slice(-Math.floor(needed / 2))].slice(0, needed);
    } else {
      const coldPool = cList.filter(n => scores.find(s => s.number === n)?.total || 0 > 35);
      selected = [...pool.slice(i, i + Math.ceil(needed / 2)), ...coldPool.slice(i, i + Math.floor(needed / 2))].slice(0, needed);
    }

    let zone1 = [...kept, ...selected].sort((a, b) => a - b);
    zone1 = [...new Set(zone1)].slice(0, 6);
    while (zone1.length < 6) {
      const remaining = pool.find(n => !zone1.includes(n));
      if (remaining !== undefined) zone1.push(remaining); else break;
    }
    zone1.sort((a, b) => a - b);
    const aCount = zone1.filter(n => aList.includes(n)).length;
    const abCount = zone1.filter(n => abPool.includes(n)).length;
    const z2Options = [2, 5, 3, 7, 4, 6, 8, 1];
    const zone2 = z2Options[i % z2Options.length];
    const score = Math.round(zone1.reduce((a, n) => a + (scores.find(s => s.number === n)?.total || 0), 0) / 6);

    const reasons = [
      `${strategy}策略：保留${kept.length}個養號(${kept.join(',')})`,
      `含${aCount}個A級+${abCount - aCount}個B級號碼`,
      `奇偶${zone1.filter(n => n % 2 === 1).length}:${zone1.filter(n => n % 2 === 0).length}，和值${zone1.reduce((a, b) => a + b, 0)}`,
    ];

    combos.push({
      id: `combo-${i}`, name: `${strategy}${i + 1}`, zone1, zone2, score,
      reason: reasons.join('；'),
      riskWarning: strategy === '進取' ? '高風險策略，包含冷號' : strategy === '保守' ? '低風險，以養號為核心' : '中等風險，均衡配置',
      style: strategy as '保守' | '平衡' | '進取',
    });
  }
  return combos;
}
