/**
 * recentAnalysisStore.ts  (V24-C)
 *
 * 「最近分析」紀錄,只存 localStorage,最多保留 20 筆。
 * 純新增、與既有 userStorage / schema / 資料庫無關(不新增資料庫)。
 * 全部加 try/catch 與 typeof 防護,SSR / 隱私模式下不會丟例外。
 */

export interface RecentAnalysisRecord {
  /** 分析時間(Date.now())。 */
  time: number;
  /** 彩種代碼。 */
  lotteryType: string;
  /** 主號。 */
  numbers: number[];
  /** 整體統計完整度。 */
  overallScore: number;
}

const STORAGE_KEY = 'v24-recent-analysis';
const MAX_RECORDS = 20;

function readStore(): RecentAnalysisRecord[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentAnalysisRecord[]) : [];
  } catch {
    return [];
  }
}

function writeStore(records: RecentAnalysisRecord[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* 忽略寫入失敗(配額 / 隱私模式) */
  }
}

/** 讀取最近分析(新到舊)。 */
export function loadRecentAnalysis(): RecentAnalysisRecord[] {
  return readStore();
}

/** 新增一筆,置頂、去除完全相同的舊重覆、截斷至 20 筆,回傳更新後清單。 */
export function addRecentAnalysis(record: RecentAnalysisRecord): RecentAnalysisRecord[] {
  const prev = readStore();
  const sameKey = (r: RecentAnalysisRecord) =>
    r.lotteryType === record.lotteryType &&
    r.numbers.length === record.numbers.length &&
    r.numbers.every((n, i) => n === record.numbers[i]);
  const deduped = prev.filter((r) => !sameKey(r));
  const next = [record, ...deduped].slice(0, MAX_RECORDS);
  writeStore(next);
  return next;
}

/** 清除所有最近分析紀錄。 */
export function clearRecentAnalysis(): RecentAnalysisRecord[] {
  writeStore([]);
  return [];
}
