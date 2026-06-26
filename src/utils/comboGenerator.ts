// ============================================================
// V9 多組產出引擎 - 帶5層降級邏輯
// 選2組就必須產出2組，選3組就必須產出3組
// ============================================================

import type { LotteryType } from './lotteryConfig';
import { getConfig } from './lotteryConfig';
import type { NumberScore } from '@/types';

export interface ComboGenerationLog {
  level: number;
  rule: string;
  relaxation: string;
}

export interface GeneratedCombo {
  id: string;
  name: string;
  zone1: number[];
  zone2: number;
  score: number;
  reason: string;
  riskWarning: string;
  style: string;
  relaxationLog?: ComboGenerationLog[];
}

/** V16.3: 主產出函數 - 保證產出指定組數（含 must_include / must_exclude） */
export function generateCombos(
  type: LotteryType,
  scores: NumberScore[],
  userZone1: number[],
  strategy: string,
  comboCount: number,
  enableHex: boolean,
  mustInclude: number[] = [],
  mustExclude: number[] = [],
): { combos: GeneratedCombo[]; logs: string[]; warnings?: string[] } {
  const c = getConfig(type);
  const logs: string[] = [];
  const warnings: string[] = [];

  // V16.3: 處理 must_include / must_exclude 衝突
  const resolvedInclude = mustInclude.filter(n => {
    if (mustExclude.includes(n)) {
      warnings.push(`號碼 ${String(n).padStart(2, '0')} 同時被強制保留與排除，已依排除優先處理`);
      return false;
    }
    return true;
  });

  // V16.3: 檢查 must_include 數量是否超過主區可選數
  if (resolvedInclude.length > c.mainCount) {
    return {
      combos: [],
      logs: [],
      warnings: [`強制保留號碼數量(${resolvedInclude.length})超過本彩種主區可選數量(${c.mainCount})`],
    };
  }

  // 從最高分開始選池（排除 must_exclude）
  const sortedA = scores.filter(s => s.grade === 'A' && !mustExclude.includes(s.number)).sort((a, b) => b.total - a.total);
  const sortedB = scores.filter(s => s.grade === 'B' && !mustExclude.includes(s.number)).sort((a, b) => b.total - a.total);
  const sortedC = scores.filter(s => s.grade === 'C' && !mustExclude.includes(s.number)).sort((a, b) => b.total - a.total);
  const sortedAll = scores.filter(s => !mustExclude.includes(s.number)).sort((a, b) => b.total - a.total);

  // 養號保留數
  const keepCount = strategy === '保守' ? c.mainCount - 1 : strategy === '平衡' ? 2 : 1;
  let kept = [...userZone1].sort((a, b) => {
    const sa = scores.find(s => s.number === a)?.total || 0;
    const sb = scores.find(s => s.number === b)?.total || 0;
    return sb - sa;
  }).slice(0, keepCount);

  // V16.3: must_include 強制加入保留列表
  for (const n of resolvedInclude) {
    if (!kept.includes(n)) {
      // 如果已滿，移除最低分的養號
      if (kept.length >= keepCount + resolvedInclude.length - 1) {
        kept.pop();
      }
      kept.push(n);
    }
  }

  const combos: GeneratedCombo[] = [];
  const usedSets = new Set<string>();

  // 嘗試5層降級產出
  for (let level = 1; level <= 5; level++) {
    if (combos.length >= comboCount) break;

    const remaining = comboCount - combos.length;
    const levelCombos = tryLevel(
      level, c, scores, sortedA, sortedB, sortedC, sortedAll,
      kept, userZone1, remaining, usedSets, strategy, enableHex, combos.length,
      resolvedInclude, mustExclude
    );

    levelCombos.forEach(combo => {
      const key = combo.zone1.join(',');
      if (!usedSets.has(key)) {
        usedSets.add(key);
        combos.push(combo);
      }
    });

    if (levelCombos.length > 0 && level > 1) {
      logs.push(`第${level}層降級產出 ${levelCombos.length} 組：${getLevelName(level)}`);
    }
  }

  // 最終保險：隨機變體補足
  while (combos.length < comboCount) {
    const base = combos.length > 0 ? combos[0].zone1 : sortedAll.slice(0, c.mainCount).map(s => s.number);
    // V16.3: 變體也必須包含 must_include
    let variant = generateVariant(base, sortedAll.map(s => s.number), c.mainCount, combos.length);
    for (const n of resolvedInclude) {
      if (!variant.includes(n)) {
        // 替換一個非 must_include 的號碼
        const replaceIdx = variant.findIndex(v => !resolvedInclude.includes(v));
        if (replaceIdx >= 0) variant[replaceIdx] = n;
      }
    }
    variant = [...new Set(variant)].sort((a, b) => a - b);

    const key = variant.join(',');
    if (!usedSets.has(key)) {
      usedSets.add(key);
      const score = Math.round(variant.reduce((a, n) => a + (scores.find(s => s.number === n)?.total || 50), 0) / variant.length);
      combos.push({
        id: `c${combos.length + 1}`,
        name: `${strategy}${combos.length + 1}`,
        zone1: variant,
        zone2: pickZone2(type, scores, combos.length),
        score,
        reason: `變體組合（條件放寬）`,
        riskWarning: strategy === '進取' ? '高風險' : '中等風險',
        style: strategy,
        relaxationLog: [{ level: 5, rule: '變體產出', relaxation: '基於最佳組合微調' }],
      });
      logs.push(`變體補足第${combos.length}組`);
    }
  }

  return { combos: combos.slice(0, comboCount), logs, warnings: warnings.length > 0 ? warnings : undefined };
}

