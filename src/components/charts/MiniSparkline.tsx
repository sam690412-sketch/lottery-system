/**
 * MiniSparkline.tsx
 *
 * 迷你走勢線(V23 / Chart Engine)。純 SVG、無軸線、無卡片。
 * 設計成可內嵌在表格列、統計卡角落等小空間。
 *
 * 注意:這是「裸元件」,不使用 ChartCard 外殼,以維持輕量。
 * loading / empty 以最小占位處理。
 */

import { memo, useId, useMemo } from 'react';
import {
  buildAreaPath,
  buildLinePath,
  CHART_ACCENT,
  extent,
  pointsToCoords,
  type ChartPoint,
} from '../../utils/chartTransform';

export interface MiniSparklineProps {
  /** 數值陣列,或 ChartPoint 陣列。 */
  data: number[] | ChartPoint[];
  width?: number;
  height?: number;
  color?: string;
  /** 是否顯示淡色面積。預設 true。 */
  showArea?: boolean;
  /** 是否高亮最後一點。預設 true。 */
  showLastDot?: boolean;
  loading?: boolean;
  empty?: boolean;
  className?: string;
}

function toPoints(data: number[] | ChartPoint[]): ChartPoint[] {
  if (data.length === 0) return [];
  if (typeof data[0] === 'number') {
    return (data as number[]).map((v, i) => ({ label: String(i), value: v }));
  }
  return data as ChartPoint[];
}

function MiniSparklineBase({
  data,
  width = 96,
  height = 28,
  color = CHART_ACCENT,
  showArea = true,
  showLastDot = true,
  loading = false,
  empty,
  className = '',
}: MiniSparklineProps) {
  const gradientId = useId();
  const points = useMemo(() => toPoints(data ?? []), [data]);
  const isEmpty = empty ?? points.length < 2;

  const view = useMemo(() => {
    if (points.length < 2) return null;
    const { min, max } = extent(points.map((p) => p.value));
    const pad = { top: 3, right: 3, bottom: 3, left: 3 };
    const coords = pointsToCoords(points, width, height, { min, max }, pad);
    return {
      linePath: buildLinePath(coords),
      areaPath: buildAreaPath(coords, height - pad.bottom),
      last: coords[coords.length - 1],
    };
  }, [points, width, height]);

  if (loading) {
    return (
      <span
        className={`inline-block animate-pulse rounded bg-neutral-800 ${className}`}
        style={{ width, height }}
        aria-hidden="true"
      />
    );
  }

  if (isEmpty || !view) {
    return (
      <span
        className={`inline-flex items-center justify-center text-[10px] text-neutral-600 ${className}`}
        style={{ width, height }}
      >
        —
      </span>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="迷你走勢"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea ? <path d={view.areaPath} fill={`url(#${gradientId})`} /> : null}
      <path
        d={view.linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {showLastDot ? (
        <circle cx={view.last.x} cy={view.last.y} r={2} fill={color} />
      ) : null}
    </svg>
  );
}

export const MiniSparkline = memo(MiniSparklineBase);
export default MiniSparkline;
