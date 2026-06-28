/**
 * historyValidation.ts  (V25-B — 歷史資料驗證引擎)
 *
 * 可重複執行的歷史開獎資料驗證。純新增、無副作用、不修改任何既有程式與資料。
 * - 不 import lotteryConfig(自帶規則表,避免耦合到未確認的設定形狀)。
 * - 內建 JSON 透過「可替換 loader」讀取,不硬寫死資料,方便未來 CSV / Official Adapter 注入。
 *
 * 用語為資料品質(statistics / data quality)取向,不含中獎相關字眼。
 */

import rawDraws from '@/data/historicalDraws.json';

/* ============================================================
 * 型別
 * ========================================================== */

export type ValidationSeverity = 'green' | 'yellow' | 'red';

/** 來源種類(對齊 historyProvider 的 DataSourceKind,並多納 user/unknown)。 */
export type HistorySourceKind =
  | 'official'
  | 'csv'
  | 'json'
  | 'database'
  | 'simulated'
  | 'user'
  | 'unknown';

/** 單筆紀錄(支援多種欄位命名,未來 CSV/JSON/Official 可能不同)。 */
export interface RawHistoryRecord {
  period?: number;
  issue?: number;
  date?: string;
  drawDate?: string;
  zone1?: number[];
  zone2?: number | number[] | null;
  special?: number | null;
}

export interface ValidateHistoryInput {
  lotteryType: string;
  records: RawHistoryRecord[];
  /** 來源種類(如 'simulated' / 'official');用於 rule 12。 */
  sourceKind?: string;
  /** 資料 meta.source(如 'taiwan-lottery-seed');用於 rule 13。 */
  metaSource?: string;
}

export interface ValidationSummary {
  errorCount: number;
  warningCount: number;
  severity: ValidationSeverity;
  latestDate: string | null;
  staleDays: number | null;
  sourceKind: string;
}

export interface ValidationResult {
  ok: boolean;
  sourceKind: string;
  lotteryType: string;
  totalRecords: number;
  dateRange: { from: string | null; to: string | null };
  issueRange: { min: number | null; max: number | null };
  errors: string[];
  warnings: string[];
  summary: ValidationSummary;
}

/* ============================================================
 * 彩種驗證規則表(自帶,不依賴 lotteryConfig)
 * ========================================================== */

interface LotteryValidationRule {
  label: string;
  zone1Count: number;
  zone1Min: number;
  zone1Max: number;
  /** 第二區/特別號性質:'power' 第二區 1 顆、'special' 特別號 1 顆、'none' 無。 */
  secondKind: 'power' | 'special' | 'none';
  secondMin?: number;
  secondMax?: number;
  /** 常見開獎星期(0=日 .. 6=六)。 */
  drawWeekdays: number[];
  /** 開辦年份(早於此年視為不合理日期)。 */
  startYear: number;
}

const RULES: Record<string, LotteryValidationRule> = {
  power: {
    label: '威力彩',
    zone1Count: 6, zone1Min: 1, zone1Max: 38,
    secondKind: 'power', secondMin: 1, secondMax: 8,
    drawWeekdays: [1, 4], // 一、四
    startYear: 2008,
  },
  lotto649: {
    label: '大樂透',
    zone1Count: 6, zone1Min: 1, zone1Max: 49,
    secondKind: 'special', secondMin: 1, secondMax: 49,
    drawWeekdays: [2, 5], // 二、五
    startYear: 2004,
  },
  daily539: {
    label: '今彩539',
    zone1Count: 5, zone1Min: 1, zone1Max: 39,
    secondKind: 'none',
    drawWeekdays: [1, 2, 3, 4, 5, 6], // 一~六
    startYear: 2007,
  },
};

const WD = ['日', '一', '二', '三', '四', '五', '六'];
const DAY_MS = 86400000;
const STALE_DAYS = 30;
const MAX_SAMPLES = 8;

/* ============================================================
 * 小工具
 * ========================================================== */

function getIssue(r: RawHistoryRecord): number | null {
  if (typeof r.issue === 'number') return r.issue;
  if (typeof r.period === 'number') return r.period;
  return null;
}
function getDate(r: RawHistoryRecord): string | null {
  return r.drawDate ?? r.date ?? null;
}
/** 取第二區/特別號的「原始數值」(保留 0,用於全為 0 的判定)。 */
function getSecondRaw(r: RawHistoryRecord): number | null {
  if (typeof r.special === 'number' && !Number.isNaN(r.special)) return r.special;
  const z2 = r.zone2;
  if (typeof z2 === 'number' && !Number.isNaN(z2)) return z2;
  if (Array.isArray(z2) && z2.length > 0 && typeof z2[0] === 'number') return z2[0];
  return null;
}
function joinSamples(samples: string[]): string {
  if (samples.length === 0) return '';
  const shown = samples.slice(0, MAX_SAMPLES).join(', ');
  return samples.length > MAX_SAMPLES ? `${shown}…` : shown;
}