/** V16.3: 5層產出嘗試（含 must_include / must_exclude） */
function tryLevel(
  level: number,
  c: ReturnType<typeof getConfig>,
  scores: NumberScore[],
  sortedA: NumberScore[],
  sortedB: NumberScore[],
  sortedC: NumberScore[],
  sortedAll: NumberScore[],
  kept: number[],
  _userZone1: number[],
  needCount: number,
  usedSets: Set<string>,
  strategy: string,
  _enableHex: boolean,
  startIndex: number,
  mustInclude: number[] = [],
  mustExclude: number[] = [],
): GeneratedCombo[] {
  const combos: GeneratedCombo[] = [];

  // 根據層級決定可用池
  let pool: number[];
  let sumRange: [number, number];
  let minABRatio = 0.5;

  switch (level) {
    case 1: // 完整規則
      pool = [...sortedA, ...sortedB].map(s => s.number);
      sumRange = c.defaultSumRange;
      minABRatio = 0.5;
      break;
    case 2: // 放寬和值
      pool = [...sortedA, ...sortedB].map(s => s.number);
      sumRange = [c.defaultSumRange[0] - 20, c.defaultSumRange[1] + 20];
      minABRatio = 0.4;
      break;
    case 3: // 放寬A/B級比例
      pool = [...sortedA, ...sortedB, ...sortedC.slice(0, 5)].map(s => s.number);
      sumRange = [c.defaultSumRange[0] - 30, c.defaultSumRange[1] + 30];
      minABRatio = 0.3;
      break;
    case 4: // 允許C級補位
      pool = [...sortedA, ...sortedB, ...sortedC].map(s => s.number);
      sumRange = [c.defaultSumRange[0] - 40, c.defaultSumRange[1] + 40];
      minABRatio = 0.2;
      break;
    case 5: // 用最高分號碼
      pool = sortedAll.map(s => s.number);
      sumRange = [0, 999];
      minABRatio = 0;
      break;
    default:
      return [];
  }

  // 去重且過濾養號和 must_include（must_include 單獨處理）
  pool = [...new Set(pool)].filter(n => !kept.includes(n) && !mustInclude.includes(n));

  for (let i = 0; i < needCount * 3 && combos.length < needCount; i++) {
    // V16.3: 計算需要從 pool 選的數量 = 總數 - 養號 - must_include
    const needed = c.mainCount - kept.length - mustInclude.length;

    // 從pool選needed個，帶點隨機性
    const pick: number[] = [];
    const available = [...pool];
    const offset = i; // 偏移確保不同組

    for (let j = 0; j < needed && available.length > 0; j++) {
      const idx = Math.min((j + offset) % available.length, available.length - 1);
      pick.push(available[idx]);
      available.splice(idx, 1);
    }

    // V16.3: zone1 = 養號 + must_include + 從 pool 選的
    const zone1 = [...new Set([...kept, ...mustInclude, ...pick])].sort((a, b) => a - b);

    // 補足（排除 must_exclude）
    while (zone1.length < c.mainCount) {
      for (const s of sortedAll) {
        if (!zone1.includes(s.number) && !mustExclude.includes(s.number)) {
          zone1.push(s.number);
          break;
        }
      }
    }
    zone1.sort((a, b) => a - b);

    // V16.3: 驗證 must_include 全部存在
    const missingMust = mustInclude.filter(n => !zone1.includes(n));
    if (missingMust.length > 0) continue;

    // 檢查和值
    const sum = zone1.reduce((a, b) => a + b, 0);
    if (sum < sumRange[0] || sum > sumRange[1]) {
      if (level <= 2) continue; // 嚴格層跳過
    }

    // 檢查A/B比例
    const abCount = zone1.filter(n => {
      const score = scores.find(s => s.number === n);
      return score && (score.grade === 'A' || score.grade === 'B');
    }).length;
    if (abCount / c.mainCount < minABRatio && level <= 3) continue;

    const key = zone1.join(',');
    if (usedSets.has(key)) continue;

    const score = Math.round(zone1.reduce((a, n) => a + (scores.find(s => s.number === n)?.total || 50), 0) / zone1.length);

    combos.push({
      id: `c${startIndex + combos.length + 1}`,
      name: `${strategy}${startIndex + combos.length + 1}`,
      zone1,
      zone2: pickZone2(c.id as LotteryType, scores, startIndex + combos.length),
      score,
      reason: level === 1 ? `保留${kept.length}養號+${strategy}策略推薦` : `保留${kept.length}養號+${getLevelName(level)}`,
      riskWarning: strategy === '進取' ? '高風險' : level > 2 ? '中等風險' : '正常風險',
      style: strategy,
      relaxationLog: level > 1 ? [{ level, rule: getLevelName(level), relaxation: getLevelRelaxation(level) }] : undefined,
    });
  }

  return combos;
}

