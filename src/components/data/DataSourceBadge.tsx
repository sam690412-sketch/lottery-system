// ============================================================
// V25-E — 資料來源徽章
// 顯示來源(simulated/official)、總期數、日期區間、最新日期、驗證狀態。
// 純呈現元件,不取資料、不寫入。
// ============================================================
import { memo } from 'react';

export type DataSourceSeverity = 'green' | 'yellow' | 'red';

export interface DataSourceBadgeProps {
  /** 來源種類('simulated' | 'official' | 其他)。 */
  sourceKind: string;
  totalCount: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  latestDate?: string | null;
  updatedAt?: string | null;
  severity: DataSourceSeverity;
  className?: string;
}

const SEVERITY_META: Record<DataSourceSeverity, { dot: string; label: string }> = {
  green: { dot: 'bg-emerald-400', label: '驗證通過' },
  yellow: { dot: 'bg-amber-400', label: '有警告' },
  red: { dot: 'bg-red-500', label: '有錯誤' },
};

function DataSourceBadgeBase({
  sourceKind,
  totalCount,
  dateFrom,
  dateTo,
  latestDate,
  updatedAt,
  severity,
  className = '',
}: DataSourceBadgeProps) {
  const isOfficial = sourceKind === 'official';
  const sev = SEVERITY_META[severity];

  return (
    <div className={`rounded-xl border p-3 ${isOfficial ? 'border-emerald-800/50 bg-emerald-950/15' : 'border-amber-800/50 bg-amber-950/15'} ${className}`}>
      {/* 來源徽章 */}
      <div className="flex flex-wrap items-center gap-2">
        {isOfficial ? (
          <>
            <span className="rounded-md bg-emerald-600/30 px-2 py-0.5 text-xs font-bold text-emerald-200">官方資料</span>
            <span className="rounded-md bg-emerald-600/20 px-2 py-0.5 text-[11px] text-emerald-300">已驗證</span>
            {updatedAt && <span className="text-[11px] text-emerald-300/70">更新時間：{updatedAt}</span>}
          </>
        ) : (
          <>
            <span className="rounded-md bg-amber-600/30 px-2 py-0.5 text-xs font-bold text-amber-200">示意資料</span>
            <span className="rounded-md bg-amber-600/20 px-2 py-0.5 text-[11px] text-amber-300">非官方開獎</span>
            <span className="rounded-md bg-amber-600/10 px-2 py-0.5 text-[11px] text-amber-300/90">僅供娛樂分析</span>
          </>
        )}
        {/* 驗證狀態燈 */}
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-300">
          <span className={`inline-block h-2 w-2 rounded-full ${sev.dot}`} />
          {sev.label}
        </span>
      </div>

      {/* 資料概況 */}
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-400 sm:grid-cols-4">
        <span>總期數：<span className="text-gray-200">{totalCount}</span></span>
        <span>日期區間：<span className="text-gray-200">{dateFrom || '—'} ~ {dateTo || '—'}</span></span>
        <span>最新日期：<span className="text-gray-200">{latestDate || '—'}</span></span>
        <span>來源：<span className="text-gray-200">{isOfficial ? '官方' : '示意（simulated）'}</span></span>
      </div>

      {/* 嚴重度警示 */}
      {severity === 'red' && (
        <p className="mt-2 rounded-md border border-red-800/50 bg-red-950/25 px-2 py-1.5 text-[11px] text-red-300">
          ⚠️ 此彩種資料不適合作正式兌獎或官方查詢。
        </p>
      )}
      {severity === 'yellow' && (
        <p className="mt-2 rounded-md border border-amber-800/40 bg-amber-950/15 px-2 py-1.5 text-[11px] text-amber-300">
          此資料可作娛樂分析，但不應作正式查詢。
        </p>
      )}
    </div>
  );
}

export const DataSourceBadge = memo(DataSourceBadgeBase);
export default DataSourceBadge;
