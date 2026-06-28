/**
 * historyChartAdapter.ts  (V23-B)
 *
 * 把 HistoryEngine / statistics.ts 的統計結果,轉成 Chart Engine 需要的格式
 * (ChartPoint / ChartSeries / DonutSlice)。
 *
 * ── 設計重點 ──────────────────────────────────────────────
 * 1. 本檔不直接 import HistoryEngine / statistics.ts,而是定義一個「輸入契約」
 *    AnalysisStatsInput。呼叫端(AnalysisCenterPage)只要把 statistics.ts 的
 *    真實輸出「對應」成這個 shape,後續所有圖表轉換都不必再改。
 * 2. 若某項統計沒有資料,對應 adapter 會回傳空陣列 / 空 slice,
 *    Chart Engine 元件會自動顯示 EmptyChartState(需求第 10 點)。
 * 3. 全部純函式,無副作用,可單測、可 tree-shake。
 *
 * ⚠️ 接線者注意:AnalysisStatsInput 是「假定」的欄位形狀。
 *    請依你 statistics.ts 的真實欄位調整下方 mapStatisticsToInput()
 *    這「唯一一個」對應點即可,不要散落各處硬接。
 */

import type {
  ChartPoint,
  ChartSeries,
  DonutSlice,
} from './chartTransform';

/* ============================================================
 * 1. 輸入契約(請把 statistics.ts 的輸出對應成此形狀)
 * ========================================================== */

export interface NumberCount {
  /** 號碼。 */
  number: number;
  /** 出現次數。 */
  count: number;
}

export interface AnalysisStatsInput {
  /** 各號碼出現次數(熱門 / 冷門排行的「自動排序」來源,二選一)。 */
  numberFrequency?: NumberCount[];
  /** 已預先排序好的熱門清單(由大到小)。提供時優先於 numberFrequency。 */
  hotNumbers?: NumberCount[];
  /** 已預先排序好的冷門清單(由小到大)。提供時優先於 numberFrequency。 */
  coldNumbers?: NumberCount[];
  /** 尾數(0–9)出現次數。 */
  tailFrequency?: { tail: number; count: number }[];
  /** 奇偶總數。 */
  oddCount?: number;
  evenCount?: number;
  /** 大小總數(大小的切點由 statistics.ts 自行定義)。 */
  bigCount?: number;
  smallCount?: number;
  /** 和值趨勢:依期序排列。 */
  sumTrend?: { period: string; sum: number }[];
  /** 月份分佈(month: 1–12)。 */
  monthDistribution?: { month: number; count: number }[];
  /** 年份分佈。 */
  yearDistribution?: { year: number; count: number }[];
  /** 星期分佈(weekday: 0=週日 … 6=週六)。 */
  weekdayDistribution?: { weekday: number; count: number }[];
}

/* ============================================================
 * 2. 共用小工具
 * ========================================================== */

const WEEKDAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 安全取陣列,undefined → []。 */
function arr<T>(v: T[] | undefined): T[] {
  return Array.isArray(v) ? v : [];
}

/* ============================================================
 * 3. 各圖表轉換(輸入 stats → Chart Engine 型別)
 * ========================================================== */

/** 1. 熱門號排行 → BarRankChart(優先用預排 hotNumbers,否則由 numberFrequency 由大到小)。 */
export function toHotNumbers(
  stats: AnalysisStatsInput,
  topN = 10,
): ChartPoint[] {
  const src =
    stats.hotNumbers ??
    arr(stats.numberFrequency)
      .slice()
      .sort((a, b) => b.count - a.count);
  return arr(src)
    .slice(0, topN)
    .map((n) => ({ label: pad2(n.number), value: n.count }));
}

/** 2. 冷門號排行 → BarRankChart(優先用預排 coldNumbers,否則由 numberFrequency 由小到大)。 */
export function toColdNumbers(
  stats: AnalysisStatsInput,
  bottomN = 10,
): ChartPoint[] {
  const src =
    stats.coldNumbers ??
    arr(stats.numberFrequency)
      .slice()
      .sort((a, b) => a.count - b.count);
  return arr(src)
    .slice(0, bottomN)
    .map((n) => ({ label: pad2(n.number), value: n.count }));
}

/** 3. 尾數分析 → BarRankChart(尾數 0–9)。 */
export function toTailRank(stats: AnalysisStatsInput): ChartPoint[] {
  return arr(stats.tailFrequency)
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((t) => ({ label: `尾${t.tail}`, value: t.count }));
}

/** 4. 奇偶比例 → RatioDonutChart。 */
export function toOddEvenDonut(stats: AnalysisStatsInput): DonutSlice[] {
  const odd = stats.oddCount ?? 0;
  const even = stats.evenCount ?? 0;
  if (odd === 0 && even === 0) return [];
  return [
    { label: '奇數', value: odd, color: '#f97316' },
    { label: '偶數', value: even, color: '#60a5fa' },
  ];
}

/** 5. 大小比例 → RatioDonutChart。 */
export function toBigSmallDonut(stats: AnalysisStatsInput): DonutSlice[] {
  const big = stats.bigCount ?? 0;
  const small = stats.smallCount ?? 0;
  if (big === 0 && small === 0) return [];
  return [
    { label: '大', value: big, color: '#fb923c' },
    { label: '小', value: small, color: '#a78bfa' },
  ];
}

