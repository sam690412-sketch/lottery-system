// ============================================================
// 威力彩13層選號漏斗 - 彩票數據與統計
// ============================================================

import type { DrawRecord } from '@/types';

// 威力彩規則
export const ZONE1_MIN = 1;
export const ZONE1_MAX = 38;
export const ZONE2_MIN = 1;
export const ZONE2_MAX = 8;

// 質數列表 (1-38)
export const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];

// 鏡像對照
export const MIRROR_PAIRS: Record<number, number> = {
  1: 38, 2: 37, 3: 36, 4: 35, 5: 34, 6: 33, 7: 32, 8: 31, 9: 30,
  10: 29, 11: 28, 12: 27, 13: 26, 14: 25, 15: 24, 16: 23, 17: 22, 18: 21, 19: 20,
};

// 八卦定義
export const TRIGRAMS: Record<number, { symbol: string; name: string; nature: string; element: string; yao: number[] }> = {
  1: { symbol: '☰', name: '乾', nature: '天', element: '金', yao: [1, 1, 1] },
  2: { symbol: '☱', name: '兌', nature: '澤', element: '金', yao: [1, 1, 0] },
  3: { symbol: '☲', name: '離', nature: '火', element: '火', yao: [1, 0, 1] },
  4: { symbol: '☳', name: '震', nature: '雷', element: '木', yao: [0, 0, 1] },
  5: { symbol: '☴', name: '巽', nature: '風', element: '木', yao: [0, 1, 1] },
  6: { symbol: '☵', name: '坎', nature: '水', element: '水', yao: [0, 1, 0] },
  7: { symbol: '☶', name: '艮', nature: '山', element: '土', yao: [1, 0, 0] },
  8: { symbol: '☷', name: '坤', nature: '地', element: '土', yao: [0, 0, 0] },
};

// 五行→數字映射
export const FIVE_ELEMENT_NUMBERS: Record<string, number[]> = {
  '水': [1, 6, 11, 16, 21, 26, 31, 36],
  '火': [2, 7, 12, 17, 22, 27, 32, 37],
  '木': [3, 8, 13, 18, 23, 28, 33, 38],
  '金': [4, 9, 14, 19, 24, 29, 34],
  '土': [5, 10, 15, 20, 25, 30, 35],
};

// 生成模擬歷史數據 (1147期)
export function generateHistoryData(): DrawRecord[] {
  const data: DrawRecord[] = [];
  const seed = 42;
  let rng = seed;
  const seededRandom = () => {
    rng = (rng * 16807 + 0) % 2147483647;
    return (rng - 1) / 2147483646;
  };

  // 基於真實數據的頻率偏移
  const biasWeights: Record<number, number> = {
    9: 1.4, 14: 1.35, 11: 1.3, 38: 1.28, 34: 1.25, 32: 1.2,
    7: 1.15, 20: 1.12, 35: 1.1, 8: 1.08, 15: 1.05, 16: 1.05,
    29: 1.02, 4: 1.0, 6: 1.0, 17: 0.98, 27: 0.95, 31: 0.95,
    22: 0.92, 3: 0.9, 36: 0.88, 1: 0.85, 33: 0.85, 18: 0.82,
    28: 0.8, 10: 0.78, 19: 0.75, 12: 0.72, 25: 0.7, 21: 0.68,
    26: 0.65, 5: 0.62, 13: 0.58, 24: 0.55, 23: 0.5, 2: 0.45, 30: 0.4,
  };

  for (let period = 103000001; period <= 103001147; period++) {
    const zone1: number[] = [];
    const pool = Array.from({ length: 38 }, (_, i) => i + 1);
    // 加權抽樣
    for (let i = 0; i < 6; i++) {
      const weights = pool.map(n => biasWeights[n] || 1.0);
      const total = weights.reduce((a, b) => a + b, 0);
      let r = seededRandom() * total;
      let idx = 0;
      for (let j = 0; j < weights.length; j++) {
        r -= weights[j];
        if (r <= 0) { idx = j; break; }
      }
      zone1.push(pool[idx]);
      pool.splice(idx, 1);
    }
    zone1.sort((a, b) => a - b);

    const zone2Bias = [1.1, 1.4, 1.0, 0.95, 1.2, 0.9, 0.8, 0.95];
    const z2Total = zone2Bias.reduce((a, b) => a + b, 0);
    let r2 = seededRandom() * z2Total;
    let zone2 = 1;
    for (let j = 0; j < 8; j++) {
      r2 -= zone2Bias[j];
      if (r2 <= 0) { zone2 = j + 1; break; }
    }

    const year = 2015 + Math.floor((period - 103000001) / 104);
    const month = (period % 12) + 1;
    const day = (period % 28) + 1;
    data.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      period,
      zone1,
      zone2,
    });
  }
  return data;
}

