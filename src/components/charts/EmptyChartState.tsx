/**
 * EmptyChartState.tsx
 *
 * 圖表空狀態占位(V23 / Chart Engine)。
 * 當沒有資料可繪製時顯示。可被任何圖表元件複用。
 */

import { memo } from 'react';

export interface EmptyChartStateProps {
  /** 主訊息。 */
  message?: string;
  /** 次訊息 / 操作提示。 */
  hint?: string;
  /** 容器最小高度(px)。 */
  height?: number;
  className?: string;
}

function EmptyChartStateBase({
  message = '尚無資料',
  hint = '資料就緒後會在此顯示',
  height = 160,
  className = '',
}: EmptyChartStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 text-center ${className}`}
      style={{ minHeight: height }}
      role="status"
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-neutral-600"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M7 15l3-3 2 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm font-medium text-neutral-300">{message}</p>
      {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export const EmptyChartState = memo(EmptyChartStateBase);
export default EmptyChartState;
