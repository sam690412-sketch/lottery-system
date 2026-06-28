/**
 * historyImportAdapter.ts  (V25-C — CSV / JSON 匯入 Adapter)
 *
 * 只負責「解析、標準化、預覽、驗證」,不寫入、不覆蓋內建資料、不接 localStorage / DB。
 * 純新增,不修改 HistoryProvider / HistoryEngine 等既有程式;不依賴任何外部套件(自帶 CSV parser)。
 *
 * 標準化目標:輸出 historyValidation.ts 的 RawHistoryRecord[],再交給 V25-B 驗證。
 */

import {
  validateHistoryDataset,
  type RawHistoryRecord,
  type ValidationResult,
} from './historyValidation';

/* ============================================================
 * 型別
 * ========================================================== */

export interface ImportParseOptions {
  /** CSV 分隔符;預設自動偵測(, ; tab)。 */
  delimiter?: string;
  /** 是否首列為標題;預設 true。 */
  hasHeader?: boolean;
  /** 來源 meta.source(JSON 若含 meta.source 會覆蓋此值)。 */
  metaSource?: string;
}

export interface ParsedImport {
  records: RawHistoryRecord[];
  /** 偵測到的彩種分組(JSON 物件格式時有值;CSV/陣列則為 null)。 */
  grouped: Record<string, RawHistoryRecord[]> | null;
  metaSource: string;
  /** 解析過程的非致命問題(欄位缺失、跳過的列等)。 */
  parseWarnings: string[];
}

export interface ImportPreview {
  totalRecords: number;
  dateRange: { from: string | null; to: string | null };
  issueRange: { min: number | null; max: number | null };
  /** 缺少必要欄位(期數或日期或號碼)的筆數。 */
  missingFieldCount: number;
  missingFieldSamples: string[];
  /** 重複期數清單。 */
  duplicateIssues: number[];
}

/* ============================================================
 * CSV 解析(自帶,不依賴外部套件)
 * ========================================================== */

const DELIMITERS = [',', ';', '\t'];

function detectDelimiter(headerLine: string): string {
  let best = ',';
  let bestCount = -1;
  for (const d of DELIMITERS) {
    const count = headerLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/** 解析單列 CSV(支援雙引號包覆與引號內分隔符)。 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** 從一段字串解析出號碼陣列(支援 "1,2,3"、"1 2 3"、"01-02-03")。 */
function parseNumberList(value: string): number[] {
  return value
    .split(/[\s,，、|/-]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

const ZONE1_KEYS = ['zone1', 'numbers', 'nums', 'main', '號碼', '第一區'];
const ISSUE_KEYS = ['issue', 'period', '期數', '期別'];
const DATE_KEYS = ['drawdate', 'date', '開獎日', '開獎日期', '日期'];
const ZONE2_KEYS = ['zone2', '第二區'];
const SPECIAL_KEYS = ['special', 'sp', '特別號'];

/** n1..n6 / num1.. 之類的散欄。 */
function collectSplitNumberColumns(row: Record<string, string>): number[] {
  const keys = Object.keys(row)
    .filter((k) => /^(n|num|number|no)\s*\d+$/i.test(k.trim()))
    .sort((a, b) => {
      const na = parseInt(a.replace(/\D+/g, ''), 10);
      const nb = parseInt(b.replace(/\D+/g, ''), 10);
      return na - nb;
    });
  const nums: number[] = [];
  for (const k of keys) {
    const v = parseInt(String(row[k]).trim(), 10);
    if (!Number.isNaN(v)) nums.push(v);
  }
  return nums;
}

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const want of keys) {
    for (const k of Object.keys(row)) {
      if (k.trim().toLowerCase() === want.toLowerCase()) return row[k];
    }
  }
  return undefined;
}

/**
 * 解析 CSV 文字 → RawHistoryRecord[]。
 * zone1 支援:單欄("1,2,3,4,5,6" 或 "1 2 3 4 5 6")或散欄(n1..n6)。
 */
export function parseHistoryCsv(csvText: string, options: ImportParseOptions = {}): ParsedImport {
  const parseWarnings: string[] = [];
  const text = csvText.replace(/^\uFEFF/, ''); // 去 BOM
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { records: [], grouped: null, metaSource: options.metaSource ?? '', parseWarnings: ['CSV 內容為空'] };
  }

  const hasHeader = options.hasHeader !== false;
  const delimiter = options.delimiter ?? detectDelimiter(lines[0]);
  const headerCells = hasHeader ? splitCsvLine(lines[0], delimiter) : [];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // 無標題時用位置欄名 c0,c1...(無法智慧對應,僅警告)
  const header = hasHeader
    ? headerCells.map((h) => h.trim())
    : (lines[0].split(delimiter).map((_, i) => `c${i}`));
  if (!hasHeader) parseWarnings.push('未指定標題列,無法依欄名對應,建議提供標題。');

  const records: RawHistoryRecord[] = [];
  for (let li = 0; li < dataLines.length; li++) {
    const cells = splitCsvLine(dataLines[li], delimiter);
    const row: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) row[header[i]] = cells[i] ?? '';

    // zone1
    let zone1: number[] = [];
    const z1raw = pick(row, ZONE1_KEYS);
    if (z1raw && z1raw.trim()) zone1 = parseNumberList(z1raw);
    if (zone1.length === 0) {
      const split = collectSplitNumberColumns(row);
      if (split.length) zone1 = split;
    }

    const issueRaw = pick(row, ISSUE_KEYS);
    const dateRaw = pick(row, DATE_KEYS);
    const zone2Raw = pick(row, ZONE2_KEYS);
    const specialRaw = pick(row, SPECIAL_KEYS);

    const rec: RawHistoryRecord = {
      issue: issueRaw && !Number.isNaN(parseInt(issueRaw, 10)) ? parseInt(issueRaw, 10) : undefined,
      date: dateRaw && dateRaw.trim() ? dateRaw.trim() : undefined,
      zone1,
    };
    if (zone2Raw && zone2Raw.trim()) {
      const z2 = parseInt(zone2Raw, 10);
      if (!Number.isNaN(z2)) rec.zone2 = z2;
    }
    if (specialRaw && specialRaw.trim()) {
      const sp = parseInt(specialRaw, 10);
      if (!Number.isNaN(sp)) rec.special = sp;
    }
    records.push(rec);
  }

  return {
    records,
    grouped: null,
    metaSource: options.metaSource ?? '',
    parseWarnings,
  };
}