/* ============================================================
 * 主驗證
 * ========================================================== */

export function validateHistoryDataset(input: ValidateHistoryInput): ValidationResult {
  const { lotteryType, records } = input;
  const sourceKind = input.sourceKind ?? 'unknown';
  const metaSource = input.metaSource ?? '';
  const rule = RULES[lotteryType];

  const errors: string[] = [];
  const warnings: string[] = [];

  // 未知彩種:無法套規則,直接回報
  if (!rule) {
    warnings.push(`未知彩種「${lotteryType}」,無對應驗證規則,僅做基本檢查。`);
  }

  // ---- 日期 / 期數彙整 ----
  const validDates: { d: Date; raw: string; issue: number | null }[] = [];
  let invalidDateCount = 0;
  const invalidSamples: string[] = [];
  for (const r of records) {
    const raw = getDate(r);
    const issue = getIssue(r);
    if (!raw) {
      invalidDateCount++;
      if (invalidSamples.length < MAX_SAMPLES) invalidSamples.push(`期${issue ?? '?'}:(無日期)`);
      continue;
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      invalidDateCount++;
      if (invalidSamples.length < MAX_SAMPLES) invalidSamples.push(`期${issue ?? '?'}:${raw}`);
    } else {
      validDates.push({ d, raw, issue });
    }
  }
  validDates.sort((a, b) => a.d.getTime() - b.d.getTime());
  const fromDate = validDates[0]?.raw ?? null;
  const toDate = validDates[validDates.length - 1]?.raw ?? null;

  const issues = records.map(getIssue).filter((x): x is number => x !== null);
  const issueMin = issues.length ? Math.min(...issues) : null;
  const issueMax = issues.length ? Math.max(...issues) : null;

  // Rule 1:期數不可重複
  const seen = new Set<number>();
  const dupIssues: number[] = [];
  for (const i of issues) {
    if (seen.has(i)) dupIssues.push(i);
    else seen.add(i);
  }
  if (dupIssues.length) errors.push(`期數重複:${dupIssues.length} 筆(${joinSamples(dupIssues.slice(0, MAX_SAMPLES).map(String))})`);

  // Rule 2:日期不可 invalid
  if (invalidDateCount) errors.push(`日期無法解析(Invalid Date):${invalidDateCount} 筆(${joinSamples(invalidSamples)})`);

  // Rule 3:日期不可為未來日
  const now = new Date();
  const futureSamples: string[] = [];
  const future = validDates.filter((x) => x.d.getTime() > now.getTime());
  for (const x of future) if (futureSamples.length < MAX_SAMPLES) futureSamples.push(`期${x.issue ?? '?'}:${x.raw}`);
  if (future.length) errors.push(`未來日期:${future.length} 筆(${joinSamples(futureSamples)})`);

  // 早於開辦年(不合理日期)
  if (rule) {
    const tooOld = validDates.filter((x) => x.d.getFullYear() < rule.startYear);
    if (tooOld.length) {
      const s = tooOld.slice(0, MAX_SAMPLES).map((x) => `期${x.issue ?? '?'}:${x.raw}`);
      errors.push(`日期早於開辦年(${rule.startYear}):${tooOld.length} 筆(${joinSamples(s)})`);
    }
  }

  // ---- 逐筆號碼檢查(彙總計數,避免逐筆洗版) ----
  if (rule) {
    let countErr = 0; const countS: string[] = [];
    let rangeErr = 0; const rangeS: string[] = [];
    let dupErr = 0; const dupS: string[] = [];
    let secondErr = 0; const secondS: string[] = [];
    let dailySecondErr = 0; const dailyS: string[] = [];

    // Rule 14 前置:大樂透第二區/特別號是否全為 0
    let allSecondZeroOrMissing = rule.secondKind !== 'none';
    let anyZero = false;

    for (const r of records) {
      const issue = getIssue(r);
      const z1 = Array.isArray(r.zone1) ? r.zone1 : [];

      // Rule 4:數量
      if (z1.length !== rule.zone1Count) {
        countErr++;
        if (countS.length < MAX_SAMPLES) countS.push(`期${issue ?? '?'}:${z1.length}顆`);
      }
      // Rule 5:範圍
      for (const n of z1) {
        if (typeof n !== 'number' || n < rule.zone1Min || n > rule.zone1Max) {
          rangeErr++;
          if (rangeS.length < MAX_SAMPLES) rangeS.push(`期${issue ?? '?'}:${n}`);
          break;
        }
      }
      // Rule 6:同區重複
      if (new Set(z1).size !== z1.length) {
        dupErr++;
        if (dupS.length < MAX_SAMPLES) dupS.push(`期${issue ?? '?'}:[${z1.join(',')}]`);
      }

      const second = getSecondRaw(r);
      if (rule.secondKind !== 'none') {
        if (second !== 0) allSecondZeroOrMissing = false;
        if (second === 0) anyZero = true;
      }

      // Rule 7 / 8:第二區 / 特別號範圍
      if (rule.secondKind === 'power' || rule.secondKind === 'special') {
        const min = rule.secondMin ?? 0;
        const max = rule.secondMax ?? 0;
        if (second === null || second < min || second > max) {
          secondErr++;
          if (secondS.length < MAX_SAMPLES) secondS.push(`期${issue ?? '?'}:${second ?? 'null'}`);
        }
      }
      // Rule 9:今彩539 不應有第二區(真實非 0 的第二區值才算)
      if (rule.secondKind === 'none' && second !== null && second > 0) {
        dailySecondErr++;
        if (dailyS.length < MAX_SAMPLES) dailyS.push(`期${issue ?? '?'}:${second}`);
      }
    }

    if (countErr) errors.push(`每期號碼數量不符(應 ${rule.zone1Count} 顆):${countErr} 筆(${joinSamples(countS)})`);
    if (rangeErr) errors.push(`號碼超出範圍(${rule.zone1Min}–${rule.zone1Max}):${rangeErr} 筆(${joinSamples(rangeS)})`);
    if (dupErr) errors.push(`同區號碼重複:${dupErr} 筆(${joinSamples(dupS)})`);

    // Rule 14:大樂透 special / zone2 全為 0 → error(優先於逐筆範圍洗版)
    const allZeroError =
      rule.secondKind === 'special' && records.length > 0 && allSecondZeroOrMissing && anyZero;
    if (allZeroError) {
      errors.push(`${rule.label}特別號 / 第二區全部為 0(共 ${records.length} 筆),不可作為正式特別號。`);
    } else if (secondErr) {
      const name = rule.secondKind === 'power' ? '第二區' : '特別號';
      const min = rule.secondMin ?? 0;
      const max = rule.secondMax ?? 0;
      errors.push(`${name}超出範圍(${min}–${max}):${secondErr} 筆(${joinSamples(secondS)})`);
    }

    if (dailySecondErr) errors.push(`${rule.label}不應有第二區,卻出現第二區數值:${dailySecondErr} 筆(${joinSamples(dailyS)})`);

    // Rule 10:開獎星期不符 → warning
    const wrongWd: string[] = [];
    let wrongWdCount = 0;
    for (const x of validDates) {
      if (!rule.drawWeekdays.includes(x.d.getDay())) {
        wrongWdCount++;
        if (wrongWd.length < MAX_SAMPLES) wrongWd.push(`期${x.issue ?? '?'}:${x.raw}(${WD[x.d.getDay()]})`);
      }
    }
    if (wrongWdCount) {
      const allow = rule.drawWeekdays.map((w) => WD[w]).join('、');
      warnings.push(`開獎星期與常見開獎日(${allow})不符:${wrongWdCount} 筆(${joinSamples(wrongWd)})`);
    }
  }

  // Rule 11:停更超過 30 天 → warning
  let staleDays: number | null = null;
  if (toDate) {
    const latest = new Date(toDate);
    if (!Number.isNaN(latest.getTime())) {
      staleDays = Math.floor((now.getTime() - latest.getTime()) / DAY_MS);
      if (staleDays > STALE_DAYS) {
        warnings.push(`資料停更超過 ${STALE_DAYS} 天(最新 ${toDate},距今約 ${staleDays} 天)。`);
      }
    }
  }

  // Rule 12:sourceKind = simulated → warning
  if (sourceKind === 'simulated') {
    warnings.push('資料來源標記為 simulated(示意/合成資料,非官方開獎)。');
  }

  // Rule 13:meta.source 含 seed / mock / simulated → warning
  if (metaSource && /seed|mock|simulat/i.test(metaSource)) {
    warnings.push(`meta.source「${metaSource}」包含 seed / mock / simulated,屬非官方資料。`);
  }

  const ok = errors.length === 0;
  const severity = getValidationSeverity({ errors, warnings });
  const summary: ValidationSummary = {
    errorCount: errors.length,
    warningCount: warnings.length,
    severity,
    latestDate: toDate,
    staleDays,
    sourceKind,
  };

  return {
    ok,
    sourceKind,
    lotteryType,
    totalRecords: records.length,
    dateRange: { from: fromDate, to: toDate },
    issueRange: { min: issueMin, max: issueMax },
    errors,
    warnings,
    summary,
  };
}

