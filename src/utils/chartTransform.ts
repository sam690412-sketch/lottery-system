/**
 * chartTransform.ts
 *
 * Chart Engine 的純資料層(V23 / Chart Engine)。
 * - 只放型別、純函式 transform、色票、mock 產生器。
 * - 不依賴 React、不依賴 HistoryProvider、不依賴任何真實資料來源。
 * - 所有 helper 皆為純函式,方便測試、tree-shake、memo。
 *
 * 注意:本檔案僅處理「數字與標籤」的幾何/比例運算,
 * 不產生任何分析結論或文字宣稱。
 */

/* ============================================================
 * 1. 基礎資料型別
 * ========================================================== */

/** 單一資料點:一個標籤對應一個數值。 */
export interface ChartPoint {
  label: string;
  value: number;
}

/** 一條序列(給折線 / 多序列長條使用)。 */
export interface ChartSeries {
  id: string;
  name: string;
  points: ChartPoint[];
  /** 可選自訂顏色;未給則由色票自動指派。 */
  color?: string;
}

/** 甜甜圈的一個扇形。 */
export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

/** 熱力圖的一個格子。 */
export interface HeatmapCell {
  row: string;
  col: string;
  value: number;
}

/** 圖例項目。 */
export interface LegendItem {
  label: string;
  color: string;
}

/**
 * 所有圖表元件共用的基礎 props。
 * 各圖表元件會 extends 此介面再加上自己的 data 形狀。
 */
export interface BaseChartProps {
  title?: string;
  subtitle?: string;
  loading?: boolean;
  /** 外部強制覆寫空狀態;未給時由元件依 data 自動判斷。 */
  empty?: boolean;
  /** 繪圖區高度(px),不含標題列。預設各元件自訂。 */
  height?: number;
  /** 格式化 X 軸 / 類別標籤。 */
  formatLabel?: (label: string) => string;
  /** 格式化數值(Y 軸、tooltip、圖例數字)。 */
  formatValue?: (value: number) => string;
  /** 額外 className,接到外層卡片。 */
  className?: string;
}

/* ============================================================
 * 2. 色票(沿用深色 + 橘色重點)
 * ========================================================== */

/** 主橘色重點色。 */
export const CHART_ACCENT = '#f97316'; // orange-500
export const CHART_ACCENT_SOFT = '#fb923c'; // orange-400

/** 多序列 / 多扇形時的循環色票(橘為主,輔以低彩度配色)。 */
export const CHART_PALETTE: readonly string[] = [
  '#f97316', // orange-500
  '#fb923c', // orange-400
  '#fbbf24', // amber-400
  '#60a5fa', // blue-400
  '#a78bfa', // violet-400
  '#34d399', // emerald-400
  '#f472b6', // pink-400
  '#94a3b8', // slate-400
];

/** 軸線 / 格線 / 文字的中性色(深色底適用)。 */
export const CHART_COLORS = {
  grid: '#27272a', // neutral-800
  axis: '#3f3f46', // neutral-700
  textPrimary: '#f5f5f5', // neutral-100
  textMuted: '#a1a1aa', // neutral-400
  trackEmpty: '#1f1f23', // 比卡片更深一點的軌道色
} as const;

/** 依索引取得循環色。 */
export function colorAt(index: number): string {
  return CHART_PALETTE[((index % CHART_PALETTE.length) + CHART_PALETTE.length) % CHART_PALETTE.length];
}

/* ============================================================
 * 3. 預設格式化
 * ========================================================== */

export const defaultFormatLabel = (label: string): string => label;

export const defaultFormatValue = (value: number): string => {
  if (!Number.isFinite(value)) return '-';
  if (Math.abs(value) >= 10000) return `${(value / 1000).toFixed(1)}k`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
};

/* ============================================================
 * 4. 幾何 / 比例運算(純函式)
 * ========================================================== */

export interface MinMax {
  min: number;
  max: number;
}

/** 取一組數值的 min / max;空陣列回 {0,0}。 */
export function extent(values: number[]): MinMax {
  if (values.length === 0) return { min: 0, max: 0 };
  let min = values[0];
  let max = values[0];
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

/** 跨多序列取整體 min / max。 */
export function seriesExtent(series: ChartSeries[]): MinMax {
  const all: number[] = [];
  for (const s of series) for (const p of s.points) all.push(p.value);
  return extent(all);
}

/**
 * 線性比例尺。把 domain 區間映射到 range 區間。
 * domainMin === domainMax 時回傳 range 中點,避免除以 0。
 */
export function scaleLinear(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): number {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  const t = (value - domainMin) / (domainMax - domainMin);
  return rangeMin + t * (rangeMax - rangeMin);
}

/** 0~1 正規化;max===min 時回 0。 */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

export interface SvgPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_PADDING: SvgPadding = { top: 12, right: 12, bottom: 28, left: 36 };

export interface XY {
  x: number;
  y: number;
}

/**
 * 把一條序列的點映射成 SVG 座標。
 * width/height 為整個 viewBox 尺寸;會扣掉 padding。
 */
export function pointsToCoords(
  points: ChartPoint[],
  width: number,
  height: number,
  domain: MinMax,
  padding: SvgPadding = DEFAULT_PADDING,
): XY[] {
  const innerW = Math.max(1, width - padding.left - padding.right);
  const innerH = Math.max(1, height - padding.top - padding.bottom);
  const lastIndex = Math.max(1, points.length - 1);
  return points.map((p, i) => {
    const x = padding.left + (i / lastIndex) * innerW;
    // y 反轉:值越大越靠上
    const y =
      padding.top +
      innerH -
      scaleLinear(p.value, domain.min, domain.max, 0, innerH);
    return { x, y };
  });
}

/** 把座標串成折線 path d。 */
export function buildLinePath(coords: XY[]): string {
  if (coords.length === 0) return '';
  return coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(' ');
}

/** 把折線封口成面積 path(往下到底)。 */
export function buildAreaPath(coords: XY[], baselineY: number): string {
  if (coords.length === 0) return '';
  const line = buildLinePath(coords);
  const first = coords[0];
  const last = coords[coords.length - 1];
  return `${line} L${last.x.toFixed(2)},${baselineY.toFixed(2)} L${first.x.toFixed(
    2,
  )},${baselineY.toFixed(2)} Z`;
}

/**
 * 計算甜甜圈每個扇形的 SVG arc 區段(用 stroke-dasharray 環形畫法所需資料)。
 * 回傳每段的百分比與累積起點百分比。
 */
export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  percent: number; // 0~100
  offsetPercent: number; // 累積起點 0~100
}