/* ============================================================
 * JSON 解析
 * ========================================================== */

const GROUP_KEYS = ['power', 'lotto649', 'daily539'];

/**
 * 解析 JSON 文字。支援:
 * - 陣列:[{...}, {...}]
 * - 物件分組:{ power:[], lotto649:[], daily539:[], meta:{source} }
 */
export function parseHistoryJson(jsonText: string, options: ImportParseOptions = {}): ParsedImport {
  const parseWarnings: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    return {
      records: [],
      grouped: null,
      metaSource: options.metaSource ?? '',
      parseWarnings: ['JSON 解析失敗:' + (e instanceof Error ? e.message : String(e))],
    };
  }

  let metaSource = options.metaSource ?? '';
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const meta = obj.meta as { source?: string } | undefined;
    if (meta && typeof meta.source === 'string') metaSource = meta.source;

    // 物件分組格式
    const grouped: Record<string, RawHistoryRecord[]> = {};
    let foundGroup = false;
    for (const g of GROUP_KEYS) {
      if (Array.isArray(obj[g])) {
        foundGroup = true;
        grouped[g] = (obj[g] as unknown[]).map((r) => normalizeHistoryRecord(r));
      }
    }
    if (foundGroup) {
      const all: RawHistoryRecord[] = [];
      for (const g of Object.keys(grouped)) all.push(...grouped[g]);
      return { records: all, grouped, metaSource, parseWarnings };
    }
    parseWarnings.push('JSON 物件未含 power/lotto649/daily539 分組,亦非陣列。');
    return { records: [], grouped: null, metaSource, parseWarnings };
  }

  if (Array.isArray(data)) {
    const records = data.map((r) => normalizeHistoryRecord(r));
    return { records, grouped: null, metaSource, parseWarnings };
  }

  parseWarnings.push('JSON 格式無法辨識(非陣列、非物件)。');
  return { records: [], grouped: null, metaSource, parseWarnings };
}

/* ============================================================
 * 標準化
 * ========================================================== */

function toNumberArray(v: unknown): number[] {
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === 'number' ? x : parseInt(String(x), 10))).filter((n) => !Number.isNaN(n));
  }
  if (typeof v === 'string') return parseNumberList(v);
  if (typeof v === 'number' && !Number.isNaN(v)) return [v];
  return [];
}

/** 把任意 raw 物件轉成 historyValidation 可吃的 RawHistoryRecord。 */
export function normalizeHistoryRecord(raw: unknown): RawHistoryRecord {
  if (!raw || typeof raw !== 'object') return { zone1: [] };
  const r = raw as Record<string, unknown>;

  const issue =
    typeof r.issue === 'number' ? r.issue
    : typeof r.period === 'number' ? r.period
    : typeof r.issue === 'string' && !Number.isNaN(parseInt(r.issue, 10)) ? parseInt(r.issue, 10)
    : typeof r.period === 'string' && !Number.isNaN(parseInt(r.period, 10)) ? parseInt(r.period, 10)
    : undefined;

  const date =
    typeof r.drawDate === 'string' ? r.drawDate
    : typeof r.date === 'string' ? r.date
    : undefined;

  let zone1 = toNumberArray(r.zone1);
  if (zone1.length === 0 && r.numbers !== undefined) zone1 = toNumberArray(r.numbers);

  const rec: RawHistoryRecord = { issue, date, zone1 };

  if (r.zone2 !== undefined && r.zone2 !== null) {
    if (Array.isArray(r.zone2)) rec.zone2 = toNumberArray(r.zone2);
    else if (typeof r.zone2 === 'number') rec.zone2 = r.zone2;
    else if (typeof r.zone2 === 'string' && !Number.isNaN(parseInt(r.zone2, 10))) rec.zone2 = parseInt(r.zone2, 10);
  }
  if (r.special !== undefined && r.special !== null) {
    if (typeof r.special === 'number') rec.special = r.special;
    else if (typeof r.special === 'string' && !Number.isNaN(parseInt(r.special, 10))) rec.special = parseInt(r.special, 10);
  }
  return rec;
}