/* ============================================================
 * 嚴重度
 * ========================================================== */

export function getValidationSeverity(
  input: { errors: string[]; warnings: string[] } | ValidationResult,
): ValidationSeverity {
  if (input.errors.length > 0) return 'red';
  if (input.warnings.length > 0) return 'yellow';
  return 'green';
}

/* ============================================================
 * 內建資料驗證(loader 可替換,不硬寫死資料)
 * ========================================================== */

/** 內建資料集形狀(供 loader 回傳)。 */
export interface BuiltInDataset {
  [game: string]: unknown;
  meta?: { source?: string; version?: string; generated?: string; total?: number };
}

/** 預設 loader:讀專案內建 historicalDraws.json。 */
export function defaultBuiltInLoader(): BuiltInDataset {
  return rawDraws as unknown as BuiltInDataset;
}

const BUILT_IN_GAMES = ['power', 'lotto649', 'daily539'];

/**
 * 驗證目前內建 historicalDraws.json 的三彩種。
 * 預設標 sourceKind='simulated'(對齊 historyProvider 現況),並帶入 meta.source。
 * loader 可替換,方便注入 CSV / Official 資料測試。
 */
export function validateAllBuiltInHistory(
  loader: () => BuiltInDataset = defaultBuiltInLoader,
  sourceKind: string = 'simulated',
): Record<string, ValidationResult> {
  const data = loader();
  const metaSource = data.meta?.source ?? '';
  const out: Record<string, ValidationResult> = {};
  for (const game of BUILT_IN_GAMES) {
    const records = Array.isArray(data[game]) ? (data[game] as RawHistoryRecord[]) : [];
    out[game] = validateHistoryDataset({ lotteryType: game, records, sourceKind, metaSource });
  }
  return out;
}