export function buildDonutSegments(slices: DonutSlice[]): {
  segments: DonutSegment[];
  total: number;
} {
  const total = slices.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  let cursor = 0;
  const segments: DonutSegment[] = slices.map((s, i) => {
    const value = Math.max(0, s.value);
    const percent = total === 0 ? 0 : (value / total) * 100;
    const seg: DonutSegment = {
      label: s.label,
      value,
      color: s.color ?? colorAt(i),
      percent,
      offsetPercent: cursor,
    };
    cursor += percent;
    return seg;
  });
  return { segments, total };
}

/**
 * 熱力圖:把 cells 整理成 rows × cols 矩陣 + 全域 min/max(供著色)。
 */
export interface HeatmapMatrix {
  rows: string[];
  cols: string[];
  /** matrix[rowIndex][colIndex] = value | undefined。 */
  matrix: (number | undefined)[][];
  min: number;
  max: number;
}

export function buildHeatmapMatrix(cells: HeatmapCell[]): HeatmapMatrix {
  const rows: string[] = [];
  const cols: string[] = [];
  const rowIndex = new Map<string, number>();
  const colIndex = new Map<string, number>();

  for (const c of cells) {
    if (!rowIndex.has(c.row)) {
      rowIndex.set(c.row, rows.length);
      rows.push(c.row);
    }
    if (!colIndex.has(c.col)) {
      colIndex.set(c.col, cols.length);
      cols.push(c.col);
    }
  }

  const matrix: (number | undefined)[][] = rows.map(() =>
    new Array<number | undefined>(cols.length).fill(undefined),
  );

  const values: number[] = [];
  for (const c of cells) {
    const r = rowIndex.get(c.row)!;
    const k = colIndex.get(c.col)!;
    matrix[r][k] = c.value;
    values.push(c.value);
  }

  const { min, max } = extent(values);
  return { rows, cols, matrix, min, max };
}

/** 依強度(0~1)回傳橘色系 rgba,供熱力圖格子背景。 */
export function heatColor(intensity: number): string {
  const t = Math.min(1, Math.max(0, intensity));
  // 從近乎透明的軌道色到飽和橘色
  const alpha = 0.08 + t * 0.92;
  return `rgba(249, 115, 22, ${alpha.toFixed(3)})`;
}

/* ============================================================
 * 5. Mock data helper(僅供開發 / 預覽,非真實資料)
 * ========================================================== */

/** 簡單可重現的偽隨機(避免每次 render 跳動)。 */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** 折線 mock:單序列趨勢。 */
export function mockTrendData(count = 12, seed = 42, name = '走勢'): ChartSeries {
  const rand = seededRandom(seed);
  let base = 30 + rand() * 20;
  const points: ChartPoint[] = Array.from({ length: count }, (_, i) => {
    base += (rand() - 0.45) * 12;
    base = Math.max(2, base);
    return { label: `第${i + 1}期`, value: Math.round(base) };
  });
  return { id: 'mock-trend', name, points };
}

/** 多序列折線 mock。 */
export function mockMultiTrendData(seriesCount = 2, count = 12): ChartSeries[] {
  return Array.from({ length: seriesCount }, (_, i) => {
    const s = mockTrendData(count, 42 + i * 7, `序列 ${i + 1}`);
    return { ...s, id: `mock-trend-${i}` };
  });
}

/** 長條排行 mock(已由大到小排序)。 */
export function mockBarData(count = 8, seed = 7): ChartPoint[] {
  const rand = seededRandom(seed);
  const points: ChartPoint[] = Array.from({ length: count }, (_, i) => ({
    label: String(i + 1).padStart(2, '0'),
    value: Math.round(10 + rand() * 90),
  }));
  return points.sort((a, b) => b.value - a.value);
}

/** 甜甜圈比例 mock。 */
export function mockDonutData(seed = 11): DonutSlice[] {
  const rand = seededRandom(seed);
  return [
    { label: '區間 A', value: Math.round(20 + rand() * 40) },
    { label: '區間 B', value: Math.round(20 + rand() * 40) },
    { label: '區間 C', value: Math.round(10 + rand() * 30) },
    { label: '區間 D', value: Math.round(5 + rand() * 25) },
  ];
}

/** 熱力圖 mock(rows × cols 網格)。 */
export function mockHeatmapData(rows = 5, cols = 7, seed = 99): HeatmapCell[] {
  const rand = seededRandom(seed);
  const cells: HeatmapCell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        row: `R${r + 1}`,
        col: `C${c + 1}`,
        value: Math.round(rand() * 100),
      });
    }
  }
  return cells;
}

/** Sparkline mock(純數值陣列)。 */
export function mockSparklineData(count = 16, seed = 5): number[] {
  const rand = seededRandom(seed);
  let base = 50;
  return Array.from({ length: count }, () => {
    base += (rand() - 0.5) * 14;
    base = Math.max(2, base);
    return Math.round(base);
  });
}
