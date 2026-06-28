/**
 * selectionScoreEngine.ts  (V24 — AI 選號評分引擎)
 *
 * 定位:統計分析,「非預測」。所有輸出為歷史統計觀點,僅供娛樂分析。
 * 用語一律使用:統計完整度 / 模型一致性 / 歷史吻合度 / 號碼平衡度 / 娛樂分析。
 * 嚴禁任何宣稱中獎、命中、保證或預測的字眼。
 *
 * 設計:
 * - 純函式、無副作用,可單測 / tree-shake。
 * - 不 import HistoryProvider / HistoryEngine / statistics.ts(Adapter Pattern:
 *   呼叫端把資料整理成本檔的輸入契約即可),彩種參數自帶 meta,故可獨立運作。
 * - 缺歷史資料時仍回傳「結構型」平衡分數,並在 reason 標示資料不足。
 */

/* ============================================================
 * 輸入 / 輸出契約
 * ========================================================== */

/** 一筆開獎(只需要主號;特別號/日期可選)。 */
export interface HistoryDrawInput {
  mainNumbers: number[];
  specialNumber?: number;
  date?: string;
}

/** 可選的預先統計(由呼叫端 adapter 提供;未給則由 history 自行計算)。 */
export interface SelectionAnalysisContext {
  /** 號碼 → 出現次數;提供時取代內部計算。 */
  frequency?: Record<number, number>;
}

export interface SelectionScoreInput {
  /** 彩種代碼(power / lotto649 / daily539 …);未知則用預設 meta。 */
  lotteryType: string;
  /** 使用者選的主號。 */
  numbers: number[];
  /** 歷史開獎(依期序;新到舊或舊到新皆可)。 */
  history: HistoryDrawInput[];
  /** 可選的預先統計。 */
  analysis?: SelectionAnalysisContext;
}

export interface SelectionScoreResult {
  overallScore: number;
  hotScore: number;
  coldScore: number;
  oddEvenScore: number;
  bigSmallScore: number;
  tailScore: number;
  sumScore: number;
  distributionScore: number;
  repeatScore: number;
  trendScore: number;
  reason: string[];
}

/* ============================================================
 * 彩種 meta(自含,不依賴 lotteryConfig)
 * ========================================================== */

interface LotteryMeta {
  maxNumber: number;
  pick: number;
  bigThreshold: number;
}

const LOTTERY_META: Record<string, LotteryMeta> = {
  power: { maxNumber: 38, pick: 6, bigThreshold: 19 },
  lotto649: { maxNumber: 49, pick: 6, bigThreshold: 25 },
  daily539: { maxNumber: 39, pick: 5, bigThreshold: 20 },
  lotto49c: { maxNumber: 49, pick: 6, bigThreshold: 25 },
  daily39c: { maxNumber: 39, pick: 5, bigThreshold: 20 },
};

const DEFAULT_META: LotteryMeta = { maxNumber: 49, pick: 6, bigThreshold: 25 };

/** 加權(總和 = 1)。最後 overallScore 由此計算。 */
const WEIGHTS = {
  hot: 0.12,
  cold: 0.1,
  oddEven: 0.12,
  bigSmall: 0.12,
  tail: 0.1,
  sum: 0.12,
  distribution: 0.12,
  repeat: 0.08,
  trend: 0.12,
} as const;

/* ============================================================
 * 數學小工具(純函式)
 * ========================================================== */

const clamp = (v: number, lo = 0, hi = 100): number =>
  Math.max(lo, Math.min(hi, v));
const round = (v: number): number => Math.round(v);
const mean = (a: number[]): number =>
  a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const std = (a: number[]): number => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
};
/** 高斯接近度:|diff| 越小越接近 100。 */
const closeness = (diff: number, sigma: number): number =>
  sigma <= 0 ? 100 : clamp(100 * Math.exp(-(diff * diff) / (2 * sigma * sigma)));

const countOdd = (nums: number[]): number =>
  nums.reduce((acc, n) => acc + (n % 2 === 1 ? 1 : 0), 0);
const countBig = (nums: number[], threshold: number): number =>
  nums.reduce((acc, n) => acc + (n >= threshold ? 1 : 0), 0);
const distinctTails = (nums: number[]): number =>
  new Set(nums.map((n) => n % 10)).size;
const sumOf = (nums: number[]): number => nums.reduce((a, b) => a + b, 0);

/* ============================================================
 * 主函式
 * ========================================================== */