/* ============================================================
 * 文字報告(給 UI / console)
 * ========================================================== */

const SEVERITY_LABEL: Record<ValidationSeverity, string> = {
  green: '✅ 綠燈(無錯誤無警告)',
  yellow: '🟡 黃燈(有警告)',
  red: '🔴 紅燈(有錯誤)',
};

export function formatValidationReport(result: ValidationResult): string {
  const lines: string[] = [];
  const ruleLabel = RULES[result.lotteryType]?.label ?? result.lotteryType;
  lines.push(`【${ruleLabel}】資料驗證報告`);
  lines.push(`狀態:${SEVERITY_LABEL[result.summary.severity]}`);
  lines.push(`來源:${result.sourceKind}`);
  lines.push(`總筆數:${result.totalRecords}`);
  lines.push(`期數範圍:${result.issueRange.min ?? '-'} ~ ${result.issueRange.max ?? '-'}`);
  lines.push(`日期範圍:${result.dateRange.from ?? '-'} ~ ${result.dateRange.to ?? '-'}`);
  if (result.summary.staleDays !== null) lines.push(`距今:約 ${result.summary.staleDays} 天`);
  lines.push('');
  lines.push(`錯誤(${result.errors.length}):`);
  if (result.errors.length) for (const e of result.errors) lines.push(`  ✗ ${e}`);
  else lines.push('  (無)');
  lines.push('');
  lines.push(`警告(${result.warnings.length}):`);
  if (result.warnings.length) for (const w of result.warnings) lines.push(`  ! ${w}`);
  else lines.push('  (無)');
  return lines.join('\n');
}

/** 將多彩種結果合併為單一文字報告。 */
export function formatAllValidationReports(results: Record<string, ValidationResult>): string {
  return Object.values(results)
    .map((r) => formatValidationReport(r))
    .join('\n\n----------------------------------------\n\n');
}

export default validateHistoryDataset;
