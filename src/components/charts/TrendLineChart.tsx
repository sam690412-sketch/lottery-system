/**
 * TrendLineChart.tsx
 *
 * 折線(走勢)圖(V23 / Chart Engine)。純 SVG。
 * - 支援單序列或多序列。
 * - 主序列附淡橘色面積漸層。
 * - 自動格線與 X / Y 標籤。
 */

import { memo, useId, useMemo } from 'react';
import { ChartCard } from './ChartCard';
import { ChartLegend } from './ChartLegend';
import {
  buildAreaPath,
  buildLinePath,
  CHART_COLORS,
  colorAt,
  DEFAULT_PADDING,
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

const VIEW_W = 600;

function TrendLineChartBase({
  data,
  title,
  subtitle,
  loading,
  empty,
  height = 220,
  formatLabel = defaultFormatLabel,
  formatValue = defaultFormatValue,
  showLegend,
  showArea = true,
  yTicks = 4,
  className,
}: TrendLineChartProps) {
  const gradientId = useId();

  const series = data ?? [];
  const isEmpty = empty ?? series.every((s) => s.points.length === 0);
  const legendOn = showLegend ?? series.length > 1;

  const view = useMemo(() => {
    const VIEW_H = height;
    const domain = seriesExtent(series);
    // 給上下一點留白,避免線貼邊
    const pad = (domain.max - domain.min) * 0.1 || 1;
    const dom = { min: Math.min(domain.min, domain.min - pad * 0), max: domain.max + pad };
    const baselineY = VIEW_H - DEFAULT_PADDING.bottom;

    const lines = series.map((s, i) => {
      const coords = pointsToCoords(s.points, VIEW_W, VIEW_H, dom);
      return {
        id: s.id,
        name: s.name,
        color: s.color ?? colorAt(i),
        linePath: buildLinePath(coords),
        areaPath: buildAreaPath(coords, baselineY),
        coords,
      };
    });

    const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => {
      const v = dom.min + ((dom.max - dom.min) * i) / yTicks;
      const y =
        DEFAULT_PADDING.top +
        (VIEW_H - DEFAULT_PADDING.top - DEFAULT_PADDING.bottom) *
          (1 - i / yTicks);
      return { v, y };
    });

    // X 標籤:取主序列的 label,過多時抽樣
    const main = series[0];
    const xLabels =
      main?.points.map((p, i) => {
        const x = scaleLinear(
          i,
          0,
          Math.max(1, main.points.length - 1),
          DEFAULT_PADDING.left,
          VIEW_W - DEFAULT_PADDING.right,
        );
        return { label: p.label, x };
      }) ?? [];
    const step = Math.ceil(xLabels.length / 6) || 1;

    return { VIEW_H, lines, yTickValues, xLabels, step, baselineY };
  }, [series, height, yTicks]);

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
      <svg
        viewBox={`0 0 ${VIEW_W} ${view.VIEW_H}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={title ?? '折線圖'}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={view.lines[0]?.color ?? '#f97316'} stopOpacity="0.28" />
            <stop offset="100%" stopColor={view.lines[0]?.color ?? '#f97316'} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y 格線 + 數值 */}
        {view.yTickValues.map((t, i) => (
          <g key={`y-${i}`}>
            <line
              x1={DEFAULT_PADDING.left}
              y1={t.y}
              x2={VIEW_W - DEFAULT_PADDING.right}
              y2={t.y}
              stroke={CHART_COLORS.grid}
              strokeWidth={1}
            />
            <text
              x={DEFAULT_PADDING.left - 6}
              y={t.y}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill={CHART_COLORS.textMuted}
            >
              {formatValue(t.v)}
            </text>
          </g>
        ))}

        {/* 面積(僅主序列) */}
        {showArea && view.lines[0] ? (
          <path d={view.lines[0].areaPath} fill={`url(#${gradientId})`} />
        ) : null}

        {/* 折線 */}
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

        {/* X 標籤 */}
        {view.xLabels
          .filter((_, i) => i % view.step === 0)
          .map((xl, i) => (
            <text
              key={`x-${i}`}
              x={xl.x}
              y={view.VIEW_H - 8}
              textAnchor="middle"
              fontSize={10}
              fill={CHART_COLORS.textMuted}
            >
              {formatLabel(xl.label)}
            </text>
          ))}
      </svg>
    </ChartCard>
  );
}

export const TrendLineChart = memo(TrendLineChartBase);
export default TrendLineChart;