export function scoreSelection(input: SelectionScoreInput): SelectionScoreResult {
  const meta = LOTTERY_META[input.lotteryType] ?? DEFAULT_META;

  // 去重、取有效號碼
  const sel = Array.from(new Set(input.numbers ?? [])).filter(
    (n) => Number.isFinite(n) && n >= 1 && n <= meta.maxNumber,
  );
  const pick = sel.length || meta.pick;

  const draws = (input.history ?? []).filter(
    (d) => Array.isArray(d.mainNumbers) && d.mainNumbers.length > 0,
  );
  const N = draws.length;
  const reason: string[] = [];

  // 頻率表(優先用 analysis.frequency)
  const freq: Record<number, number> = {};
  for (let i = 1; i <= meta.maxNumber; i++) freq[i] = 0;
  if (input.analysis?.frequency) {
    for (const [k, v] of Object.entries(input.analysis.frequency)) {
      const num = Number(k);
      if (freq[num] !== undefined) freq[num] = v;
    }
  } else {
    for (const d of draws)
      for (const n of d.mainNumbers) if (freq[n] !== undefined) freq[n] += 1;
  }

  // 熱門 / 冷門池(各取約 1/3)
  const ranked = Object.keys(freq)
    .map(Number)
    .sort((a, b) => freq[b] - freq[a]);
  const third = Math.max(1, Math.floor(meta.maxNumber / 3));
  const hotPool = new Set(ranked.slice(0, third));
  const coldPool = new Set(ranked.slice(-third));

  // ---- 1. 熱門號符合度 ----
  const selHot = sel.filter((n) => hotPool.has(n)).length;
  const avgHot = N ? mean(draws.map((d) => d.mainNumbers.filter((n) => hotPool.has(n)).length)) : pick / 3;
  const hotScore = round(closeness(selHot - avgHot, Math.max(1, meta.pick * 0.35)));
  reason.push(
    selHot > avgHot + 1
      ? '熱門號偏多'
      : selHot < avgHot - 1
        ? '熱門號偏少'
        : '熱門號比例正常',
  );

  // ---- 2. 冷門號平衡 ----
  const selCold = sel.filter((n) => coldPool.has(n)).length;
  const avgCold = N ? mean(draws.map((d) => d.mainNumbers.filter((n) => coldPool.has(n)).length)) : pick / 3;
  const coldScore = round(closeness(selCold - avgCold, Math.max(1, meta.pick * 0.35)));
  reason.push(
    selCold > avgCold + 1
      ? '冷門號偏多'
      : selCold < avgCold - 1
        ? '冷門號偏少'
        : '冷門號平衡良好',
  );

  // ---- 3. 奇偶比例 ----
  const selOdd = countOdd(sel);
  const avgOdd = N ? mean(draws.map((d) => countOdd(d.mainNumbers))) : pick / 2;
  const oddEvenScore = round(closeness(selOdd - avgOdd, Math.max(1, meta.pick * 0.3)));
  reason.push(oddEvenScore >= 70 ? '奇偶比例合理' : selOdd > avgOdd ? '奇數偏多' : '偶數偏多');

  // ---- 4. 大小比例 ----
  const selBig = countBig(sel, meta.bigThreshold);
  const avgBig = N ? mean(draws.map((d) => countBig(d.mainNumbers, meta.bigThreshold))) : pick / 2;
  const bigSmallScore = round(closeness(selBig - avgBig, Math.max(1, meta.pick * 0.3)));
  reason.push(bigSmallScore >= 70 ? '大小比例合理' : selBig > avgBig ? '大號偏多' : '小號偏多');

  // ---- 5. 尾數分散 ----
  const selTails = distinctTails(sel);
  const tailScore = round(clamp((selTails / Math.max(1, pick)) * 100));
  reason.push(tailScore >= 80 ? '尾數分布均勻' : '尾數較集中');

  // ---- 6. 和值區間 ----
  const selSum = sumOf(sel);
  const histSums = draws.map((d) => sumOf(d.mainNumbers));
  const meanSum = N ? mean(histSums) : (meta.maxNumber + 1) * (pick / 2);
  const sumSigma = Math.max(1, N ? std(histSums) : meta.maxNumber * 0.5);
  const sumScore = round(closeness(selSum - meanSum, sumSigma));
  reason.push(
    sumScore >= 70
      ? '和值位於常見區間'
      : selSum > meanSum
        ? '和值偏高'
        : '和值偏低',
  );

  // ---- 7. 區域分布(把號碼範圍切成 pick 段,看覆蓋幾段) ----
  const segCount = Math.max(1, pick);
  const segSize = meta.maxNumber / segCount;
  const occupied = new Set(sel.map((n) => Math.min(segCount - 1, Math.floor((n - 1) / segSize))));
  const distributionScore = round(clamp((occupied.size / segCount) * 100));
  reason.push(distributionScore >= 80 ? '號碼平衡度佳' : '號碼集中於部分區域');

  // ---- 8. 重覆號控制(與最近一期重疊,對照歷史平均) ----
  let repeatScore = 75;
  if (N >= 2) {
    const overlaps: number[] = [];
    for (let i = 1; i < N; i++) {
      const prev = new Set(draws[i - 1].mainNumbers);
      overlaps.push(draws[i].mainNumbers.filter((n) => prev.has(n)).length);
    }
    const avgOverlap = mean(overlaps);
    const recent = new Set(draws[N - 1].mainNumbers);
    const selOverlap = sel.filter((n) => recent.has(n)).length;
    repeatScore = round(closeness(selOverlap - avgOverlap, Math.max(1, meta.pick * 0.4)));
    reason.push(
      selOverlap > avgOverlap + 1 ? '與近期重覆偏多' : '重覆號控制得宜',
    );
  } else {
    reason.push('重覆號:歷史資料不足以評估');
  }

  // ---- 9. 近期趨勢(近半 vs 前半,選號是否落在升溫號) ----
  let trendScore = 60;
  if (N >= 4) {
    const half = Math.floor(N / 2);
    const recentDraws = draws.slice(N - half);
    const oldDraws = draws.slice(0, half);
    const recentFreq: Record<number, number> = {};
    const oldFreq: Record<number, number> = {};
    for (let i = 1; i <= meta.maxNumber; i++) {
      recentFreq[i] = 0;
      oldFreq[i] = 0;
    }
    for (const d of recentDraws) for (const n of d.mainNumbers) if (recentFreq[n] !== undefined) recentFreq[n] += 1;
    for (const d of oldDraws) for (const n of d.mainNumbers) if (oldFreq[n] !== undefined) oldFreq[n] += 1;
    const upPool = new Set(
      Object.keys(recentFreq).map(Number).filter((n) => recentFreq[n] > oldFreq[n]),
    );
    const selUp = sel.filter((n) => upPool.has(n)).length;
    const expectedUp = pick * (upPool.size / meta.maxNumber);
    trendScore = round(closeness(selUp - expectedUp, Math.max(1, meta.pick * 0.5)));
    reason.push(trendScore >= 70 ? '近期趨勢吻合度佳' : '與近期趨勢略有偏離');
  } else {
    reason.push('近期趨勢:歷史資料不足以評估');
  }

  // ---- 10. 整體一致性 → overallScore(加權) ----
  const overallScore = round(
    hotScore * WEIGHTS.hot +
      coldScore * WEIGHTS.cold +
      oddEvenScore * WEIGHTS.oddEven +
      bigSmallScore * WEIGHTS.bigSmall +
      tailScore * WEIGHTS.tail +
      sumScore * WEIGHTS.sum +
      distributionScore * WEIGHTS.distribution +
      repeatScore * WEIGHTS.repeat +
      trendScore * WEIGHTS.trend,
  );

  if (N === 0) reason.unshift('歷史資料不足,以下為基本號碼平衡度。');
  reason.push(`整體統計完整度 ${overallScore} 分。`);
  reason.push('娛樂用途。');

  return {
    overallScore,
    hotScore,
    coldScore,
    oddEvenScore,
    bigSmallScore,
    tailScore,
    sumScore,
    distributionScore,
    repeatScore,
    trendScore,
    reason,
  };
}

/* ============================================================
 * 保留接口(未實作,V24 之後再做)
 * ──────────────────────────────────────────────
 * 這些型別先佔位,供未來 AI Report / PDF / 歷史回測接線使用,
 * 本版刻意不提供實作。
 * ========================================================== */

export interface SelectionAiReportRequest {
  result: SelectionScoreResult;
  numbers: number[];
  lotteryType: string;
}

export interface SelectionPdfExportRequest {
  result: SelectionScoreResult;
  title?: string;
}

export interface SelectionBacktestRequest {
  lotteryType: string;
  numbers: number[];
  rangeDraws?: number;
}

export default scoreSelection;
