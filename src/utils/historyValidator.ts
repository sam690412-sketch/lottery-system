// ============================================================
// 歷史資料驗證與健康度檢查
// ============================================================

import type { DrawRecordV8 } from './dataSource';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface HealthReport {
  totalCount: number;
  earliestDate: string;
  latestDate: string;
  dataSource: string;
  missingMonths: string[];
  duplicatePeriods: number[];
  abnormalRecords: string[];
  sourceBreakdown: Record<string, number>;
  quality: '不足' | '可初步回測' | '可正式回測';
  canBacktest: boolean;
  warnings: string[];
}

/** 驗證單筆開獎資料 */
export function validateRecord(r: Partial<DrawRecordV8>): ValidationResult {
  const errors: string[] = [];

  if (!r.date) errors.push('缺少日期');
  else {
    const d = new Date(r.date);
    if (isNaN(d.getTime())) errors.push('日期格式無效');
    else if (d > new Date()) errors.push('日期不可為未來');
  }

  if (!r.period) errors.push('缺少期數');

  const nums = r.zone1 || [];
  if (nums.length !== 6) errors.push(`第一區必須6碼，實際${nums.length}碼`);
  else {
    if (nums.some(n => n < 1 || n > 38)) errors.push('第一區號碼必須在1~38之間');
    if (new Set(nums).size !== 6) errors.push('第一區號碼不可重複');
  }

  if (r.zone2 === undefined) errors.push('缺少第二區號碼');
  else if (r.zone2 < 1 || r.zone2 > 8) errors.push('第二區號碼必須在1~8之間');

  return { valid: errors.length === 0, errors };
}

/** 檢查全部資料健康度 */
export function checkHealth(records: DrawRecordV8[]): HealthReport {
  const warnings: string[] = [];
  const duplicatePeriods: number[] = [];
  const abnormalRecords: string[] = [];
  const seenPeriods = new Set<number>();

  records.forEach((r, i) => {
    const v = validateRecord(r);
    if (!v.valid) abnormalRecords.push(`#${i + 1} 期${r.period}: ${v.errors.join(', ')}`);

    if (seenPeriods.has(r.period)) duplicatePeriods.push(r.period);
    seenPeriods.add(r.period);
  });

  // 缺漏月份檢查
  const missingMonths = findMissingMonths(records);

  // 資料來源比例
  const sourceBreakdown: Record<string, number> = {};
  records.forEach(r => { sourceBreakdown[r.source] = (sourceBreakdown[r.source] || 0) + 1; });

  // 品質判定
  let quality: '不足' | '可初步回測' | '可正式回測' = '不足';
  if (records.length >= 800) quality = '可正式回測';
  else if (records.length >= 300) quality = '可初步回測';

  const canBacktest = records.length >= 50;

  if (records.some(r => r.source === 'sample')) warnings.push('資料中包含模擬資料，回測結果僅供測試');
  if (duplicatePeriods.length > 0) warnings.push(`發現 ${duplicatePeriods.length} 筆重複期數`);
  if (abnormalRecords.length > 0) warnings.push(`發現 ${abnormalRecords.length} 筆異常資料`);
  if (missingMonths.length > 0) warnings.push(`缺漏 ${missingMonths.length} 個月份資料`);

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalCount: records.length,
    earliestDate: sorted[0]?.date || '-',
    latestDate: sorted[sorted.length - 1]?.date || '-',
    dataSource: records.some(r => r.source === 'sample') ? 'sample' : records.some(r => r.source === 'manual') ? 'manual' : 'auto',
    missingMonths,
    duplicatePeriods: [...new Set(duplicatePeriods)],
    abnormalRecords: abnormalRecords.slice(0, 10),
    sourceBreakdown,
    quality,
    canBacktest,
    warnings,
  };
}

/** 找出缺漏的月份 */
function findMissingMonths(records: DrawRecordV8[]): string[] {
  if (records.length < 2) return [];
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const months = new Set<string>();
  sorted.forEach(r => {
    const d = new Date(r.date);
    months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  });

  const missing: string[] = [];
  const start = new Date(sorted[0].date);
  const end = new Date(sorted[sorted.length - 1].date);
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
    if (!months.has(key)) missing.push(key);
    cur.setMonth(cur.getMonth() + 1);
  }

  return missing;
}