/* ============================================================
 * 預覽
 * ========================================================== */

export function previewImport(records: RawHistoryRecord[]): ImportPreview {
  const dates: string[] = [];
  const issues: number[] = [];
  let missingFieldCount = 0;
  const missingFieldSamples: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const issue = r.issue ?? r.period ?? null;
    const rawDate = r.drawDate ?? r.date ?? null;
    const date = typeof rawDate === 'string' && rawDate.trim().length > 0 ? rawDate.trim() : null;
    const z1 = Array.isArray(r.zone1) ? r.zone1 : [];
    if (issue === null || date === null || z1.length === 0) {
      missingFieldCount++;
      if (missingFieldSamples.length < 8) {
        const miss: string[] = [];
        if (issue === null) miss.push('期數');
        if (date === null) miss.push('日期');
        if (z1.length === 0) miss.push('號碼');
        missingFieldSamples.push(`第${i + 1}列缺:${miss.join('/')}`);
      }
    }
    if (typeof issue === 'number') issues.push(issue);
    if (date) dates.push(date);
  }

  const validDates = dates
    .map((d) => ({ raw: d, t: new Date(d).getTime() }))
    .filter((x) => !Number.isNaN(x.t))
    .sort((a, b) => a.t - b.t);

  const seen = new Set<number>();
  const dup: number[] = [];
  for (const i of issues) {
    if (seen.has(i)) dup.push(i);
    else seen.add(i);
  }

  return {
    totalRecords: records.length,
    dateRange: {
      from: validDates[0]?.raw ?? null,
      to: validDates[validDates.length - 1]?.raw ?? null,
    },
    issueRange: {
      min: issues.length ? Math.min(...issues) : null,
      max: issues.length ? Math.max(...issues) : null,
    },
    missingFieldCount,
    missingFieldSamples,
    duplicateIssues: dup,
  };
}

/* ============================================================
 * 驗證(直接呼叫 V25-B)
 * ========================================================== */

export function validateImportedHistory(
  records: RawHistoryRecord[],
  lotteryType: string,
  sourceKind: string = 'user',
  metaSource: string = '',
): ValidationResult {
  return validateHistoryDataset({ lotteryType, records, sourceKind, metaSource });
}

/* ============================================================
 * 匯入摘要文字
 * ========================================================== */

export function buildImportSummary(
  preview: ImportPreview,
  validation: ValidationResult,
  context: { fileName?: string; format?: 'csv' | 'json'; lotteryType?: string } = {},
): string {
  const lines: string[] = [];
  lines.push('匯入預覽摘要(未寫入,僅解析與驗證)');
  if (context.fileName) lines.push(`檔案:${context.fileName}`);
  if (context.format) lines.push(`格式:${context.format.toUpperCase()}`);
  if (context.lotteryType) lines.push(`彩種:${context.lotteryType}`);
  lines.push(`總筆數:${preview.totalRecords}`);
  lines.push(`期數範圍:${preview.issueRange.min ?? '-'} ~ ${preview.issueRange.max ?? '-'}`);
  lines.push(`日期範圍:${preview.dateRange.from ?? '-'} ~ ${preview.dateRange.to ?? '-'}`);
  lines.push(`缺欄筆數:${preview.missingFieldCount}`);
  if (preview.missingFieldSamples.length) lines.push(`  例:${preview.missingFieldSamples.join('; ')}`);
  lines.push(`重複期數:${preview.duplicateIssues.length ? preview.duplicateIssues.slice(0, 10).join(', ') : '無'}`);
  lines.push('');
  lines.push(`驗證狀態:${validation.summary.severity.toUpperCase()}(錯誤 ${validation.errors.length} / 警告 ${validation.warnings.length})`);
  if (validation.errors.length) {
    lines.push('錯誤:');
    for (const e of validation.errors) lines.push(`  ✗ ${e}`);
  }
  if (validation.warnings.length) {
    lines.push('警告:');
    for (const w of validation.warnings) lines.push(`  ! ${w}`);
  }
  lines.push('');
  lines.push(validation.ok ? '可進入下一步(本版不寫入)。' : '請先修正錯誤再考慮匯入(本版不寫入)。');
  return lines.join('\n');
}

export default parseHistoryCsv;
