// ============================================================
// V25-G — 資料來源 / 驗證狀態徽章(集中文案)
// 所有資料來源與可信度文案集中於此,各頁只傳值,依 mode 顯示對應提醒。
// 純呈現元件;不取資料、不寫入、不改任何邏輯。
// ============================================================
import { memo } from 'react';

export type DataSourceSeverity = 'green' | 'yellow' | 'red';
export type DataSourceMode = 'analysis' | 'prize';

export interface DataSourceBadgeProps {
  /** 來源種類('simulated' | 'official' | 其他)。 */
  sourceKind: string;
  /** 驗證狀態。 */
  validation: DataSourceSeverity;
  totalRecords: number;
  dateRange: { from: string | null; to: string | null };
  latestDate?: string | null;
  /** 使用情境:分析中心 or 兌獎中心。 */
  mode: DataSourceMode;
  /** 官方來源更新時間(可選)。 */
  updatedAt?: string | null;
  className?: string;
}

export interface DataSourceCopy {
  sourcePills: string[];
  reminder: string;
  warning: string | null;
  warningTone: 'red' | 'yellow' | 'green' | null;
}

/* ------------------------------------------------------------
 * 集中文案(純函式,供元件與測試共用)
 * ---------------------------------------------------------- */
export function getDataSourceCopy(
  mode: DataSourceMode,
  sourceKind: string,
  validation: DataSourceSeverity,
): DataSourceCopy {
  const isOfficial = sourceKind === 'official';

  const sourcePills = isOfficial ? ['官方資料', '已驗證'] : ['示意資料', '非官方開獎'];

  const reminder = mode === 'analysis'
    ? '可作娛樂分析，但非官方。'
    : '不可作正式兌獎，請以官方公告為準。';

  let warning: string | null = null;
  let warningTone: 'red' | 'yellow' | 'green' | null = null;

  if (validation === 'red') {
    warning = '此彩種資料不適合作正式兌獎或官方查詢。';
    warningTone = 'red';
  } else if (validation === 'yellow') {
    warning = mode === 'analysis'
      ? '此資料可作娛樂分析，但不應作正式查詢。'
      : '此資料可作娛樂比對，但不應作正式兌獎。';
    warningTone = 'yellow';
  } else if (validation === 'green' && isOfficial) {
    warning = '官方資料已驗證，仍請以官方公告為準。';
    warningTone = 'green';
  }

  return { sourcePills, reminder, warning, warningTone };
}

const SEV_DOT: Record<DataSourceSeverity, string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
};
const SEV_LABEL: Record<DataSourceSeverity, string> = {
  green: '驗證通過',
  yellow: '有警告',
  red: '有錯誤',
};
const WARN_BOX: Record<'red' | 'yellow' | 'green', string> = {
  red: 'border-red-800/50 bg-red-950/25 text-red-300',
  yellow: 'border-amber-800/40 bg-amber-950/15 text-amber-300',
  green: 'border-emerald-800/40 bg-emerald-950/20 text-emerald-300',
};

function DataSourceBadgeBase({
  sourceKind,
  validation,
  totalRecords,
  dateRange,
  latestDate,
  mode,
  updatedAt,
  className = '',
}: DataSourceBadgeProps) {
  const isOfficial = sourceKind === 'official';
  const copy = getDataSourceCopy(mode, sourceKind, validation);

  return (
    <div className={`rounded-xl border p-3 ${isOfficial ? 'border-emerald-800/50 bg-emerald-950/15' : 'border-amber-800/50 bg-amber-950/15'} ${className}`}>
      {/* 來源徽章 */}
      <div className="flex flex-wrap items-center gap-2">
        {copy.sourcePills.map((p, i) => (
          <span
            key={p}
            className={`rounded-md px-2 py-0.5 ${i === 0 ? 'text-xs font-bold' : 'text-[11px]'} ${
              isOfficial
                ? i === 0 ? 'bg-emerald-600/30 text-emerald-200' : 'bg-emerald-600/20 text-emerald-300'
                : i === 0 ? 'bg-amber-600/30 text-amber-200' : 'bg-amber-600/20 text-amber-300'
            }`}
          >
            {p}
          </span>
        ))}
        {isOfficial && updatedAt && (
          <span className="text-[11px] text-emerald-300/70">更新時間：{updatedAt}</span>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-300">
          <span className={`inline-block h-2 w-2 rounded-full ${SEV_DOT[validation]}`} />
          {SEV_LABEL[validation]}
        </span>
      </div>

      {/* 資料概況 */}
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-400 sm:grid-cols-4">
        <span>總期數：<span className="text-gray-200">{totalRecords}</span></span>
        <span>最新日期：<span className="text-gray-200">{latestDate || dateRange.to || '—'}</span></span>
        <span>日期區間：<span className="text-gray-200">{dateRange.from || '—'} ~ {dateRange.to || '—'}</span></span>
        <span>驗證狀態：<span className="text-gray-200">{validation.toUpperCase()}</span></span>
      </div>

      {/* 情境提醒(集中文案) */}
      <p className="mt-2 text-[11px] text-gray-400">{copy.reminder}</p>

      {/* 嚴重度警示 */}
      {copy.warning && copy.warningTone && (
        <p className={`mt-2 rounded-md border px-2 py-1.5 text-[11px] ${WARN_BOX[copy.warningTone]}`}>
          {copy.warningTone === 'red' ? '⚠️ ' : ''}{copy.warning}
        </p>
      )}
    </div>
  );
}

export const DataSourceBadge = memo(DataSourceBadgeBase);
export default DataSourceBadge;
