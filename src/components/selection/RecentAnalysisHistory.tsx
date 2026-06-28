/**
 * RecentAnalysisHistory.tsx  (V24-C)
 *
 * 「最近分析」清單(presentational)。只負責呈現,資料由呼叫端傳入。
 * 配色沿用深色 + 橘色重點,標示娛樂用途。
 */

import { memo } from 'react';
import type { RecentAnalysisRecord } from '@/utils/recentAnalysisStore';

const GAME_LABEL: Record<string, string> = {
  power: '威力彩',
  lotto649: '大樂透',
  daily539: '今彩539',
};

export interface RecentAnalysisHistoryProps {
  records: RecentAnalysisRecord[];
  onClear?: () => void;
  className?: string;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function scoreColor(v: number): string {
  if (v >= 80) return 'text-orange-300';
  if (v >= 60) return 'text-amber-300';
  return 'text-neutral-400';
}

function RecentAnalysisHistoryBase({
  records,
  onClear,
  className = '',
}: RecentAnalysisHistoryProps) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-neutral-900 p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-200">最近分析</h3>
        {records.length > 0 && onClear ? (
          <button
            onClick={onClear}
            className="text-xs text-neutral-500 transition-colors hover:text-neutral-300"
          >
            清除
          </button>
        ) : null}
      </div>

      {records.length === 0 ? (
        <p className="py-4 text-center text-xs text-neutral-600">尚無分析紀錄</p>
      ) : (
        <ul className="space-y-2">
          {records.map((r, i) => (
            <li
              key={`${r.time}-${i}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.04] bg-neutral-950/40 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300">
                    {GAME_LABEL[r.lotteryType] ?? r.lotteryType}
                  </span>
                  <span className="text-[11px] text-neutral-600">{formatTime(r.time)}</span>
                </div>
                <p className="mt-1 truncate text-xs tabular-nums text-neutral-300">
                  {r.numbers.map((n) => String(n).padStart(2, '0')).join(' ')}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-lg font-bold tabular-nums ${scoreColor(r.overallScore)}`}>
                  {r.overallScore}
                </p>
                <p className="text-[10px] text-neutral-600">分</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const RecentAnalysisHistory = memo(RecentAnalysisHistoryBase);
export default RecentAnalysisHistory;
