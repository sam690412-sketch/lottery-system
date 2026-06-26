// ============================================================
// 資料來源管理 - 三種模式：手動CSV / 半自動 / API預留
// ============================================================

import type { DrawRecord } from '@/types';
import { generateHistoryData } from './lottery';
import {
  loadDataSourceV8, saveDataSourceV8, loadDataSourceMeta, saveDataSourceMeta,
  loadPersonalSources, savePersonalSources, loadPowerLotteryJournal, savePowerLotteryJournal,
  removeKey,
} from '@/repositories/businessDataStorage';

export type DataSource = 'sample' | 'manual' | 'auto';

export interface DrawRecordV8 extends DrawRecord {
  source: DataSource;
  verified: boolean;
  importedAt: string;
}

const STORAGE_KEY_V8 = 'power-lottery-data-v8';
const STORAGE_META = 'power-lottery-meta';

export interface DataMeta {
  source: DataSource;
  totalCount: number;
  earliestDate: string;
  latestDate: string;
  lastUpdated: string;
  manualCount: number;
  autoCount: number;
  sampleCount: number;
}

/** 載入資料 */
export function loadDataV8(): DrawRecordV8[] {
  try {
    const raw = loadDataSourceV8();
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // 回退：載入舊格式或生成範例
  return loadLegacyOrSample();
}

/** 儲存資料 */
export function saveDataV8(records: DrawRecordV8[]) {
  try {
    saveDataSourceV8(records);
    updateMeta(records);
  } catch { /* ignore */ }
}

/** 取得資料來源狀態 */
export function getDataSource(): DataSource {
  try {
    const meta = JSON.parse(loadDataSourceMeta() || '{}');
    return meta.source || 'sample';
  } catch { return 'sample'; }
}

/** 更新 meta */
export function updateMeta(records: DrawRecordV8[]) {
  if (records.length === 0) {
    saveDataSourceMeta({ source: 'sample', totalCount: 0, lastUpdated: new Date().toISOString() });
    return;
  }
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const source: DataSource = records.some(r => r.source === 'manual') ? 'manual' : records.some(r => r.source === 'auto') ? 'auto' : 'sample';
  const meta: DataMeta = {
    source,
    totalCount: records.length,
    earliestDate: sorted[0].date,
    latestDate: sorted[sorted.length - 1].date,
    lastUpdated: new Date().toISOString(),
    manualCount: records.filter(r => r.source === 'manual').length,
    autoCount: records.filter(r => r.source === 'auto').length,
    sampleCount: records.filter(r => r.source === 'sample').length,
  };
  saveDataSourceMeta(meta);
}

/** 取得 meta */
export function getMeta(): DataMeta | null {
  try { return JSON.parse(loadDataSourceMeta() || 'null'); }
  catch { return null; }
}

/** 載入舊格式或產生範例 */
function loadLegacyOrSample(): DrawRecordV8[] {
  // 嘗試載入舊格式
  try {
    const old = loadDataSourceV8();
    if (old) {
      const records: DrawRecord[] = JSON.parse(old);
      return records.map(r => ({ ...r, source: 'manual' as DataSource, verified: true, importedAt: new Date().toISOString() }));
    }
  } catch { /* ignore */ }
  // 產生範例資料
  return generateSampleData();
}

/** 產生範例資料 (標記為 sample) */
function generateSampleData(): DrawRecordV8[] {
  const records: DrawRecord[] = generateHistoryData();
  return records.map(r => ({ ...r, source: 'sample' as DataSource, verified: false, importedAt: new Date().toISOString() }));
}

/** 清除全部資料 */
export function clearAllData() {
  removeKey(STORAGE_KEY_V8);
  removeKey(STORAGE_META);
  removeKey('power-lottery-history');
}

/** 新增單期資料 */
export function addSingleDraw(records: DrawRecordV8[], newDraw: DrawRecordV8): { success: boolean; message: string; data: DrawRecordV8[] } {
  // 檢查重複期數
  const existing = records.find(r => r.period === newDraw.period);
  if (existing) {
    return { success: false, message: `期數 ${newDraw.period} 已存在（日期：${existing.date}），請先刪除舊資料`, data: records };
  }
  const updated = [...records, newDraw].sort((a, b) => a.period - b.period);
  saveDataV8(updated);
  return { success: true, message: `成功新增第 ${newDraw.period} 期`, data: updated };
}

/** API 預留介面 */
export async function fetchLatestDraw(): Promise<{ success: boolean; data?: DrawRecordV8; message: string }> {
  return {
    success: false,
    message: '目前未串接官方資料來源。台灣彩券未提供公開API，請使用「手動新增最新一期」功能。',
  };
}

/** 匯出CSV */
export function exportToCSV(records: DrawRecordV8[]): string {
  const headers = ['日期', '期數', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'z2', '來源', '驗證'];
  const rows = records.map(r => [r.date, r.period, ...r.zone1, r.zone2, r.source, r.verified ? '是' : '否']);
  return [headers, ...rows].map(r => r.join(',')).join('\n');
}

/** 匯出JSON備份 */
export function exportBackup(): string {
  const data = loadDataV8();
  const meta = getMeta();
  const sources = JSON.parse(loadPersonalSources() || '[]');
  const journal = JSON.parse(loadPowerLotteryJournal() || '[]');
  return JSON.stringify({ version: 'v8', exportedAt: new Date().toISOString(), meta, data, sources, journal }, null, 2);
}

/** 匯入JSON備份 */
export function importBackup(json: string): boolean {
  try {
    const backup = JSON.parse(json);
    if (backup.data) {
      saveDataV8(backup.data);
      if (backup.sources) savePersonalSources(backup.sources);
      if (backup.journal) savePowerLotteryJournal(backup.journal);
      return true;
    }
    return false;
  } catch { return false; }
}

/** 取得資料來源中文名稱 */
export function sourceLabel(source: DataSource): string {
  return { sample: '模擬資料', manual: '手動匯入', auto: '自動更新' }[source] || '未知';
}

/** 取得資料來源顏色 */
export function sourceColor(source: DataSource): string {
  return { sample: 'text-orange-400 bg-orange-900/20 border-orange-700/30', manual: 'text-blue-400 bg-blue-900/20 border-blue-700/30', auto: 'text-green-400 bg-green-900/20 border-green-700/30' }[source] || '';
}