/** 6. 和值趨勢 → TrendLineChart(單序列)。 */
export function toSumTrend(stats: AnalysisStatsInput): ChartSeries[] {
  const points = arr(stats.sumTrend).map((d) => ({
    label: d.period,
    value: d.sum,
  }));
  if (points.length === 0) return [];
  return [{ id: 'sum-trend', name: '和值', points }];
}

/** 7. 月份分析 → BarRankChart(固定 1–12 月序,不排序)。 */
export function toMonthRank(stats: AnalysisStatsInput): ChartPoint[] {
  return arr(stats.monthDistribution)
    .slice()
    .sort((a, b) => a.month - b.month)
    .map((m) => ({ label: `${m.month}月`, value: m.count }));
}

/** 8a. 年份分析 → TrendLineChart(依年份遞增)。 */
export function toYearTrend(stats: AnalysisStatsInput): ChartSeries[] {
  const points = arr(stats.yearDistribution)
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((y) => ({ label: String(y.year), value: y.count }));
  if (points.length === 0) return [];
  return [{ id: 'year-trend', name: '年份', points }];
}

/** 8b. 年份分析 → BarRankChart(備用,若你偏好長條)。 */
export function toYearRank(stats: AnalysisStatsInput): ChartPoint[] {
  return arr(stats.yearDistribution)
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((y) => ({ label: String(y.year), value: y.count }));
}

/** 9. 星期分析 → BarRankChart(固定週日→週六序)。 */
export function toWeekdayRank(stats: AnalysisStatsInput): ChartPoint[] {
  return arr(stats.weekdayDistribution)
    .slice()
    .sort((a, b) => a.weekday - b.weekday)
    .map((w) => ({
      label: WEEKDAY_LABELS[w.weekday] ?? `週${w.weekday}`,
      value: w.count,
    }));
}

/* ============================================================
 * 4. 一次性轉換(給 AnalysisChartsSection 用)
 * ========================================================== */

export interface AnalysisChartData {
  hot: ChartPoint[];
  cold: ChartPoint[];
  tail: ChartPoint[];
  oddEven: DonutSlice[];
  bigSmall: DonutSlice[];
  sumTrend: ChartSeries[];
  month: ChartPoint[];
  year: ChartSeries[];
  weekday: ChartPoint[];
}

export function buildAnalysisChartData(
  stats: AnalysisStatsInput,
  options: { topN?: number; bottomN?: number } = {},
): AnalysisChartData {
  const { topN = 10, bottomN = 10 } = options;
  return {
    hot: toHotNumbers(stats, topN),
    cold: toColdNumbers(stats, bottomN),
    tail: toTailRank(stats),
    oddEven: toOddEvenDonut(stats),
    bigSmall: toBigSmallDonut(stats),
    sumTrend: toSumTrend(stats),
    month: toMonthRank(stats),
    year: toYearTrend(stats),
    weekday: toWeekdayRank(stats),
  };
}

/**
 * 整體是否「資料不足」:9 項全空才算。
 * 個別項目空缺由各圖表自己顯示 EmptyChartState。
 */
export function isAnalysisDataEmpty(data: AnalysisChartData): boolean {
  return (
    data.hot.length === 0 &&
    data.cold.length === 0 &&
    data.tail.length === 0 &&
    data.oddEven.length === 0 &&
    data.bigSmall.length === 0 &&
    data.sumTrend.length === 0 &&
    data.month.length === 0 &&
    data.year.length === 0 &&
    data.weekday.length === 0
  );
}

/* ============================================================
 * 5. ⭐ 唯一對應點:把 statistics.ts 真實輸出 → AnalysisStatsInput
 * ──────────────────────────────────────────────────────────
 * RawAnalysisStats 對齊 AnalysisCenterPage 既有計算結果:
 *   - hot/cold 來自 calcHotCold(draws,'hot'|'cold',10)(HotColdItem[])
 *   - tail     來自 calcTailAnalysis(draws)(TailItem[])
 *   - oddEven  來自 calcOddEven(draws) 的 oddCount/evenCount
 *   - bigSmall 來自 calcBigSmall(draws,threshold) 的 bigCount/smallCount
 *   - sumSeries 由頁面用 draws 逐期主號加總衍生(statistics.ts 無逐期序列)
 *   - month/year/weekday 由頁面 dateStats(Record)轉成的陣列
 * 結構型別:HotColdItem / TailItem 帶有額外欄位(rank/rate),
 * 但結構上相容 {number,count} / {tail,count},可直接傳入。
 * ========================================================== */

export interface RawAnalysisStats {
  hot: NumberCount[];
  cold: NumberCount[];
  tail: { tail: number; count: number }[];
  oddEven: { oddCount: number; evenCount: number };
  bigSmall: { bigCount: number; smallCount: number };
  sumSeries: { period: string; sum: number }[];
  month: { month: number; count: number }[];
  year: { year: number; count: number }[];
  weekday: { weekday: number; count: number }[];
}

export function mapStatisticsToInput(raw: RawAnalysisStats): AnalysisStatsInput {
  return {
    hotNumbers: raw.hot,
    coldNumbers: raw.cold,
    tailFrequency: raw.tail,
    oddCount: raw.oddEven.oddCount,
    evenCount: raw.oddEven.evenCount,
    bigCount: raw.bigSmall.bigCount,
    smallCount: raw.bigSmall.smallCount,
    sumTrend: raw.sumSeries,
    monthDistribution: raw.month,
    yearDistribution: raw.year,
    weekdayDistribution: raw.weekday,
  };
}
