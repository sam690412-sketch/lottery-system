/**
 * ChartLegend.tsx
 *
 * 可複用圖例列(V23 / Chart Engine)。
 * 接受 items(色塊 + 標籤),可選顯示數值。
 */

import { memo } from 'react';
import type { LegendItem } from '../../utils/chartTransform';

export interface ChartLegendProps {
  items: LegendItem[];
  /** 與 items 對齊的數值(可選);提供時顯示在標籤後。 */
  values?: (string | number)[];
  /** 排列方向。 */
  direction?: 'row' | 'column';
  className?: string;
}

function ChartLegendBase({
  items,
  values,
  direction = 'row',
  className = '',
}: ChartLegendProps) {
  if (items.length === 0) return null;

  return (
    <ul
      className={`flex flex-wrap gap-x-4 gap-y-1.5 ${
        direction === 'column' ? 'flex-col' : 'flex-row'
      } ${className}`}
    >
      {items.map((item, i) => (
        <li
          key={`${item.label}-${i}`}
          className="flex items-center gap-1.5 text-xs text-neutral-400"
        >
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="text-neutral-300">{item.label}</span>
          {values && values[i] !== undefined ? (
            <span className="font-medium tabular-nums text-neutral-400">
              {values[i]}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export const ChartLegend = memo(ChartLegendBase);
export default ChartLegend;
