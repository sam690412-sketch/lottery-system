/**
 * HeatmapChart.tsx
 *
 * 熱力圖(V23 / Chart Engine)。
 * 用 CSS grid + 橘色強度著色;rows × cols 自動由 cells 推導。
 * 適合「位置 × 區間」這類二維分佈統計。
 */

import { memo, useMemo } from 'react';
import { ChartCard } from './ChartCard';
import {
  buildHeatmapMatrix,
  defaultFormatLabel,
  defaultFormatValue,
  heatColor,
  normalize,
  type BaseChartProps,
  type HeatmapCell,
} from '../../utils/chartTransform';

export interface HeatmapChartProps extends BaseChartProps {
  data: HeatmapCell[];
  /** 是否在格子內顯示數值。預設 false(格子小時關閉較乾淨)。 */
  showValues?: boolean;
  /** 單一格子最小高度(px)。 */
  cellMinHeight?: number;
}

function HeatmapChartBase({
  data,
  title,
  subtitle,
  loading,
  empty,
  height = 240,
  formatLabel = defaultFormatLabel,
  formatValue = defaultFormatValue,
  showValues = false,
  cellMinHeight = 28,
  className,
}: HeatmapChartProps) {
  const { rows, cols, matrix, min, max } = useMemo(
    () => buildHeatmapMatrix(data ?? []),
    [data],
  );

  const isEmpty = empty ?? (rows.length === 0 || cols.length === 0);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      loading={loading}
      empty={isEmpty}
      height={height}
      className={className}
    >
      <div className="w-full overflow-x-auto">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `auto repeat(${cols.length}, minmax(28px, 1fr))`,
          }}
        >
          {/* 左上角空白 */}
          <div />
          {/* 欄標題 */}
          {cols.map((c) => (
            <div
              key={`col-${c}`}
              className="pb-1 text-center text-[10px] font-medium text-neutral-500"
            >
              {formatLabel(c)}
            </div>
          ))}

          {/* 每一列 */}
          {rows.map((rLabel, r) => (
            <div key={`row-${rLabel}`} className="contents">
              <div className="flex items-center pr-2 text-right text-[10px] font-medium text-neutral-500">
                {formatLabel(rLabel)}
              </div>
              {cols.map((_, c) => {
                const v = matrix[r][c];
                const intensity = v === undefined ? 0 : normalize(v, min, max);
                return (
                  <div
                    key={`cell-${r}-${c}`}
                    className="flex items-center justify-center rounded-sm text-[10px] tabular-nums text-neutral-100"
                    style={{
                      minHeight: cellMinHeight,
                      backgroundColor:
                        v === undefined ? 'transparent' : heatColor(intensity),
                    }}
                    title={v === undefined ? '' : formatValue(v)}
                  >
                    {showValues && v !== undefined ? formatValue(v) : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

export const HeatmapChart = memo(HeatmapChartBase);
export default HeatmapChart;
