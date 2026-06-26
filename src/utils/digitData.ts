// ============================================================
// V16 數位型歷史數據生成 - digitData.ts
// 三星彩 / 四星彩 共用
// ============================================================


import { loadDigitCache, saveDigitCache } from '@/repositories/businessDataStorage';

export interface DigitDraw {
  period: string;
  date: string;
  digits: number[];
}

// Seeded random for reproducibility
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

/** 生成三星彩數據 (2000期) */
export function generateStar3Data(): DigitDraw[] {
  const rng = seededRandom(20240601);
  const draws: DigitDraw[] = [];
  let date = new Date('2019-01-02');
  for (let i = 0; i < 2000; i++) {
    // Skip weekends (Sat=6, Sun=0)
    while (date.getDay() === 0 || date.getDay() === 6) { date.setDate(date.getDate() + 1); }
    
    draws.push({
      period: `S${String(i + 1).padStart(6, '0')}`,
      date: date.toISOString().split('T')[0],
      digits: [Math.floor(rng() * 10), Math.floor(rng() * 10), Math.floor(rng() * 10)],
    });
    date.setDate(date.getDate() + 1);
  }
  return draws;
}

/** 生成四星彩數據 (2000期) */
export function generateStar4Data(): DigitDraw[] {
  const rng = seededRandom(20240602);
  const draws: DigitDraw[] = [];
  let date = new Date('2019-01-02');
  
  for (let i = 0; i < 2000; i++) {
    draws.push({
      period: `F${String(i + 1).padStart(6, '0')}`,
      date: date.toISOString().split('T')[0],
      digits: [Math.floor(rng() * 10), Math.floor(rng() * 10), Math.floor(rng() * 10), Math.floor(rng() * 10)],
    });
    date.setDate(date.getDate() + 1);
  }
  return draws;
}

/** 獲取數位型數據 (帶 localStorage 緩存) */
export function getDigitData(type: 'star3' | 'star4'): DigitDraw[] {
  const cacheKey = type === 'star3' ? 'lottery-digit-data-star3' : 'lottery-digit-data-star4';
  const cached = loadDigitCache(cacheKey);
  if (cached) { try { return JSON.parse(cached); } catch { /* ignore */ } }
  
  const data = type === 'star3' ? generateStar3Data() : generateStar4Data();
  try { saveDigitCache(cacheKey, data); } catch { /* ignore */ }
  return data;
}

/** 取得近 N 期 */
export function getDigitRecent(type: 'star3' | 'star4', n: number): DigitDraw[] {
  return getDigitData(type).slice(-n);
}
