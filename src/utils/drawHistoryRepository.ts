// ============================================================
// V17.1: 開獎數據倉庫 (drawHistoryRepository.ts)
// 負責：localStorage 數據存取 + 多源適配
// ============================================================

import type { DrawRecord } from '@/types';
import type { LotteryType } from './lotteryConfig';
import { loadDrawHistoryRaw, saveDrawHistoryRaw, removeKey } from '@/repositories/businessDataStorage';

const STORAGE_KEYS: Record<string, string> = {
  power: 'lottery-v17-draws-power',
  lotto649: 'lottery-v17-draws-lotto649',
  daily539: 'lottery-v17-draws-daily539',
  lotto49c: 'lottery-v17-draws-lotto49c',
  daily39c: 'lottery-v17-draws-daily39c',
  star3: 'lottery-v17-draws-star3',
  star4: 'lottery-v17-draws-star4',
};

/** 載入指定彩種的歷史數據 */
export function loadDrawHistory(lotteryType: LotteryType): DrawRecord[] {
  const key = STORAGE_KEYS[lotteryType];
  if (!key) return [];
  try {
    const raw = loadDrawHistoryRaw(key);
    if (!raw) return [];
    return JSON.parse(raw) as DrawRecord[];
  } catch { return []; }
}

/** 保存指定彩種的歷史數據 */
export function saveDrawHistory(lotteryType: LotteryType, records: DrawRecord[]): void {
  const key = STORAGE_KEYS[lotteryType];
  if (!key) return;
  try { saveDrawHistoryRaw(key, records); }
  catch { /* storage full */ }
}

/** 清除指定彩種的數據 */
export function clearDrawHistory(lotteryType: LotteryType): void {
  const key = STORAGE_KEYS[lotteryType];
  if (key) removeKey(key);
}

/** 獲取數據統計 */
export function getHistoryStats(lotteryType: LotteryType): {
  count: number;
  firstPeriod: number;
  lastPeriod: number;
  firstDate: string;
  lastDate: string;
  numberRange: { min: number; max: number };
} {
  const records = loadDrawHistory(lotteryType);
  if (records.length === 0) {
    return { count: 0, firstPeriod: 0, lastPeriod: 0, firstDate: '', lastDate: '', numberRange: { min: 0, max: 0 } };
  }
  const allNums = records.flatMap(r => r.zone1);
  return {
    count: records.length,
    firstPeriod: records[0].period,
    lastPeriod: records[records.length - 1].period,
    firstDate: records[0].date,
    lastDate: records[records.length - 1].date,
    numberRange: { min: Math.min(...allNums), max: Math.max(...allNums) },
  };
}

/** 導出 CSV（台灣彩券格式） */
export function exportToCSV(lotteryType: LotteryType): string {
  const records = loadDrawHistory(lotteryType);
  const headers = ['期別', '開獎日', '號碼1', '號碼2', '號碼3', '號碼4', '號碼5', '號碼6', '特別號'];
  const rows = records.map(r => [String(r.period), r.date, ...r.zone1.map(String), String(r.zone2)]);
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/** 從 CSV 導入 */
export function importFromCSV(lotteryType: LotteryType, csv: string): number {
  const lines = csv.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return 0;
  const records: DrawRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 7) continue;
    const period = parseInt(cols[0]);
    const date = cols[1];
    const zone1 = cols.slice(2, cols.length - 1).map(Number).filter(n => !isNaN(n));
    const zone2 = Number(cols[cols.length - 1]) || 0;
    if (zone1.length > 0 && !isNaN(period)) {
      records.push({ date, period, zone1, zone2 });
    }
  }
  saveDrawHistory(lotteryType, records);
  return records.length;
}
