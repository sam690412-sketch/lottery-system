// ============================================================
// V16-4 — Builder 命理疊加（只呼叫既有 metaphysicsSchools 引擎，不重寫演算法）
// 來源：analyzeMetaBySchool（metaphysicsSchools.ts）→ recommendedNumbers + weights。
// 僅調整既有 currentNumberPool；不直接產最終號碼；不接 AI。
// ============================================================
import { analyzeMetaBySchool, META_SCHOOLS, type MetaSchoolId } from '@/utils/metaphysicsSchools';
import type { BaseNumberPool, BaseNumberPoolEntry } from '@/utils/builderStats';
import type { Influence, OverlayResult } from '@/utils/builderPersonalization';

// 對外提供：實際存在的 7 個學派（供 UI 選擇，不亂造）
export const BUILDER_META_SCHOOLS: { id: MetaSchoolId; name: string }[] = META_SCHOOLS.map((s) => ({ id: s.id, name: s.name }));

export interface MetaInput {
  birthday?: string;   // YYYY-MM-DD
  method?: MetaSchoolId | string;
  question?: string;   // 意念文字（optional，不改演算法，僅保留）
}

function clonePool(pool: BaseNumberPool): BaseNumberPool {
  return {
    source: pool.source,
    weightPct: pool.weightPct,
    entries: pool.entries.map((e) => ({ num: e.num, weight: e.weight, reasons: [...e.reasons] })),
  };
}

function ensureEntry(entries: BaseNumberPoolEntry[], num: number): BaseNumberPoolEntry {
  let e = entries.find((x) => x.num === num);
  if (!e) { e = { num, weight: 0, reasons: [] }; entries.push(e); }
  return e;
}

/**
 * 命理疊加：呼叫既有 analyzeMetaBySchool 取 recommendedNumbers + weights，疊加到池。
 * 權重以既有引擎輸出為主（縮放後加成）；reason 加「命理「學派名」影響」。
 */
export function applyMetaphysicsToPool(currentPool: BaseNumberPool, input: MetaInput): OverlayResult {
  const updated = clonePool(currentPool);
  const influences: Influence[] = [];

  const date = (input.birthday || '').trim();
  const methodId = (input.method || '') as MetaSchoolId;
  if (!date || !methodId) {
    return { pool: updated, influences, summary: '未提供生日或命理方式，號碼池未調整。' };
  }

  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) {
    return { pool: updated, influences, summary: '生日格式無法解析，號碼池未調整。' };
  }
  const school = META_SCHOOLS.find((s) => s.id === methodId);
  if (!school) {
    return { pool: updated, influences, summary: '未知命理方式，號碼池未調整。' };
  }

  // 呼叫既有引擎（不重寫命理演算法）；hour 預設 12、gender 預設 '男'、userWeight 用學派預設
  const result = analyzeMetaBySchool(
    dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), 12, '男', methodId, school.defaultWeight,
  );

  const reason = `命理「${result.schoolName}」影響`;
  for (const n of result.recommendedNumbers) {
    const e = ensureEntry(updated.entries, n);
    // 以既有 weights 為主；無則給固定加成 12
    const engineW = result.weights[n];
    e.weight += engineW != null ? Math.round(engineW / 8) + 6 : 12;
    if (!e.reasons.includes(reason)) e.reasons.push(reason);
    influences.push({ num: n, reason });
  }

  updated.entries.sort((a, b) => b.weight - a.weight);
  const summary = result.recommendedNumbers.length
    ? `命理「${result.schoolName}」推得 ${result.recommendedNumbers.length} 個號碼，已疊加至號碼池。`
    : `命理「${result.schoolName}」未推得號碼，號碼池未調整。`;
  return { pool: updated, influences, summary };
}
