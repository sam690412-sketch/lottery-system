// ============================================================
// V18.2.8: 統計觀察池 - 四級權重系統
// localStorage 操作已遷移到 businessDataStorage.ts
// ============================================================

import * as bizStorage from '@/repositories/businessDataStorage';

export type ObservationWeight = 1 | 2 | 3 | 4; // 低/中/高/超高

export interface ObservationEntry {
  number: number;
  weight: ObservationWeight;
}

const WEIGHT_LABELS: Record<ObservationWeight, string> = {
  1: '低權重', 2: '中權重', 3: '高權重', 4: '超高權重',
};

const WEIGHT_SCORES: Record<ObservationWeight, number> = {
  1: 8, 2: 20, 3: 35, 4: 55,
};

export function getWeightLabel(w: ObservationWeight): string { return WEIGHT_LABELS[w]; }
export function getWeightScore(w: ObservationWeight): number { return WEIGHT_SCORES[w]; }

/** 取得觀察池 */
export function getObservationPool(): ObservationEntry[] {
  try {
    const raw = bizStorage.loadObservationPoolV2();
    if (!raw) return [];
    return JSON.parse(raw) as ObservationEntry[];
  } catch { return []; }
}

/** 加入號碼到觀察池（指定權重） */
export function addToObservationPool(num: number, weight: ObservationWeight = 2): boolean {
  const pool = getObservationPool().filter(e => e.number !== num);
  pool.push({ number: num, weight });
  bizStorage.saveObservationPoolV2(pool);
  return true;
}

/** 更新號碼權重 */
export function updateObservationWeight(num: number, weight: ObservationWeight): void {
  const pool = getObservationPool();
  const entry = pool.find(e => e.number === num);
  if (entry) { entry.weight = weight; bizStorage.saveObservationPoolV2(pool); }
}

/** 從觀察池移除 */
export function removeFromObservationPool(num: number): void {
  const pool = getObservationPool().filter(e => e.number !== num);
  bizStorage.saveObservationPoolV2(pool);
}

/** 清除觀察池 */
export function clearObservationPool(): void { bizStorage.removeObservationPoolV2(); }

/** 是否已在觀察池中 */
export function isInObservationPool(num: number): boolean {
  return getObservationPool().some(e => e.number === num);
}

/** 取得號碼的觀察權重 */
export function getObservationWeight(num: number): ObservationWeight | null {
  const entry = getObservationPool().find(e => e.number === num);
  return entry?.weight || null;
}

/** 觀察池數量 */
export function getObservationCount(): number { return getObservationPool().length; }

/** 轉換為 scoring 用的權重表 */
export function getObservationWeights(): Record<number, number> {
  const weights: Record<number, number> = {};
  getObservationPool().forEach(e => {
    weights[e.number] = getWeightScore(e.weight);
  });
  return weights;
}
