// ============================================================
// V16-3 — Builder 夢境/生日 疊加（只呼叫既有引擎，不重寫演算法）
// 夢境：findDreamSymbol（dream.ts）；生日：parsePersonalSource（personalNumber.ts）。
// 僅調整既有 baseNumberPool 權重，不直接產最終號碼。
// 不碰命理/AI/權限/付款。
// ============================================================
import { findDreamSymbol, DREAM_SYMBOLS } from '@/utils/dream';
import { parsePersonalSource } from '@/utils/personalNumber';
import type { BaseNumberPool, BaseNumberPoolEntry } from '@/utils/builderStats';

export interface Influence {
  num: number;
  reason: string;
}

export interface OverlayResult {
  pool: BaseNumberPool;
  influences: Influence[];
  summary: string;
}

// 複製池（不可變更新；保留既有 entries 與權重）
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
 * 夢境疊加：把 dreamText 拆關鍵字 → findDreamSymbol → 取既有 numbers → 對池加權。
 * 只呼叫既有 dream 引擎；每個被影響號碼加入 reason「夢境「X」影響」。
 */
export function applyDreamToPool(baseNumberPool: BaseNumberPool, dreamText: string): OverlayResult {
  const updated = clonePool(baseNumberPool);
  const influences: Influence[] = [];
  const matchedSymbols: string[] = [];

  const text = (dreamText || '').trim();
  if (!text) {
    return { pool: updated, influences, summary: '未輸入夢境，號碼池未調整。' };
  }

  // 從文字中比對既有夢境符號（呼叫既有 findDreamSymbol）
  // 以每個既有符號字面在文字中出現與否判定
  const DREAM_WEIGHT = 12; // 夢境加權（顯示權重 15%）
  // 掃描既有夢境符號是否出現在文字中（呼叫既有 findDreamSymbol 取得號碼）
  const seen = new Set<string>();
  for (const candidate of DREAM_SYMBOLS) {
    if (seen.has(candidate.symbol)) continue;
    if (text.includes(candidate.symbol)) {
      const sym = findDreamSymbol(candidate.symbol);
      if (!sym) continue;
      seen.add(sym.symbol);
      matchedSymbols.push(sym.symbol);
      for (const n of sym.numbers) {
        const e = ensureEntry(updated.entries, n);
        e.weight += DREAM_WEIGHT;
        const reason = `夢境「${sym.symbol}」影響`;
        if (!e.reasons.includes(reason)) e.reasons.push(reason);
        influences.push({ num: n, reason });
      }
    }
  }

  updated.entries.sort((a, b) => b.weight - a.weight);
  const summary = matchedSymbols.length
    ? `夢境命中：${[...new Set(matchedSymbols)].join('、')}，已調整 ${new Set(influences.map((i) => i.num)).size} 個號碼。`
    : '夢境未命中已知符號，號碼池未調整。';
  return { pool: updated, influences, summary };
}

/**
 * 生日疊加：呼叫既有 parsePersonalSource（type=birthday）取 numbers → 對池加權。
 * 每個被影響號碼加入 reason「生日數字影響」。
 */
export function applyBirthdayToPool(currentPool: BaseNumberPool, birthday: string): OverlayResult {
  const updated = clonePool(currentPool);
  const influences: Influence[] = [];

  const date = (birthday || '').trim();
  if (!date) {
    return { pool: updated, influences, summary: '未輸入生日，號碼池未調整。' };
  }

  // 呼叫既有 personalNumber 引擎（不重寫轉換邏輯）
  const parsed = parsePersonalSource({ id: 'builder-birthday', type: 'birthday', name: '我', relation: '本人', date } as any);
  const BIRTHDAY_WEIGHT = 12; // 生日加權（顯示權重 15%）
  for (const n of parsed.numbers) {
    const e = ensureEntry(updated.entries, n);
    e.weight += BIRTHDAY_WEIGHT;
    const reason = '生日數字影響';
    if (!e.reasons.includes(reason)) e.reasons.push(reason);
    influences.push({ num: n, reason });
  }

  updated.entries.sort((a, b) => b.weight - a.weight);
  const summary = parsed.numbers.length
    ? `生日轉換出 ${parsed.numbers.length} 個號碼，已疊加至號碼池。`
    : '生日未轉換出號碼，號碼池未調整。';
  return { pool: updated, influences, summary };
}
