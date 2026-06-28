/**
 * BarRankChart.tsx
 *
 * 水平長條(排行)圖(V23 / Chart Engine)。
 * 用 div + CSS 寬度比例繪製,響應式佳、不需 SVG 文字縮放處理。
 * 適合「項目排行 / 次數統計」這類由大到小的呈現。
 */

import { memo, useMemo } from 'react';
import { ChartCard } from './ChartCard';
import {
  CHART_ACCENT,
  colorAt,
  defaultFormatLabel,
  defaultFormatValue,
  extent,
  type BaseChartProps,
  type ChartPoint,
} from '../../utils/chartTransform';

export interface BarRankChartProps extends BaseChartProps {
  data: ChartPoint[];
  /** 是否自動由大到小排序。預設 true。 */
  sort?: boolean;
  /** 最多顯示幾列(超過截斷)。 */
  maxItems?: number;
  /** 單一顏色或彩色(依序取色票)。預設單一橘色。 */
  colorful?: boolean;
}

function BarRankChartBase({
  data,
  title,
  subtitle,
  loading,
  empty,
  height = 220,
  formatLabel = defaultFormatLabel,
  formatValue = defaultFormatValue,
  sort = true,
  maxItems,
  colorful = false,
  className,
}: BarRankChartProps) {
  const rows = useMemo(() => {
    let list = [...(data ?? [])];
    if (sort) list.sort((a, b) => b.value - a.value);
    if (maxItems) list = list.slice(0, maxItems);
    const { max } = extent(list.map((d) => d.value));
    return list.map((d, i) => ({
      ...d,
      pct: max === 0 ? 0 : Math.max(2, (d.value / max) * 100),
      color: colorful ? colorAt(i) : CHART_ACCENT,
    }));
  }, [data, sort, maxItems, colorful]);

  const isEmpty = empty ?? rows.length === 0;

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      loading={loading}
      empty={isEmpty}
      height={height}
      className={className}
    >
      <div
        className="flex flex-col gap-2 overflow-y-auto pr-1"
        style={{ maxHeight: height }}
      >
        {rows.map((r, i) => (
          <div key={`${r.label}-${i}`} className="flex items-center gap-3">
            <span className="w-12 shrink-0 truncate text-right text-xs font-medium text-neutral-400">
              {formatLabel(r.label)}
            </span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-neutral-800/60">
              <div
                className="h-full rounded-md transition-[width] duration-500 ease-out"
                style={{ width: `${r.pct}%`, backgroundColor: r.color }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-neutral-200">
              {formatValue(r.value)}
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

export const BarRankChart = memo(BarRankChartBase);
export default BarRankChart;
