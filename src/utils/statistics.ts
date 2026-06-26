// ============================================================
// V14 統計計算引擎
// ============================================================

import type { HistoricalDraw } from '@/data/historicalData';
import { getMaxNumber } from '@/data/historicalData';

// ---- 熱門/冷門號碼 ----
export interface HotColdItem {
  rank: number;
  number: number;
  count: number;
  rate: string;
}

export function calcHotCold(draws: HistoricalDraw[], type: 'hot' | 'cold', topN = 20): HotColdItem[] {
  const maxNum = getMaxNumber(draws[0]?.mainNumbers.length === 5 ? 'daily539' : draws[0]?.mainNumbers.length === 6 && (draws[0]?.specialNumber !== undefined) ? 'power' : 'lotto649');
  // 用實際數字範圍
  const allNums: number[] = [];
  draws.forEach(d => allNums.push(...d.mainNumbers));
  const freq: Record<number, number> = {};
  for (let i = 1; i <= maxNum; i++) freq[i] = 0;
  allNums.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
  const total = draws.length;
  const sorted = Object.entries(freq).map(([num, count]) => ({
    number: parseInt(num),
    count,
    rate: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0',
  }));
  if (type === 'hot') sorted.sort((a, b) => b.count - a.count);
  else sorted.sort((a, b) => a.count - b.count);
  return sorted.slice(0, topN).map((item, i) => ({ rank: i + 1, ...item }));
}

// ---- 遺漏期數排行 ----
export interface MissingItem {
  rank: number;
  number: number;
  missingPeriods: number;
  lastDrawDate: string;
}

export function calcMissingRank(draws: HistoricalDraw[], maxNum: number): MissingItem[] {
  const lastSeen: Record<number, number> = {};
  for (let i = 1; i <= maxNum; i++) lastSeen[i] = -1;
  draws.forEach((d, idx) => {
    d.mainNumbers.forEach(n => { lastSeen[n] = idx; });
  });
  const total = draws.length;
  const items = Object.entries(lastSeen).map(([num, lastIdx]) => ({
    number: parseInt(num),
    missingPeriods: lastIdx === -1 ? total : total - 1 - lastIdx,
    lastDrawDate: lastIdx >= 0 ? draws[lastIdx].date : '無記錄',
  }));
  items.sort((a, b) => b.missingPeriods - a.missingPeriods);
  return items.slice(0, 20).map((item, i) => ({ rank: i + 1, ...item }));
}

// ---- 尾數分析 ----
export interface TailItem {
  tail: number;
  count: number;
  rate: string;
}

export function calcTailAnalysis(draws: HistoricalDraw[]): TailItem[] {
  const tailCount: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) tailCount[i] = 0;
  let total = 0;
  draws.forEach(d => {
    d.mainNumbers.forEach(n => {
      tailCount[n % 10] = (tailCount[n % 10] || 0) + 1;
      total++;
    });
  });
  return Object.entries(tailCount).map(([tail, count]) => ({
    tail: parseInt(tail),
    count,
    rate: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0',
  }));
}

// ---- 奇偶分析 ----
export interface OddEvenResult {
  oddCount: number;
  evenCount: number;
  oddRate: string;
  evenRate: string;
  patterns: { pattern: string; count: number; rate: string }[];
}

export function calcOddEven(draws: HistoricalDraw[]): OddEvenResult {
  let odd = 0, even = 0;
  const patternCount: Record<string, number> = {};
  draws.forEach(d => {
    let o = 0, e = 0;
    d.mainNumbers.forEach(n => { n % 2 === 1 ? o++ : e++; });
    odd += o; even += e;
    const key = `${o}奇${e}偶`;
    patternCount[key] = (patternCount[key] || 0) + 1;
  });
  const total = odd + even;
  const patterns = Object.entries(patternCount)
    .map(([pattern, count]) => ({ pattern, count, rate: `${((count / draws.length) * 100).toFixed(1)}%` }))
    .sort((a, b) => b.count - a.count);
  return {
    oddCount: odd,
    evenCount: even,
    oddRate: total > 0 ? ((odd / total) * 100).toFixed(1) : '0.0',
    evenRate: total > 0 ? ((even / total) * 100).toFixed(1) : '0.0',
    patterns: patterns.slice(0, 5),
  };
}

