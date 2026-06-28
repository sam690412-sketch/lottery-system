/**
 * RatioDonutChart.tsx
 *
 * 甜甜圈(比例)圖(V23 / Chart Engine)。純 SVG。
 * 用 stroke-dasharray 環形畫法,中心顯示總計,底部附圖例。
 */

import { memo, useMemo } from 'react';
import { ChartCard } from './ChartCard';
import { ChartLegend } from './ChartLegend';
import {
  buildDonutSegments,
  CHART_COLORS,
  defaultFormatValue,
  type BaseChartProps,
  type DonutSlice,
  type LegendItem,
} from '../../utils/chartTransform';

export interface RatioDonutChartProps extends BaseChartProps {
  data: DonutSlice[];
  /** 環的粗細(px,相對 100 半徑座標)。 */
  thickness?: number;
  /** 中心主文字;未給則顯示總計。 */
  centerLabel?: string;
  /** 中心副文字。 */
  centerSubLabel?: string;
  /** 是否顯示圖例。預設 true。 */
  showLegend?: boolean;
}

const SIZE = 200;
const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function RatioDonutChartBase({
  data,
  title,
  subtitle,
  loading,
  empty,
  height = 240,
  formatValue = defaultFormatValue,
  thickness = 22,
  centerLabel,
  centerSubLabel,
  showLegend = true,
  className,
}: RatioDonutChartProps) {
  const { segments, total } = useMemo(
    () => buildDonutSegments(data ?? []),
    [data],
  );

  const isEmpty = empty ?? (segments.length === 0 || total === 0);

  const legendItems: LegendItem[] = segments.map((s) => ({
    label: s.label,
    color: s.color,
  }));
  const legendValues = segments.map((s) => `${s.percent.toFixed(0)}%`);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      loading={loading}
      empty={isEmpty}
      height={height}
      className={className}
      footer={
        showLegend ? (
          <ChartLegend items={legendItems} values={legendValues} />
        ) : undefined
      }
    >
      <div className="flex items-center justify-center" style={{ minHeight: height }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={Math.min(height, 240)}
          height={Math.min(height, 240)}
          role="img"
          aria-label={title ?? '比例圖'}
        >
          {/* 底軌 */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={CHART_COLORS.trackEmpty}
            strokeWidth={thickness}
          />
          {/* 各扇形 */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {segments.map((s, i) => {
              const dash = (s.percent / 100) * CIRCUMFERENCE;
              const gap = CIRCUMFERENCE - dash;
              const offset = -(s.offsetPercent / 100) * CIRCUMFERENCE;
              return (
                <circle
                  key={`${s.label}-${i}`}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                />
              );
            })}
          </g>
          {/* 中心文字 */}
          <text
            x={SIZE / 2}
            y={SIZE / 2 - 4}
            textAnchor="middle"
            fontSize={22}
            fontWeight={700}
            fill={CHART_COLORS.textPrimary}
          >
            {centerLabel ?? formatValue(total)}
          </text>
          <text
            x={SIZE / 2}
            y={SIZE / 2 + 16}
            textAnchor="middle"
            fontSize={11}
            fill={CHART_COLORS.textMuted}
          >
            {centerSubLabel ?? '總計'}
          </text>
        </svg>
      </div>
    </ChartCard>
  );
}

export const RatioDonutChart = memo(RatioDonutChartBase);
export default RatioDonutChart;
