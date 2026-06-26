// ============================================================
// V16 七彩種配置中心 - lotteryConfig.ts
// 威力彩 / 大樂透 / 今彩539 / 49樂合彩 / 39樂合彩 / 三星彩 / 四星彩
// ============================================================

export type LotteryType = 'power' | 'lotto649' | 'daily539' | 'lotto49c' | 'daily39c' | 'star3' | 'star4';

export type LotteryCategory = 'lotto6' | 'combine' | 'digit';

export type CombinePlayType = 'pair' | 'triple' | 'quad';

export interface LotteryConfig {
  id: LotteryType;
  name: string;
  nameEn: string;
  themeColor: string;
  themeBg: string;
  mainMin: number;
  mainMax: number;
  mainCount: number;
  hasSpecial: boolean;
  specialMin: number;
  specialMax: number;
  specialMode: 'separate' | 'same' | 'none';
  ticketPrice: number;
  drawDays: string[];
  defaultSumRange: [number, number];
  zones: number[];
  primes: number[];
  category: LotteryCategory;
  sourceType?: LotteryType;
  digitPositions?: string[];
  combinePlayTypes?: CombinePlayType[];
}

// 樂合彩數據源映射
export const COMBINE_SOURCE_MAP: Record<string, LotteryType> = {
  lotto49c: 'lotto649',
  daily39c: 'daily539',
};

// 彩種分類
export const LOTTERY_CATEGORIES: Record<LotteryType, LotteryCategory> = {
  power: 'lotto6',
  lotto649: 'lotto6',
  daily539: 'lotto6',
  lotto49c: 'combine',
  daily39c: 'combine',
  star3: 'digit',
  star4: 'digit',
};

// 玩法配置
export const PLAY_TYPE_CONFIG: Record<CombinePlayType, { label: string; k: number; oddsDesc: string }> = {
  pair:   { label: '任二', k: 2, oddsDesc: '中獎機率較高' },
  triple: { label: '任三', k: 3, oddsDesc: '中獎機率中等' },
  quad:   { label: '任四', k: 4, oddsDesc: '中獎機率較低，獎金較高' },
};

// 八卦定義（共用）
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
export function getFiveElementNumbers(max: number): Record<string, number[]> {
  const base: Record<string, number[]> = { '水': [], '火': [], '木': [], '金': [], '土': [] };
  for (let i = 1; i <= max; i++) {
    const tail = i % 10;
    if (tail === 1 || tail === 6) base['水'].push(i);
    else if (tail === 2 || tail === 7) base['火'].push(i);
    else if (tail === 3 || tail === 8) base['木'].push(i);
    else if (tail === 4 || tail === 9) base['金'].push(i);
    else base['土'].push(i);
  }
  return base;
}

