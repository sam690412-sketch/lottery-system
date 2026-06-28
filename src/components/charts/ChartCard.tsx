/**
 * ChartCard.tsx
 *
 * 所有圖表共用的卡片外殼(V23 / Chart Engine)。
 *
 * 統一負責:
 * - 卡片邊框 / 圓角 / 深色底(沿用既有風格)
 * - title / subtitle 標題列
 * - loading 骨架
 * - empty 空狀態(委派 EmptyChartState)
 * - height 繪圖區高度
 *
 * 各圖表元件把實際 SVG / 圖形當 children 傳入。
 * 這樣 8 個圖表不必各自重寫狀態邏輯,維持高內聚低耦合。
 */

import { memo, type ReactNode } from 'react';
import { EmptyChartState } from './EmptyChartState';

export interface ChartCardProps {
  title?: string;
  subtitle?: string;
  loading?: boolean;
  empty?: boolean;
  /** 繪圖區高度(px),不含標題列。 */
  height?: number;
  /** 標題列右側自訂區(例如切換鈕、時間範圍)。 */
  actions?: ReactNode;
  /** 卡片底部自訂區(例如圖例)。 */
  footer?: ReactNode;
  /** 空狀態自訂訊息。 */
  emptyMessage?: string;
  emptyHint?: string;
  className?: string;
  /** 實際圖形內容。 */
  children?: ReactNode;
}

function LoadingSkeleton({ height }: { height: number }) {
  return (
    <div
      className="flex w-full animate-pulse items-end gap-2"
      style={{ height }}
      aria-hidden="true"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-neutral-800"
          style={{ height: `${30 + ((i * 37) % 60)}%` }}
        />
      ))}
    </div>
  );
}

function ChartCardBase({
  title,
  subtitle,
  loading = false,
  empty = false,
  height = 220,
  actions,
  footer,
  emptyMessage,
  emptyHint,
  className = '',
  children,
}: ChartCardProps) {
  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <section
      className={`rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 ${className}`}
    >
      {hasHeader ? (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h3 className="truncate text-sm font-semibold text-neutral-100">
                {title}
              </h3>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-neutral-500">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      ) : null}

      <div className="relative w-full" style={{ minHeight: height }}>
        {loading ? (
          <LoadingSkeleton height={height} />
        ) : empty ? (
          <EmptyChartState
            height={height}
            message={emptyMessage}
            hint={emptyHint}
          />
        ) : (
          children
        )}
      </div>

      {footer && !loading && !empty ? (
        <footer className="mt-3 border-t border-neutral-800/80 pt-3">{footer}</footer>
      ) : null}
    </section>
  );
}

export const ChartCard = memo(ChartCardBase);
export default ChartCard;