/** 產生變體 - 微調1~2碼 */
function generateVariant(base: number[], pool: number[], count: number, seed: number): number[] {
  const result = [...base];
  const swapCount = 1 + (seed % 2); // 換1~2碼

  for (let i = 0; i < swapCount; i++) {
    const removeIdx = (seed + i * 3) % result.length;
    result.splice(removeIdx, 1);

    const available = pool.filter(n => !result.includes(n));
    if (available.length > 0) {
      const addIdx = (seed + i * 7) % available.length;
      result.push(available[addIdx]);
    }
  }

  while (result.length < count) {
    for (const n of pool) {
      if (!result.includes(n)) { result.push(n); break; }
    }
  }

  return [...new Set(result)].slice(0, count).sort((a, b) => a - b);
}

/** 選第二區號碼 */
function pickZone2(type: LotteryType, _scores: NumberScore[], seed: number): number {
  const c = getConfig(type);
  if (!c.hasSpecial || c.specialMode === 'none') return 0;

  if (c.specialMode === 'separate') {
    // 威力彩：1~8 選熱號
    const z2Scores = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ n, s: (n * 13 + seed * 7) % 100 }));
    z2Scores.sort((a, b) => b.s - a.s);
    return z2Scores[seed % 8].n;
  }

  // 大樂透：特別號從主區熱號選
  return 0; // 大樂透特別號由開獎決定，投注時不需選
}

function getLevelName(level: number): string {
  return ['', '完整規則', '放寬和值', '放寬A/B比例', '允許C級補位', '最高分號碼補足'][level] || '未知';
}

function getLevelRelaxation(level: number): string {
  return ['', '標準篩選', '和值範圍±20', 'A/B級比例降為30%', '開放C級號碼', '使用全池最高分'][level] || '';
}
