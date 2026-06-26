// ============================================================
// V14.0 歷史開獎資料 - 三彩種大量模擬資料
// 威力彩 1,200 期 / 大樂透 1,500 期 / 今彩539 2,000 期
//
// ⚠️ 目前為模擬測試資料，僅供功能驗證
// 真實資料需由使用者手動匯入 CSV
// ============================================================

import type { LotteryType } from '@/utils/lotteryConfig';
import { loadJson, saveJson, removeKey } from '@/repositories/businessDataStorage';

const STORAGE_KEYS: Record<LotteryType, string> = {
  power: 'lottery-real-data-power',
  lotto649: 'lottery-real-data-lotto649',
  daily539: 'lottery-real-data-daily539',
  lotto49c: 'lottery-real-data-lotto49c',
  daily39c: 'lottery-real-data-daily39c',
  star3: 'lottery-real-data-star3',
  star4: 'lottery-real-data-star4',
};

// ===== 資料來源標記 =====
export type DataSource = 'real' | 'manual' | 'simulated';

export interface DataSourceInfo {
  source: DataSource;
  label: string;
  warning: string;
}

export function getDataSourceInfo(): DataSourceInfo {
  const hasReal = Object.values(STORAGE_KEYS).some(k => !!loadJson(k, null));
  if (hasReal) {
    return { source: 'real', label: '使用者匯入資料', warning: '' };
  }
  return {
    source: 'simulated',
    label: '模擬測試資料',
    warning: '目前使用模擬測試資料，僅供功能驗證，不可作為真實選號依據。',
  };
}

// ===== 歷史開獎資料結構 =====
export interface HistoricalDraw {
  period: string;
  date: string;
  mainNumbers: number[];
  specialNumber?: number;
}

// ===== 確定性種子亂數產生器 =====
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// ===== 威力彩：1~38 選6碼 + 第二區 1~8 =====
function generatePowerData(): HistoricalDraw[] {
  const rng = seededRandom(20240101);
  const draws: HistoricalDraw[] = [];
  // 從 2019-01-03 開始（週四），每週一、四開獎
  const startDate = new Date(2019, 0, 3);
  const dayOffsets: number[] = [];
  let d = 0;
  while (dayOffsets.length < 1200) {
    const dt = new Date(startDate);
    dt.setDate(dt.getDate() + d);
    const wd = dt.getDay();
    if (wd === 1 || wd === 4) dayOffsets.push(d);
    d++;
  }

  for (let i = 0; i < 1200; i++) {
    const nums = new Set<number>();
    while (nums.size < 6) nums.add(Math.floor(rng() * 38) + 1);
    const dt = new Date(startDate);
    dt.setDate(dt.getDate() + dayOffsets[i]);
    draws.push({
      period: `108000${String(i + 1).padStart(4, '0')}`,
      date: dt.toISOString().split('T')[0],
      mainNumbers: [...nums].sort((a, b) => a - b),
      specialNumber: Math.floor(rng() * 8) + 1,
    });
  }
  return draws;
}

// ===== 大樂透：1~49 選6碼 + 特別號 1~49（不與主號重複）=====
function generateLotto649Data(): HistoricalDraw[] {
  const rng = seededRandom(20240215);
  const draws: HistoricalDraw[] = [];
  const startDate = new Date(2019, 0, 4);
  const dayOffsets: number[] = [];
  let d = 0;
  while (dayOffsets.length < 1500) {
    const dt = new Date(startDate);
    dt.setDate(dt.getDate() + d);
    const wd = dt.getDay();
    if (wd === 2 || wd === 5) dayOffsets.push(d);
    d++;
  }

  for (let i = 0; i < 1500; i++) {
    const nums = new Set<number>();
    while (nums.size < 7) nums.add(Math.floor(rng() * 49) + 1);
    const arr = [...nums];
    const special = arr.pop()!;
    const dt = new Date(startDate);
    dt.setDate(dt.getDate() + dayOffsets[i]);
    draws.push({
      period: `109000${String(i + 1).padStart(4, '0')}`,
      date: dt.toISOString().split('T')[0],
      mainNumbers: arr.sort((a, b) => a - b),
      specialNumber: special,
    });
  }
  return draws;
}

// ===== 今彩539：1~39 選5碼 =====
function generateDaily539Data(): HistoricalDraw[] {
  const rng = seededRandom(20240308);
  const draws: HistoricalDraw[] = [];
  const startDate = new Date(2019, 0, 2);
  let count = 0;
  let d = 0;

  while (count < 2000) {
    const dt = new Date(startDate);
    dt.setDate(dt.getDate() + d);
    const wd = dt.getDay();
    // 週一至週六開獎
    if (wd >= 1 && wd <= 6) {
      const nums = new Set<number>();
      while (nums.size < 5) nums.add(Math.floor(rng() * 39) + 1);
      draws.push({
        period: `E${String(count + 1).padStart(6, '0')}`,
        date: dt.toISOString().split('T')[0],
        mainNumbers: [...nums].sort((a, b) => a - b),
      });
      count++;
    }
    d++;
  }
  return draws;
}

// ===== 快取 =====
const CACHE: Partial<Record<LotteryType, HistoricalDraw[]>> = {};

/** 產生模擬資料（僅在未快取時呼叫一次） */
function generateForType(type: LotteryType): HistoricalDraw[] {
  if (type === 'power') return generatePowerData();
  if (type === 'lotto649') return generateLotto649Data();
  return generateDaily539Data();
}

/** 優先順序：使用者匯入 > localStorage > 模擬資料 */
export function getHistoricalData(type: LotteryType): HistoricalDraw[] {
  // 1. 檢查使用者是否匯入真實資料 (localStorage)
  const stored = loadJson(STORAGE_KEYS[type], null);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as HistoricalDraw[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // 解析失敗，使用模擬資料
    }
  }
  // 2. 使用系統內建模擬資料
  if (!CACHE[type]) {
    CACHE[type] = generateForType(type);
  }
  return CACHE[type]!;
}

/** 取得期數 */
export function getHistoricalCount(type: LotteryType): number {
  return getHistoricalData(type).length;
}

/** 取得指定範圍資料 */
export function getRecentDraws(type: LotteryType, count: number): HistoricalDraw[] {
  const all = getHistoricalData(type);
  return all.slice(-Math.min(count, all.length));
}

/** 取得最後 N 期資料 */
export function getLastNDraws(type: LotteryType, n: number): HistoricalDraw[] {
  const all = getHistoricalData(type);
  return all.slice(-Math.min(n, all.length));
}

// ===== 彩種設定 =====
export function getMaxNumber(type: LotteryType): number {
  if (type === 'power') return 38;
  if (type === 'lotto649') return 49;
  return 39;
}

export function getPickCount(type: LotteryType): number {
  if (type === 'daily539') return 5;
  return 6;
}

export function getBigSmallThreshold(type: LotteryType): number {
  if (type === 'power') return 20;
  if (type === 'lotto649') return 25;
  return 20;
}

/** 匯入真實資料 */
export function importRealData(type: LotteryType, data: HistoricalDraw[]): void {
  saveJson(STORAGE_KEYS[type], data);
  // 清除快取，下次讀取會優先使用真實資料
  delete CACHE[type];
}

/** 清除使用者匯入的資料，恢復模擬資料 */
export function clearRealData(type: LotteryType): void {
  removeKey(STORAGE_KEYS[type]);
  delete CACHE[type];
}

/** 三彩種預期期數（給統計頁顯示參考） */
export function getExpectedCount(type: LotteryType): number {
  if (type === 'power') return 1200;
  if (type === 'lotto649') return 1500;
  return 2000;
}
