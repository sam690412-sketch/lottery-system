// ============================================================
// V22 — Prize Check（Part 4/5）+ Analysis Report（Part 6）
// 純邏輯，不修改既有程式。⚠️ 不自行推估獎金；無官方獎金資訊時顯示提示。
// ============================================================
import type { LotteryType } from '@/utils/lotteryConfig';
import { getHistoryByIssue, getLatestResult } from '@/utils/historyEngine';
import { isOfficialValidated, type LotteryResult } from '@/providers/historyProvider';

export interface PrizeCheckResult {
  game: LotteryType;
  issue: number;
  date: string;
  userZone1: number[];
  userSpecial: number | null;
  matchedZone1: number[];     // 命中的第一區號碼
  matchedCount: number;       // 命中幾碼（第一區）
  specialMatched: boolean;    // 特別號是否命中
  prizeNote: string;          // 獎金說明（不推估）
}

/** 比對單期。不推估獎金；命中達門檻時提示「依官方公告確認獎金」。 */
export function checkPrize(game: LotteryType, issue: number, userZone1: number[], userSpecial: number | null): PrizeCheckResult | null {
  const draw = getHistoryByIssue(game, issue);
  if (!draw) return null;
  return buildCheck(game, draw, userZone1, userSpecial);
}
/** 比對最新一期。 */
export function checkAgainstLatest(game: LotteryType, userZone1: number[], userSpecial: number | null): PrizeCheckResult | null {
  const draw = getLatestResult(game);
  if (!draw) return null;
  return buildCheck(game, draw, userZone1, userSpecial);
}
function buildCheck(game: LotteryType, draw: LotteryResult, userZone1: number[], userSpecial: number | null): PrizeCheckResult {
  const drawSet = new Set(draw.zone1);
  const matchedZone1 = userZone1.filter((n) => drawSet.has(n));
  const specialMatched = userSpecial != null && draw.special != null && userSpecial === draw.special;
  const matchedCount = matchedZone1.length;
  // 不推估獎金；僅依命中數給「是否符合中獎條件」的中性提示
  let prizeNote: string;
  if (matchedCount >= 3 || (matchedCount >= 2 && specialMatched)) {
    prizeNote = isOfficialValidated()
      ? '符合中獎條件，請依官方公告確認獎金。'
      : '（目前為示意資料）符合比對條件，實際請依官方開獎與公告為準。';
  } else {
    prizeNote = '未達常見中獎門檻（仍請以官方公告為準）。';
  }
  return { game, issue: draw.issue, date: draw.date, userZone1, userSpecial, matchedZone1, matchedCount, specialMatched, prizeNote };
}

// ---- Part 5：自動比對所有收藏（首頁用） ----
interface KeepSet { id: string; name: string; numbers: number[]; type: LotteryType; note: string }
/** 比對所有收藏 vs 最新一期。讀 v12-keep-sets（與既有收藏同來源），不寫入。 */
export function checkAllCollectionsAgainstLatest(game: LotteryType): { checked: number; results: PrizeCheckResult[] } {
  let sets: KeepSet[] = [];
  try { const raw = localStorage.getItem('v12-keep-sets'); if (raw) sets = JSON.parse(raw); } catch { /* ignore */ }
  const mine = sets.filter((s) => s.type === game);
  const results: PrizeCheckResult[] = [];
  for (const s of mine) {
    const r = checkAgainstLatest(game, s.numbers, null);
    if (r) results.push(r);
  }
  return { checked: mine.length, results };
}

// ============================================================
// Part 6 — Analysis Report（資料模型 + 文字產生；列印/PDF/分享由頁面用瀏覽器 API 完成）
// ============================================================
export interface AnalysisReport {
  date: string;
  game: LotteryType;
  persona: string;
  range: string;
  dataCount: number;
  hotNumbers: number[];
  coldNumbers: number[];
  mainFactors: string[];
  formationReason: string;
  aiSummary: string;
  entertainmentNote: string;
}
/** 組合分析報告（純資料；不宣稱中獎率）。hot/cold/factors 由呼叫端帶入既有分析結果。 */
export function buildAnalysisReport(opts: {
  game: LotteryType; persona: string; range: string; dataCount: number;
  hotNumbers: number[]; coldNumbers: number[]; mainFactors: string[]; reason?: string;
}): AnalysisReport {
  return {
    date: new Date().toISOString().split('T')[0],
    game: opts.game,
    persona: opts.persona,
    range: opts.range,
    dataCount: opts.dataCount,
    hotNumbers: opts.hotNumbers,
    coldNumbers: opts.coldNumbers,
    mainFactors: opts.mainFactors,
    formationReason: opts.reason || `依 ${opts.range} 區間、${opts.dataCount} 期資料，綜合 ${opts.mainFactors.join('、') || '統計'} 等因子整理。`,
    aiSummary: `本報告以「${opts.persona}」風格整理 ${opts.game} 的 ${opts.range} 區間資料（${opts.dataCount} 期）。`,
    entertainmentNote: '本報告為娛樂與統計整理，不代表中獎率。請理性購買、量力而為。',
  };
}
