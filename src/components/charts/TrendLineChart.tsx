/**
 * TrendLineChart.tsx  (V23-E 可讀性修正)
 *
 * 折線(走勢)圖。純 SVG,但改為「量測容器寬度 → 以真實像素繪製」,
 * 不再使用 preserveAspectRatio="none"(那會非等比拉伸、使座標文字變形/被切)。
 *
 * 可讀性重點:
 * - 左軸留白 ≥ 48px、底部 ≥ 36px,Y 數字與 X 日期不會被切。
 * - X 軸最多 4~6 個 tick,日期不重疊。
 * - 折線左右內縮,不貼邊;上方留白,不貼頂。
 * - 字級用真實 px,小螢幕仍可讀。
 *
 * props API 與先前完全相同。
 */

import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChartCard } from './ChartCard';
import { ChartLegend } from './ChartLegend';
import {
  buildAreaPath,
  buildLinePath,
  CHART_COLORS,
  colorAt,
  defaultFormatLabel,
  defaultFormatValue,
  pointsToCoords,
  scaleLinear,
  seriesExtent,
  type BaseChartProps,
  type ChartSeries,
  type LegendItem,
} from '../../utils/chartTransform';

export interface TrendLineChartProps extends BaseChartProps {
  /** 一條或多條序列。 */
  data: ChartSeries[];
  /** 是否顯示底部圖例(多序列時建議開啟)。預設:序列 > 1 時開啟。 */
  showLegend?: boolean;
  /** 主序列是否顯示面積漸層。預設 true。 */
  showArea?: boolean;
  /** Y 軸格線數量。 */
  yTicks?: number;
}

/** 軸留白:left ≥ 48、bottom ≥ 36(含安全邊距)。 */
const PAD = { top: 16, right: 18, bottom: 40, left: 52 };
/** 折線繪圖區再內縮,避免貼邊。 */
const PLOT_INSET = 6;
/** X 軸最多顯示的 tick 數。 */
const MAX_X_TICKS = 6;
/** 尚未量到寬度前的後備寬度。 */
const FALLBACK_WIDTH = 560;

/** 量測容器實際寬度(隨 resize 更新),讓 SVG 用真實像素繪製。 */
function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(el);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', update);
    }
    return () => {
      if (ro) ro.disconnect();
      else if (typeof window !== 'undefined') window.removeEventListener('resize', update);
    };
  }, []);
  return { ref, width };
}

/** 從 count 個點挑出最多 maxTicks 個、含頭尾、均勻分佈的索引。 */
function pickTickIndices(count: number, maxTicks: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  const n = Math.min(maxTicks, count);
  const idx = new Set<number>();
  for (let i = 0; i < n; i++) idx.add(Math.round((i * (count - 1)) / (n - 1)));
  return Array.from(idx).sort((a, b) => a - b);
}

function TrendLineChartBase({
  data,
  title,
  subtitle,
  loading,
  empty,
  height = 240,
  formatLabel = defaultFormatLabel,
  formatValue = defaultFormatValue,
  showLegend,
  showArea = true,
  yTicks = 4,
  className,
}: TrendLineChartProps) {
  const gradientId = useId();
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  const W = width || FALLBACK_WIDTH;

  const series = data ?? [];
  const isEmpty = empty ?? series.every((s) => s.points.length === 0);
  const legendOn = showLegend ?? series.length > 1;

  const view = useMemo(() => {
    const H = height;
    const ext = seriesExtent(series);
    const span = ext.max - ext.min || 1;
    const dom = { min: ext.min, max: ext.max + span * 0.1 }; // 上方留白,不貼頂
    const baselineY = H - PAD.bottom;
    const plotPad = {
      ...PAD,
      left: PAD.left + PLOT_INSET,
      right: PAD.right + PLOT_INSET,
    };

    const lines = series.map((s, i) => {
      const coords = pointsToCoords(s.points, W, H, dom, plotPad);
      return {
        id: s.id,
        name: s.name,
        color: s.color ?? colorAt(i),
        linePath: buildLinePath(coords),
        areaPath: buildAreaPath(coords, baselineY),
      };
    });

    const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => {
      const v = dom.min + ((dom.max - dom.min) * i) / yTicks;
      const y = PAD.top + (H - PAD.top - PAD.bottom) * (1 - i / yTicks);
      return { v, y };
    });

    const pts = series[0]?.points ?? [];
    const last = Math.max(1, pts.length - 1);
    const xTicks = pickTickIndices(pts.length, MAX_X_TICKS).map((i) => ({
      label: pts[i]?.label ?? '',
      x: scaleLinear(i, 0, last, plotPad.left, W - plotPad.right),
    }));

    return { H, lines, yTickValues, xTicks };
  }, [series, W, height, yTicks]);

  const legendItems: LegendItem[] = view.lines.map((l) => ({
    label: l.name,
    color: l.color,
  }));

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      loading={loading}
      empty={isEmpty}
      height={height}
      className={className}
      footer={legendOn ? <ChartLegend items={legendItems} /> : undefined}
    >
      <div ref={ref} className="w-full">
        <svg
          width={W}
          height={height}
          viewBox={`0 0 ${W} ${height}`}
          role="img"
          aria-label={title ?? '折線圖'}
          style={{ display: 'block', maxWidth: '100%' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={view.lines[0]?.color ?? '#f97316'} stopOpacity="0.28" />
              <stop offset="100%" stopColor={view.lines[0]?.color ?? '#f97316'} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y 格線 + 數值(在左側留白內,不被切) */}
          {view.yTickValues.map((t, i) => (
            <g key={`y-${i}`}>
              <line
                x1={PAD.left}
                y1={t.y}
                x2={W - PAD.right}
                y2={t.y}
                stroke={CHART_COLORS.grid}
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={t.y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill={CHART_COLORS.textMuted}
              >
                {formatValue(t.v)}
              </text>
            </g>
          ))}

          {showArea && view.lines[0] ? (
            <path d={view.lines[0].areaPath} fill={`url(#${gradientId})`} />
          ) : null}

          {view.lines.map((l) => (
            <path
              key={l.id}
              d={l.linePath}
              fill="none"
              stroke={l.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* X 標籤(最多 4~6 個,不重疊) */}
          {view.xTicks.map((xt, i) => (
            <text
              key={`x-${i}`}
              x={xt.x}
              y={view.H - 12}
              textAnchor="middle"
              fontSize={11}
              fill={CHART_COLORS.textMuted}
            >
              {formatLabel(xt.label)}
            </text>
          ))}
        </svg>
      </div>
    </ChartCard>
  );
}

export const TrendLineChart = memo(TrendLineChartBase);
export default TrendLineChart;
