// ============================================================
// V18.2.8: 觀察池 V3 - observationPoolV3.ts
// must_include / must_exclude / high / medium / low
// localStorage 操作已遷移到 businessDataStorage.ts
// ============================================================

import type { LotteryType } from './lotteryConfig';
import * as bizStorage from '@/repositories/businessDataStorage';

export type ObserveMode = 'must_include' | 'must_exclude' | 'high' | 'medium' | 'low';

export interface ObserveItem {
  number: number;
  mode: ObserveMode;
  source: string;
  createdAt: string;
}

export interface ObservePoolV3 {
  lotteryType: LotteryType;
  items: ObserveItem[];
  updatedAt: string;
}

const MODE_SCORES: Record<ObserveMode, number> = {
  must_include: 0,   // 不在評分中使用，在組合生成中強制包含
  must_exclude: 0,   // 不在評分中使用，在組合生成中排除
  high: 35,          // 高權重
  medium: 20,        // 中權重
  low: 10,           // 低權重
};

function getKey(lotteryType: LotteryType, userId?: string): string {
  return bizStorage.buildPoolV3Key(lotteryType, userId);
}

/** 獲取觀察池 */
export function getPool(lotteryType: LotteryType, userId?: string): ObservePoolV3 {
  try {
    const raw = bizStorage.loadObservationPoolV3(getKey(lotteryType, userId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { lotteryType, items: [], updatedAt: new Date().toISOString() };
}

/** 保存觀察池 */
function savePool(pool: ObservePoolV3, userId?: string): void {
  pool.updatedAt = new Date().toISOString();
  bizStorage.saveObservationPoolV3(getKey(pool.lotteryType, userId), pool);
}

/** 添加/更新觀察項 */
export function setItem(
  lotteryType: LotteryType,
  number: number,
  mode: ObserveMode,
  userId?: string,
  source: string = 'manual'
): ObservePoolV3 {
  const pool = getPool(lotteryType, userId);
  // 移除同號碼的舊項目
  pool.items = pool.items.filter(i => i.number !== number);
  // 添加新項目
  pool.items.push({ number, mode, source, createdAt: new Date().toISOString() });
  savePool(pool, userId);
  return pool;
}

/** 移除觀察項 */
export function removeItem(lotteryType: LotteryType, number: number, userId?: string): ObservePoolV3 {
  const pool = getPool(lotteryType, userId);
  pool.items = pool.items.filter(i => i.number !== number);
  savePool(pool, userId);
  return pool;
}

/** 清空觀察池 */
export function clearPool(lotteryType: LotteryType, userId?: string): void {
  savePool({ lotteryType, items: [], updatedAt: new Date().toISOString() }, userId);
}

/** 獲取 must_include 號碼列表 */
export function getMustInclude(lotteryType: LotteryType, userId?: string): number[] {
  return getPool(lotteryType, userId).items.filter(i => i.mode === 'must_include').map(i => i.number);
}

/** 獲取 must_exclude 號碼列表 */
export function getMustExclude(lotteryType: LotteryType, userId?: string): number[] {
  return getPool(lotteryType, userId).items.filter(i => i.mode === 'must_exclude').map(i => i.number);
}

/** 獲取權重分數 (high/medium/low → score) */
export function getWeightScores(lotteryType: LotteryType, userId?: string): Record<number, number> {
  const pool = getPool(lotteryType, userId);
  const scores: Record<number, number> = {};
  for (const item of pool.items) {
    if (item.mode === 'high' || item.mode === 'medium' || item.mode === 'low') {
      scores[item.number] = MODE_SCORES[item.mode];
    }
  }
  return scores;
}

/** 獲取所有項 */
export function getAllItems(lotteryType: LotteryType, userId?: string): ObserveItem[] {
  return getPool(lotteryType, userId).items;
}

/** 統計 */
export function getStats(lotteryType: LotteryType, userId?: string) {
  const items = getAllItems(lotteryType, userId);
  return {
    total: items.length,
    mustInclude: items.filter(i => i.mode === 'must_include').length,
    mustExclude: items.filter(i => i.mode === 'must_exclude').length,
    high: items.filter(i => i.mode === 'high').length,
    medium: items.filter(i => i.mode === 'medium').length,
    low: items.filter(i => i.mode === 'low').length,
  };
}

/** 從 V2 遷移 */
export function migrateFromV2(lotteryType: LotteryType, userId?: string): void {
  try {
    const v2Raw = bizStorage.loadObservationPoolV2();
    if (!v2Raw) return;
    const v2Items = JSON.parse(v2Raw);
    if (!Array.isArray(v2Items)) return;
    for (const item of v2Items) {
      if (item.number >= 1 && item.number <= 49) {
        const mode: ObserveMode = item.weight >= 3 ? 'high' : item.weight >= 2 ? 'medium' : 'low';
        setItem(lotteryType, item.number, mode, userId, 'migrated');
      }
    }
  } catch { /* ignore */ }
}