// 七彩種配置
export const LOTTERY_CONFIGS: Record<LotteryType, LotteryConfig> = {
  power: {
    id: 'power', name: '威力彩', nameEn: 'Power Lottery',
    themeColor: 'text-amber-400', themeBg: 'from-purple-950 via-gray-900 to-amber-950',
    mainMin: 1, mainMax: 38, mainCount: 6,
    hasSpecial: true, specialMin: 1, specialMax: 8, specialMode: 'separate',
    ticketPrice: 100, drawDays: ['週一', '週四'],
    defaultSumRange: [80, 180], zones: [10, 20, 30],
    primes: [2,3,5,7,11,13,17,19,23,29,31,37],
    category: 'lotto6',
  },
  lotto649: {
    id: 'lotto649', name: '大樂透', nameEn: 'Lotto 6/49',
    themeColor: 'text-blue-400', themeBg: 'from-blue-950 via-gray-900 to-cyan-950',
    mainMin: 1, mainMax: 49, mainCount: 6,
    hasSpecial: true, specialMin: 1, specialMax: 49, specialMode: 'same',
    ticketPrice: 50, drawDays: ['週二', '週五'],
    defaultSumRange: [100, 220], zones: [13, 25, 37],
    primes: [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47],
    category: 'lotto6',
  },
  daily539: {
    id: 'daily539', name: '今彩539', nameEn: 'Daily 539',
    themeColor: 'text-emerald-400', themeBg: 'from-emerald-950 via-gray-900 to-green-950',
    mainMin: 1, mainMax: 39, mainCount: 5,
    hasSpecial: false, specialMin: 1, specialMax: 1, specialMode: 'none',
    ticketPrice: 50, drawDays: ['週一','週二','週三','週四','週五','週六'],
    defaultSumRange: [60, 140], zones: [10, 20, 30],
    primes: [2,3,5,7,11,13,17,19,23,29,31,37],
    category: 'lotto6',
  },
  lotto49c: {
    id: 'lotto49c', name: '49樂合彩', nameEn: 'Lotto 49 Combine',
    themeColor: 'text-cyan-400', themeBg: 'from-cyan-950 via-gray-900 to-teal-950',
    mainMin: 1, mainMax: 49, mainCount: 6,
    hasSpecial: false, specialMin: 1, specialMax: 1, specialMode: 'none',
    ticketPrice: 25, drawDays: ['週二', '週五'],
    defaultSumRange: [0, 0], zones: [13, 25, 37],
    primes: [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47],
    category: 'combine', sourceType: 'lotto649',
    combinePlayTypes: ['pair', 'triple', 'quad'],
  },
  daily39c: {
    id: 'daily39c', name: '39樂合彩', nameEn: 'Daily 39 Combine',
    themeColor: 'text-rose-400', themeBg: 'from-rose-950 via-gray-900 to-pink-950',
    mainMin: 1, mainMax: 39, mainCount: 5,
    hasSpecial: false, specialMin: 1, specialMax: 1, specialMode: 'none',
    ticketPrice: 25, drawDays: ['週一','週二','週三','週四','週五','週六'],
    defaultSumRange: [0, 0], zones: [10, 20, 30],
    primes: [2,3,5,7,11,13,17,19,23,29,31,37],
    category: 'combine', sourceType: 'daily539',
    combinePlayTypes: ['pair', 'triple', 'quad'],
  },
  star3: {
    id: 'star3', name: '三星彩', nameEn: 'Star 3',
    themeColor: 'text-violet-400', themeBg: 'from-violet-950 via-gray-900 to-purple-950',
    mainMin: 0, mainMax: 9, mainCount: 3,
    hasSpecial: false, specialMin: 0, specialMax: 0, specialMode: 'none',
    ticketPrice: 25, drawDays: ['週一','週二','週三','週四','週五'],
    defaultSumRange: [0, 27], zones: [], primes: [],
    category: 'digit',
    digitPositions: ['百位', '十位', '個位'],
  },
  star4: {
    id: 'star4', name: '四星彩', nameEn: 'Star 4',
    themeColor: 'text-orange-400', themeBg: 'from-orange-950 via-gray-900 to-red-950',
    mainMin: 0, mainMax: 9, mainCount: 4,
    hasSpecial: false, specialMin: 0, specialMax: 0, specialMode: 'none',
    ticketPrice: 25, drawDays: ['週一','週二','週三','週四','週五'],
    defaultSumRange: [0, 36], zones: [], primes: [],
    category: 'digit',
    digitPositions: ['千位', '百位', '十位', '個位'],
  },
};

// 輔助函數
export function getConfig(type: LotteryType): LotteryConfig { return LOTTERY_CONFIGS[type]; }
export function getCategory(type: LotteryType): LotteryCategory { return LOTTERY_CATEGORIES[type]; }
export function isCombineType(type: LotteryType): boolean { return LOTTERY_CATEGORIES[type] === 'combine'; }
export function isDigitType(type: LotteryType): boolean { return LOTTERY_CATEGORIES[type] === 'digit'; }
export function getCombineSourceType(type: LotteryType): LotteryType | null { return COMBINE_SOURCE_MAP[type] || null; }
export function getAllNumbers(type: LotteryType): number[] {
  const c = getConfig(type);
  return Array.from({ length: c.mainMax - c.mainMin + 1 }, (_, i) => c.mainMin + i);
}
export function getStorageKey(type: LotteryType, suffix: string): string { return `lottery_${type}_${suffix}`; }
export function getMirrorPairs(max: number): Record<number, number> {
  const pairs: Record<number, number> = {};
  for (let i = 1; i <= Math.floor(max / 2); i++) { pairs[i] = max + 1 - i; pairs[max + 1 - i] = i; }
  return pairs;
}
export function normalizeToRange(value: number, min: number, max: number): number {
  if (value < min) return ((value - min) % (max - min + 1) + (max - min + 1)) % (max - min + 1) + min;
  if (value > max) return ((value - min) % (max - min + 1)) + min;
  return value;
}
export function getLotterySwitchTip(from: LotteryType, to: LotteryType): string {
  if (from === to) return '';
  const c = getConfig(to);
  return `已切換至${c.name}，範圍${c.mainMin}~${c.mainMax}選${c.mainCount}碼${c.hasSpecial ? (c.specialMode === 'separate' ? ' + 特別區' : ' + 特別號') : ''}`;
}