// ---- 大小分析 ----
export interface BigSmallResult {
  bigCount: number;
  smallCount: number;
  bigRate: string;
  smallRate: string;
  threshold: number;
  patterns: { pattern: string; count: number; rate: string }[];
}

export function calcBigSmall(draws: HistoricalDraw[], threshold: number): BigSmallResult {
  let big = 0, small = 0;
  const patternCount: Record<string, number> = {};
  draws.forEach(d => {
    let b = 0, s = 0;
    d.mainNumbers.forEach(n => { n >= threshold ? b++ : s++; });
    big += b; small += s;
    const key = `${b}大${s}小`;
    patternCount[key] = (patternCount[key] || 0) + 1;
  });
  const total = big + small;
  const patterns = Object.entries(patternCount)
    .map(([pattern, count]) => ({ pattern, count, rate: `${((count / draws.length) * 100).toFixed(1)}%` }))
    .sort((a, b) => b.count - a.count);
  return {
    bigCount: big,
    smallCount: small,
    bigRate: total > 0 ? ((big / total) * 100).toFixed(1) : '0.0',
    smallRate: total > 0 ? ((small / total) * 100).toFixed(1) : '0.0',
    threshold,
    patterns: patterns.slice(0, 5),
  };
}

// ---- 和值分析 ----
export interface SumResult {
  avgSum: number;
  maxSum: number;
  minSum: number;
  commonRange: string;
  distribution: { range: string; count: number }[];
}

export function calcSumAnalysis(draws: HistoricalDraw[]): SumResult {
  const sums = draws.map(d => d.mainNumbers.reduce((a, b) => a + b, 0));
  const avg = sums.reduce((a, b) => a + b, 0) / sums.length;
  const max = Math.max(...sums);
  const min = Math.min(...sums);
  // 計算眾數區間
  const rangeSize = Math.ceil((max - min) / 10);
  const dist: Record<string, number> = {};
  sums.forEach(s => {
    const start = Math.floor((s - min) / rangeSize) * rangeSize + min;
    const key = `${start}-${start + rangeSize}`;
    dist[key] = (dist[key] || 0) + 1;
  });
  const sortedDist = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  return {
    avgSum: Math.round(avg),
    maxSum: max,
    minSum: min,
    commonRange: sortedDist[0]?.[0] || '',
    distribution: sortedDist.slice(0, 5).map(([range, count]) => ({ range, count })),
  };
}

// ---- 連號分析 ----
export interface ConsecutiveResult {
  noConsecCount: number;
  oneConsecCount: number;
  multiConsecCount: number;
  noConsecRate: string;
  oneConsecRate: string;
  multiConsecRate: string;
  commonPairs: { pair: string; count: number }[];
}

function findConsecutiveGroups(nums: number[]): number[][] {
  const sorted = [...nums].sort((a, b) => a - b);
  const groups: number[][] = [];
  let current: number[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) current.push(sorted[i]);
    else { if (current.length >= 2) groups.push(current); current = [sorted[i]]; }
  }
  if (current.length >= 2) groups.push(current);
  return groups;
}