// 計算號碼統計
export function calculateStats(history: DrawRecord[]) {
  const allZone1: number[] = [];
  const zone2List: number[] = [];
  history.forEach(d => {
    allZone1.push(...d.zone1);
    zone2List.push(d.zone2);
  });

  // 總頻率
  const freq1: Record<number, number> = {};
  allZone1.forEach(n => { freq1[n] = (freq1[n] || 0) + 1; });

  // 近300期
  const recent300 = history.slice(-300);
  const freq300: Record<number, number> = {};
  recent300.forEach(d => d.zone1.forEach(n => { freq300[n] = (freq300[n] || 0) + 1; }));

  // 近50期
  const recent50 = history.slice(-50);
  const freq50: Record<number, number> = {};
  recent50.forEach(d => d.zone1.forEach(n => { freq50[n] = (freq50[n] || 0) + 1; }));

  // 遺漏值
  const gaps: Record<number, number> = {};
  for (let n = 1; n <= 38; n++) {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].zone1.includes(n)) {
        gaps[n] = history.length - 1 - i;
        break;
      }
    }
    if (gaps[n] === undefined) gaps[n] = history.length;
  }

  // 尾數頻率
  const tailFreq: Record<number, number> = {};
  allZone1.forEach(n => { const t = n % 10; tailFreq[t] = (tailFreq[t] || 0) + 1; });

  // 連號頻率
  const consecFreq: Record<number, number> = {};
  history.forEach(d => {
    const sorted = [...d.zone1].sort((a, b) => a - b);
    for (let i = 0; i < 5; i++) {
      if (sorted[i + 1] - sorted[i] === 1) {
        consecFreq[sorted[i]] = (consecFreq[sorted[i]] || 0) + 1;
        consecFreq[sorted[i + 1]] = (consecFreq[sorted[i + 1]] || 0) + 1;
      }
    }
  });

  // 第二區頻率
  const freq2: Record<number, number> = {};
  zone2List.forEach(n => { freq2[n] = (freq2[n] || 0) + 1; });

  // 和值統計
  const sumStats = history.map(d => d.zone1.reduce((a, b) => a + b, 0));
  const avgSum = sumStats.reduce((a, b) => a + b, 0) / sumStats.length;

  return { freq1, freq300, freq50, gaps, tailFreq, consecFreq, freq2, avgSum, history };
}

// 驗證組合
export function validateCombination(zone1: number[], zone2: number): string | null {
  if (zone1.length !== 6) return '第一區必須選6個號碼';
  if (new Set(zone1).size !== 6) return '第一區號碼不可重複';
  if (zone1.some(n => n < 1 || n > 38)) return '第一區號碼必須在1-38之間';
  if (zone2 < 1 || zone2 > 8) return '第二區號碼必須在1-8之間';

  // 奇偶
  const odd = zone1.filter(n => n % 2 === 1).length;
  if (![2, 3, 4].includes(odd)) return '奇偶比例必須為2:4、3:3或4:2';

  // 大小
  const big = zone1.filter(n => n >= 20).length;
  if (![2, 3, 4].includes(big)) return '大小比例必須為2:4、3:3或4:2';

  // 和值
  const sum = zone1.reduce((a, b) => a + b, 0);
  if (sum < 90 || sum > 140) return `和值${sum}必須在90-140之間`;

  // 區間
  const zones = [
    zone1.filter(n => n <= 9).length,
    zone1.filter(n => n >= 10 && n <= 19).length,
    zone1.filter(n => n >= 20 && n <= 29).length,
    zone1.filter(n => n >= 30).length,
  ];
  if (zones.filter(z => z > 0).length < 3) return '必須分布在至少3個區間';

  return null;
}

// 計算中獎
export function checkPrize(myZone1: number[], myZone2: number, drawZone1: number[], drawZone2: number) {
  const match1 = myZone1.filter(n => drawZone1.includes(n)).length;
  const match2 = myZone2 === drawZone2;

  if (match1 === 6 && match2) return { level: '頭獎', amount: 500000000 };
  if (match1 === 6) return { level: '貳獎', amount: 10000000 };
  if (match1 === 5 && match2) return { level: '參獎', amount: 150000 };
  if (match1 === 5) return { level: '肆獎', amount: 20000 };
  if (match1 === 4 && match2) return { level: '伍獎', amount: 4000 };
  if (match1 === 4) return { level: '陸獎', amount: 800 };
  if (match1 === 3 && match2) return { level: '柒獎', amount: 400 };
  if (match1 === 2 && match2) return { level: '捌獎', amount: 200 };
  if (match1 === 3) return { level: '普獎', amount: 100 };
  return { level: '未中獎', amount: 0 };
}

// 從 localStorage 讀取/保存
import { loadLotteryState, saveLotteryState } from '@/repositories/businessDataStorage';

export const STORAGE_KEY = 'power-lottery-13-funnel';

export function loadState(): Partial<AppState> | null {
  try {
    const raw = loadLotteryState();
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveState(state: AppState) {
  try {
    saveLotteryState(state);
  } catch { /* ignore */ }
}

import type { AppState } from '@/types';
