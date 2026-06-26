// ============================================================
// V16 數位型形態統計 - digitCategoryStats.ts
// 三星彩 AAA/AAB/ABC + 四星彩 豹子/對子/順子/雜六
// ============================================================

import type { DigitDraw } from './digitData';

// ============ 三星彩 ============
export type Star3Category = 'aaa' | 'aab' | 'abc';

export interface Star3CategoryStats {
  aaa: { count: number; ratio: number; deviation: number };
  aab: { count: number; ratio: number; deviation: number };
  abc: { count: number; ratio: number; deviation: number };
}

export const STAR3_THEORY: Record<Star3Category, number> = { aaa: 0.01, aab: 0.27, abc: 0.72 };

export function classifyStar3([a, b, c]: [number, number, number]): Star3Category {
  if (a === b && b === c) return 'aaa';
  if (a === b || b === c || a === c) return 'aab';
  return 'abc';
}

export function calcStar3CategoryStats(draws: DigitDraw[], periodCount: number): Star3CategoryStats {
  const recent = draws.slice(-periodCount);
  const total = recent.length;
  if (total === 0) return { aaa: { count: 0, ratio: 0, deviation: 0 }, aab: { count: 0, ratio: 0, deviation: 0 }, abc: { count: 0, ratio: 0, deviation: 0 } };
  
  const counts = { aaa: 0, aab: 0, abc: 0 };
  recent.forEach(d => { counts[classifyStar3(d.digits as [number, number, number])]++; });
  
  const r = (v: number) => Math.round(v * 1000) / 10;
  return {
    aaa: { count: counts.aaa, ratio: r(counts.aaa / total), deviation: r(counts.aaa / total - STAR3_THEORY.aaa) },
    aab: { count: counts.aab, ratio: r(counts.aab / total), deviation: r(counts.aab / total - STAR3_THEORY.aab) },
    abc: { count: counts.abc, ratio: r(counts.abc / total), deviation: r(counts.abc / total - STAR3_THEORY.abc) },
  };
}

// ============ 四星彩 ============
export type Star4Category = 'leopard' | 'pair' | 'straight' | 'mixed';

export interface Star4CategoryStats {
  leopard:  { count: number; ratio: number; deviation: number };
  pair:     { count: number; ratio: number; deviation: number };
  straight: { count: number; ratio: number; deviation: number };
  mixed:    { count: number; ratio: number; deviation: number };
}

export const STAR4_THEORY: Record<Star4Category, number> = { leopard: 0.001, pair: 0.432, straight: 0.024, mixed: 0.543 };

export function classifyStar4([a, b, c, d]: [number, number, number, number]): Star4Category {
  const digits = [a, b, c, d];
  const uniqueCount = new Set(digits).size;
  if (uniqueCount === 1) return 'leopard';
  
  const sorted = [...digits].sort((x, y) => x - y);
  const isNormalStraight = sorted.every((v, i) => i === 0 || v - sorted[i - 1] === 1);
  const isWrapStraight = JSON.stringify(sorted) === '[0,1,2,9]';
  if (isNormalStraight || isWrapStraight) return 'straight';
  
  if (uniqueCount <= 3) {
    const freq: Record<number, number> = {};
    digits.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    if (Math.max(...Object.values(freq)) >= 2) return 'pair';
  }
  return 'mixed';
}

export function calcStar4CategoryStats(draws: DigitDraw[], periodCount: number): Star4CategoryStats {
  const recent = draws.slice(-periodCount);
  const total = recent.length;
  if (total === 0) return { leopard: { count: 0, ratio: 0, deviation: 0 }, pair: { count: 0, ratio: 0, deviation: 0 }, straight: { count: 0, ratio: 0, deviation: 0 }, mixed: { count: 0, ratio: 0, deviation: 0 } };
  
  const counts = { leopard: 0, pair: 0, straight: 0, mixed: 0 };
  recent.forEach(d => { counts[classifyStar4(d.digits as [number, number, number, number])]++; });
  
  const r = (v: number) => Math.round(v * 1000) / 10;
  return {
    leopard:  { count: counts.leopard,  ratio: r(counts.leopard / total),  deviation: r(counts.leopard / total - STAR4_THEORY.leopard) },
    pair:     { count: counts.pair,     ratio: r(counts.pair / total),     deviation: r(counts.pair / total - STAR4_THEORY.pair) },
    straight: { count: counts.straight, ratio: r(counts.straight / total), deviation: r(counts.straight / total - STAR4_THEORY.straight) },
    mixed:    { count: counts.mixed,    ratio: r(counts.mixed / total),    deviation: r(counts.mixed / total - STAR4_THEORY.mixed) },
  };
}

// ============ 按位熱門排行 ============
export interface PositionRanking {
  position: string;
  rankings: { digit: number; count: number; ratio: number }[];
}

export function calcDigitPositionRanking(
  draws: DigitDraw[], periodCount: number
): PositionRanking[] {
  const recent = draws.slice(-periodCount);
  const positions = draws[0]?.digits.length === 4
    ? [{ name: '千位', idx: 0 }, { name: '百位', idx: 1 }, { name: '十位', idx: 2 }, { name: '個位', idx: 3 }]
    : [{ name: '百位', idx: 0 }, { name: '十位', idx: 1 }, { name: '個位', idx: 2 }];
  
  return positions.map(p => {
    const freq: Record<number, number> = {};
    for (let d = 0; d <= 9; d++) freq[d] = 0;
    recent.forEach(d => { if (d.digits[p.idx] !== undefined) freq[d.digits[p.idx]]++; });
    
    const rankings = Object.entries(freq)
      .map(([digit, count]) => ({ digit: parseInt(digit), count, ratio: Math.round((count / recent.length) * 1000) / 10 }))
      .sort((a, b) => b.count - a.count);
    
    return { position: p.name, rankings };
  });
}

// ============ 偏差等級 ============
export function getDeviationLevel(deviation: number, threshold = 2): 'hot' | 'cold' | 'normal' {
  if (deviation > threshold) return 'hot';
  if (deviation < -threshold) return 'cold';
  return 'normal';
}