export function calcConsecutive(draws: HistoricalDraw[]): ConsecutiveResult {
  let noConsec = 0, oneConsec = 0, multiConsec = 0;
  const pairCount: Record<string, number> = {};
  draws.forEach(d => {
    const groups = findConsecutiveGroups(d.mainNumbers);
    if (groups.length === 0) noConsec++;
    else if (groups.length === 1) oneConsec++;
    else multiConsec++;
    groups.forEach(g => {
      for (let i = 0; i < g.length - 1; i++) {
        const key = `${g[i]}-${g[i + 1]}`;
        pairCount[key] = (pairCount[key] || 0) + 1;
      }
    });
  });
  const total = draws.length;
  const commonPairs = Object.entries(pairCount)
    .map(([pair, count]) => ({ pair, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  return {
    noConsecCount: noConsec,
    oneConsecCount: oneConsec,
    multiConsecCount: multiConsec,
    noConsecRate: ((noConsec / total) * 100).toFixed(1),
    oneConsecRate: ((oneConsec / total) * 100).toFixed(1),
    multiConsecRate: ((multiConsec / total) * 100).toFixed(1),
    commonPairs,
  };
}

// ---- 同尾分析 ----
export interface SameTailResult {
  sameTailDraws: number;
  sameTailRate: string;
  commonTails: { tail: number; count: number }[];
  commonSameTail: { numbers: string; count: number }[];
}

export function calcSameTail(draws: HistoricalDraw[]): SameTailResult {
  let sameTailCount = 0;
  const tailCount: Record<number, number> = {};
  const comboCount: Record<string, number> = {};
  draws.forEach(d => {
    const tails: Record<number, number[]> = {};
    d.mainNumbers.forEach(n => {
      const t = n % 10;
      if (!tails[t]) tails[t] = [];
      tails[t].push(n);
    });
    let hasSameTail = false;
    Object.entries(tails).forEach(([t, nums]) => {
      if (nums.length >= 2) {
        hasSameTail = true;
        const ti = parseInt(t);
        tailCount[ti] = (tailCount[ti] || 0) + 1;
        const key = nums.sort((a, b) => a - b).join(',');
        comboCount[key] = (comboCount[key] || 0) + 1;
      }
    });
    if (hasSameTail) sameTailCount++;
  });
  const commonTails = Object.entries(tailCount)
    .map(([tail, count]) => ({ tail: parseInt(tail), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const commonSameTail = Object.entries(comboCount)
    .map(([numbers, count]) => ({ numbers, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    sameTailDraws: sameTailCount,
    sameTailRate: ((sameTailCount / draws.length) * 100).toFixed(1),
    commonTails,
    commonSameTail,
  };
}

// ---- 重複號分析 ----
export interface RepeatResult {
  noRepeatCount: number;
  oneRepeatCount: number;
  multiRepeatCount: number;
  noRepeatRate: string;
  oneRepeatRate: string;
  multiRepeatRate: string;
  commonRepeats: { number: number; count: number }[];
}

export function calcRepeatNumbers(draws: HistoricalDraw[]): RepeatResult {
  if (draws.length < 2) return { noRepeatCount: 0, oneRepeatCount: 0, multiRepeatCount: 0, noRepeatRate: '0.0', oneRepeatRate: '0.0', multiRepeatRate: '0.0', commonRepeats: [] };
  let noRepeat = 0, oneRepeat = 0, multiRepeat = 0;
  const repeatCount: Record<number, number> = {};
  for (let i = 1; i < draws.length; i++) {
    const prev = new Set(draws[i - 1].mainNumbers);
    const curr = draws[i].mainNumbers;
    const repeats = curr.filter(n => prev.has(n));
    if (repeats.length === 0) noRepeat++;
    else if (repeats.length === 1) oneRepeat++;
    else multiRepeat++;
    repeats.forEach(n => { repeatCount[n] = (repeatCount[n] || 0) + 1; });
  }
  const total = draws.length - 1;
  const commonRepeats = Object.entries(repeatCount)
    .map(([num, count]) => ({ number: parseInt(num), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return {
    noRepeatCount: noRepeat,
    oneRepeatCount: oneRepeat,
    multiRepeatCount: multiRepeat,
    noRepeatRate: ((noRepeat / total) * 100).toFixed(1),
    oneRepeatRate: ((oneRepeat / total) * 100).toFixed(1),
    multiRepeatRate: ((multiRepeat / total) * 100).toFixed(1),
    commonRepeats,
  };
}

// ---- 號碼頻率表（給深度分析用） ----
export function calcFrequency(draws: HistoricalDraw[], maxNum: number): Record<number, number> {
  const freq: Record<number, number> = {};
  for (let i = 1; i <= maxNum; i++) freq[i] = 0;
  draws.forEach(d => d.mainNumbers.forEach(n => { freq[n] = (freq[n] || 0) + 1; }));
  return freq;
}

// ---- AI 熱度分數 ----
export interface HeatScoreItem {
  number: number;
  score: number;
  freq: number;
  missing: number;
}

export function calcHeatScores(draws: HistoricalDraw[], maxNum: number): HeatScoreItem[] {
  const freq = calcFrequency(draws, maxNum);
  const total = draws.length;
  // 遺漏
  const lastSeen: Record<number, number> = {};
  for (let i = 1; i <= maxNum; i++) lastSeen[i] = -1;
  draws.forEach((d, idx) => d.mainNumbers.forEach(n => { lastSeen[n] = idx; }));
  const items: HeatScoreItem[] = [];
  for (let n = 1; n <= maxNum; n++) {
    const f = freq[n];
    const missing = lastSeen[n] === -1 ? total : total - 1 - lastSeen[n];
    const expectedFreq = (draws.length * (draws[0]?.mainNumbers.length || 6)) / maxNum;
    const freqScore = Math.min(40, (f / expectedFreq) * 30);
    const missScore = missing < 5 ? 30 : missing < 15 ? 20 : missing < 30 ? 10 : 5;
    items.push({ number: n, score: Math.round(freqScore + missScore), freq: f, missing });
  }
  return items.sort((a, b) => b.score - a.score);
}

// ---- 遺漏週期模型 ----
export interface MissingCycleItem {
  number: number;
  avgCycle: number;
  currentMissing: number;
  isOverdue: boolean;
  overdueRatio: string;
}

export function calcMissingCycles(draws: HistoricalDraw[], maxNum: number): MissingCycleItem[] {
  const gaps: Record<number, number[]> = {};
  for (let i = 1; i <= maxNum; i++) gaps[i] = [];
  const lastPos: Record<number, number> = {};
  for (let i = 1; i <= maxNum; i++) lastPos[i] = -1;
  draws.forEach((d, idx) => {
    d.mainNumbers.forEach(n => {
      if (lastPos[n] >= 0) gaps[n].push(idx - lastPos[n]);
      lastPos[n] = idx;
    });
  });
  const total = draws.length;
  const items: MissingCycleItem[] = [];
  for (let n = 1; n <= maxNum; n++) {
    const g = gaps[n];
    const avgCycle = g.length > 0 ? g.reduce((a, b) => a + b, 0) / g.length : total;
    const currentMissing = lastPos[n] === -1 ? total : total - 1 - lastPos[n];
    const isOverdue = currentMissing > avgCycle * 1.5;
    const overdueRatio = avgCycle > 0 ? (currentMissing / avgCycle).toFixed(2) : '0';
    items.push({ number: n, avgCycle: Math.round(avgCycle * 10) / 10, currentMissing, isOverdue, overdueRatio });
  }
  return items.sort((a, b) => parseFloat(b.overdueRatio) - parseFloat(a.overdueRatio));
}

// ---- 組合分析 TOP20 ----
export interface ComboItem { rank: number; combo: string; count: number; rate: string; }

/** 熱門組合：最常一起出現的號碼對/三號組 */
export function calcHotCombos(draws: HistoricalDraw[], topN = 20): ComboItem[] {
  const pairCount: Record<string, number> = {};
  draws.forEach(d => {
    const nums = d.mainNumbers.sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${nums[i]}-${nums[j]}`;
        pairCount[key] = (pairCount[key] || 0) + 1;
      }
    }
  });
  return Object.entries(pairCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([combo, count], i) => ({
      rank: i + 1, combo, count,
      rate: `${((count / draws.length) * 100).toFixed(1)}%`,
    }));
}

/** 冷門組合：最少一起出現的號碼對 */
export function calcColdCombos(draws: HistoricalDraw[], topN = 20): ComboItem[] {
  const pairCount: Record<string, number> = {};
  draws.forEach(d => {
    const nums = d.mainNumbers.sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${nums[i]}-${nums[j]}`;
        pairCount[key] = (pairCount[key] || 0) + 1;
      }
    }
  });
  return Object.entries(pairCount)
    .filter(([, c]) => c <= 2)
    .sort((a, b) => a[1] - b[1])
    .slice(0, topN)
    .map(([combo, count], i) => ({
      rank: i + 1, combo, count,
      rate: `${((count / draws.length) * 100).toFixed(1)}%`,
    }));
}

/** 連號組合 TOP20 */
export function calcConsecCombos(draws: HistoricalDraw[], topN = 20): ComboItem[] {
  const consecCount: Record<string, number> = {};
  draws.forEach(d => {
    const nums = d.mainNumbers.sort((a, b) => a - b);
    for (let i = 0; i < nums.length - 1; i++) {
      if (nums[i + 1] === nums[i] + 1) {
        const key = `${nums[i]}-${nums[i + 1]}`;
        consecCount[key] = (consecCount[key] || 0) + 1;
      }
    }
  });
  return Object.entries(consecCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([combo, count], i) => ({
      rank: i + 1, combo, count,
      rate: `${((count / draws.length) * 100).toFixed(1)}%`,
    }));
}

/** 同尾組合 TOP20 */
export function calcSameTailCombos(draws: HistoricalDraw[], topN = 20): ComboItem[] {
  const tailComboCount: Record<string, number> = {};
  draws.forEach(d => {
    const tails: Record<number, number[]> = {};
    d.mainNumbers.forEach(n => {
      const t = n % 10;
      if (!tails[t]) tails[t] = [];
      tails[t].push(n);
    });
    Object.values(tails).forEach(nums => {
      if (nums.length >= 2) {
        const key = nums.sort((a, b) => a - b).join(',');
        tailComboCount[key] = (tailComboCount[key] || 0) + 1;
      }
    });
  });
  return Object.entries(tailComboCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([combo, count], i) => ({
      rank: i + 1, combo, count,
      rate: `${((count / draws.length) * 100).toFixed(1)}%`,
    }));
}

// ---- 尾數循環模型 ----
export interface TailTrendItem {
  tail: number;
  recentCount: number;
  oldCount: number;
  trend: '升溫' | '降溫' | '持平';
  change: string;
}

export function calcTailTrends(draws: HistoricalDraw[]): TailTrendItem[] {
  const half = Math.floor(draws.length / 2);
  const recent = draws.slice(-half);
  const old = draws.slice(0, half);
  const recentTail: Record<number, number> = {};
  const oldTail: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) { recentTail[i] = 0; oldTail[i] = 0; }
  recent.forEach(d => d.mainNumbers.forEach(n => { recentTail[n % 10] = (recentTail[n % 10] || 0) + 1; }));
  old.forEach(d => d.mainNumbers.forEach(n => { oldTail[n % 10] = (oldTail[n % 10] || 0) + 1; }));
  return Object.entries(recentTail).map(([tail, rc]) => {
    const oc = oldTail[parseInt(tail)] || 1;
    const ratio = oc > 0 ? rc / oc : 1;
    return {
      tail: parseInt(tail),
      recentCount: rc,
      oldCount: oc,
      trend: ratio > 1.2 ? '升溫' as const : ratio < 0.8 ? '降溫' as const : '持平' as const,
      change: `${((ratio - 1) * 100).toFixed(0)}%`,
    };
  });
}
