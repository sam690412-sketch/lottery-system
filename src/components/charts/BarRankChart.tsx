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
  defaultFormatLabel,
  defaultFormatValue,
  extent,
  type BaseChartProps,
  type ChartPoint,
} from '../../utils/chartTransform';

/** 橘色系深淺(取代彩虹色票):由深到淺,維持同一色系。 */
const ORANGE_SCALE = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa'];

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
      color: colorful ? ORANGE_SCALE[i % ORANGE_SCALE.length] : CHART_ACCENT,
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
        className="flex flex-col gap-2.5 overflow-y-auto pr-0.5"
        style={{ maxHeight: height }}
      >
        {rows.map((r, i) => (
          <div
            key={`${r.label}-${i}`}
            className="flex items-center gap-2 sm:gap-3"
          >
            <span className="w-10 shrink-0 truncate text-right text-xs font-medium tabular-nums text-neutral-400 sm:w-12">
              {formatLabel(r.label)}
            </span>
            <div className="relative h-7 min-w-0 flex-1 overflow-hidden rounded-md bg-neutral-800/50">
              <div
                className="h-full rounded-md transition-[width] duration-500 ease-out"
                style={{ width: `${r.pct}%`, backgroundColor: r.color }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-neutral-200 sm:w-16">
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
