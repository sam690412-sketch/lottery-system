import { getConfig, type LotteryType } from '@/utils/lotteryConfig';
import { calcFrequency, calcMissingRank } from '@/utils/statistics';
import type { HistoricalDraw } from '@/data/historicalData';

export const CONDITIONS = [
  { id: 'hot', icon: '📊', label: '歷史熱門強勢' },
  { id: 'missing', icon: '🔥', label: '遺漏逼牌（冷極反彈）' },
  { id: 'dream', icon: '🌙', label: '夢境靈感號碼' },
  { id: 'personal', icon: '🔮', label: '生日與命理幸運數' },
  { id: 'saved', icon: '⭐', label: '我的收藏養號' },
  { id: 'manual', icon: '🎯', label: '手動自選膽碼／殺號' },
] as const;

export type ConditionId = typeof CONDITIONS[number]['id'];
export type ConditionNumbers = Record<ConditionId, ReadonlySet<number>>;

export interface NumberObservation {
  number: number;
  count: number;
  missing: number | null;
}

export interface OverlayNumber extends NumberObservation {
  matches: ConditionId[];
  excluded: boolean;
}

export function parseOverlayNumbers(input: string, game: LotteryType) {
  const { mainMin, mainMax } = getConfig(game);
  const values = new Set<number>();
  const invalid: string[] = [];
  for (const token of input.trim().split(/[\s,，、]+/).filter(Boolean)) {
    const number = Number(token);
    if (/^\d+$/.test(token) && number >= mainMin && number <= mainMax) values.add(number);
    else invalid.push(token);
  }
  return { values: [...values], invalid };
}

export function getNumberObservations(draws: HistoricalDraw[], game: LotteryType): NumberObservation[] {
  const { mainMin, mainMax } = getConfig(game);
  const counts = calcFrequency(draws, mainMax);
  const missing = new Map(calcMissingRank(draws, mainMax, mainMax).map(item => [item.number, item.missingPeriods]));
  return Array.from({ length: mainMax - mainMin + 1 }, (_, index) => {
    const number = mainMin + index;
    return { number, count: counts[number] ?? 0, missing: draws.length ? missing.get(number) ?? null : null };
  });
}

export function overlayObservations(observations: NumberObservation[], enabled: ReadonlySet<ConditionId>,
  numbers: ConditionNumbers, exclusions: ReadonlySet<number>): OverlayNumber[] {
  return observations.map(observation => ({
    ...observation,
    matches: CONDITIONS.filter(condition => enabled.has(condition.id) && numbers[condition.id].has(observation.number))
      .map(condition => condition.id),
    excluded: enabled.has('manual') && exclusions.has(observation.number),
  }));
}

export function makeSumBins(draws: HistoricalDraw[]) {
  if (!draws.length) return [];
  const sums = draws.map(draw => draw.mainNumbers.reduce((total, number) => total + number, 0));
  const min = Math.min(...sums);
  const max = Math.max(...sums);
  const width = Math.max(1, Math.ceil((max - min + 1) / 10));
  const bins = Array.from({ length: Math.floor((max - min) / width) + 1 }, (_, index) => ({
    low: min + index * width,
    high: Math.min(max, min + (index + 1) * width - 1),
    count: 0,
  }));
  for (const sum of sums) bins[Math.floor((sum - min) / width)].count += 1;
  return bins;
}
