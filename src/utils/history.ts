// ============================================================
// 歷史開獎資料管理
// ============================================================

import type { DrawRecord } from '@/types';
import type { LotteryType } from './lotteryConfig';

import { loadPowerHistory, savePowerHistory, removeKey } from '@/repositories/businessDataStorage';

export const HISTORY_STORAGE_KEY = 'power-lottery-history';
export const JOURNAL_STORAGE_KEY = 'power-lottery-journal';

/** 解析 CSV 格式的歷史資料 */
export function parseHistoryCSV(csv: string): DrawRecord[] {
  const lines = csv.trim().split('\n');
  const records: DrawRecord[] = [];

  for (const line of lines) {
    const parts = line.split(/[,，\s\t]+/).filter(Boolean);
    if (parts.length < 8) continue;

    // 支援多種格式：日期,期數,n1,n2,n3,n4,n5,n6,z2
    const dateStr = parts[0];
    const period = parseInt(parts[1]) || 0;
    const nums = parts.slice(2, 8).map(Number).filter(n => n >= 1 && n <= 38);
    const z2 = Number(parts[8] || parts[7]);

    if (nums.length === 6 && z2 >= 1 && z2 <= 8) {
      records.push({ date: normalizeDate(dateStr), period, zone1: nums, zone2: z2 });
    }
  }

  return records.sort((a, b) => a.period - b.period);
}

/** 標準化日期格式 */
function normalizeDate(d: string): string {
  const m = d.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return d;
}

/** 從 localStorage 載入歷史資料 */
export function loadHistory(): DrawRecord[] {
  try {
    const raw = loadPowerHistory();
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

/** 儲存歷史資料到 localStorage */
export function saveHistory(records: DrawRecord[]) {
  try {
    savePowerHistory(records);
  } catch { /* ignore */ }
}

/** 清除歷史資料 */
export function clearHistory() {
  removeKey(HISTORY_STORAGE_KEY);
}

/** 取得近 N 期資料 */
export function getRecent(records: DrawRecord[], n: number): DrawRecord[] {
  return records.slice(-n);
}

/** 取得日期區間資料 */
export function getRange(records: DrawRecord[], start: string, end: string): DrawRecord[] {
  return records.filter(r => r.date >= start && r.date <= end);
}

/** 切分訓練/測試期 */
export function splitTrainTest(records: DrawRecord[], splitDate: string): { train: DrawRecord[]; test: DrawRecord[] } {
  const train = records.filter(r => r.date < splitDate);
  const test = records.filter(r => r.date >= splitDate);
  return { train, test };
}

/** 從訓練資料計算統計 */
export function calcStats(records: DrawRecord[]) {
  const allZone1: number[] = [];
  records.forEach(d => allZone1.push(...d.zone1));

  const freq1: Record<number, number> = {};
  allZone1.forEach(n => { freq1[n] = (freq1[n] || 0) + 1; });

  const recent = records.slice(-300);
  const freq300: Record<number, number> = {};
  recent.forEach(d => d.zone1.forEach(n => { freq300[n] = (freq300[n] || 0) + 1; }));

  const recent50 = records.slice(-50);
  const freq50: Record<number, number> = {};
  recent50.forEach(d => d.zone1.forEach(n => { freq50[n] = (freq50[n] || 0) + 1; }));

  const gaps: Record<number, number> = {};
  for (let n = 1; n <= 38; n++) {
    let found = false;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].zone1.includes(n)) { gaps[n] = records.length - 1 - i; found = true; break; }
    }
    if (!found) gaps[n] = records.length;
  }

  const tailFreq: Record<number, number> = {};
  allZone1.forEach(n => { const t = n % 10; tailFreq[t] = (tailFreq[t] || 0) + 1; });

  const consecFreq: Record<number, number> = {};
  records.forEach(d => {
    const sorted = [...d.zone1].sort((a, b) => a - b);
    for (let i = 0; i < 5; i++) {
      if (sorted[i + 1] - sorted[i] === 1) {
        consecFreq[sorted[i]] = (consecFreq[sorted[i]] || 0) + 1;
        consecFreq[sorted[i + 1]] = (consecFreq[sorted[i + 1]] || 0) + 1;
      }
    }
  });

  return { freq1, freq300, freq50, gaps, tailFreq, consecFreq, avgSum: 117 };
}

/** 檢查是否為真實資料 */
export function isRealData(records: DrawRecord[]): boolean {
  if (records.length < 10) return false;
  // 真實資料應該有合理的期數範圍
  const periods = records.map(r => r.period).filter(p => p > 100000000);
  return periods.length > records.length * 0.8;
}

/** 取得範例 CSV 格式說明 */
export function getCSVTemplate(): string {
  return `日期,期數,n1,n2,n3,n4,n5,n6,z2
2025-01-02,114000001,3,12,18,25,31,36,7
2025-01-06,114000002,5,9,14,22,29,34,2
2025-01-09,114000003,1,8,16,21,28,33,5`;
}

/** 載入/合併歷史資料到訓練期 */
export function loadOrDefaultHistory(): DrawRecord[] {
  const loaded = loadHistory();
  if (loaded.length > 0) return loaded;
  // 回退到內建模擬資料
  return generateMockHistory();
}

/** V16: 按彩种載入歷史資料（樂合彩復用源彩種數據） */
export function loadOrDefaultHistoryByType(_type: LotteryType): DrawRecord[] {
  return loadOrDefaultHistory();
}

import { generateHistoryData } from './lottery';

function generateMockHistory(): DrawRecord[] {
  return generateHistoryData();
}
