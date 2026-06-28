/**
 * AnalysisChartsSection.tsx  (V23-B)
 *
 * 獨立的「分析圖表區塊」presentational 元件。
 * 把 Chart Engine 的 9 張圖 + 空狀態組好,讓 AnalysisCenterPage
 * 只要掛這一個元件即可(對既有頁面改動趨近於零)。
 *
 * - 只吃資料、只負責呈現,不取資料、不碰 HistoryProvider。
 * - 資料來源由呼叫端用 mapStatisticsToInput() 對應後傳入 stats。
 * - 依規範:分析區塊標示「娛樂用途」。
 */

import { memo, useMemo } from 'react';
import {
  BarRankChart,
  ChartCard,
  RatioDonutChart,
  TrendLineChart,
} from '../charts';
import {
  buildAnalysisChartData,
  isAnalysisDataEmpty,
  type AnalysisStatsInput,
} from '../../utils/historyChartAdapter';

export interface AnalysisChartsSectionProps {
  /** 已對應成輸入契約的統計資料(用 mapStatisticsToInput 轉)。 */
  stats: AnalysisStatsInput;
  loading?: boolean;
  /** 熱門取前幾名。 */
  topN?: number;
  /** 冷門取後幾名。 */
  bottomN?: number;
  /** 年份分析改用長條(預設依資料量自動選擇)。 */
  yearAsBar?: boolean;
  className?: string;
}

const formatTimes = (v: number): string => `${v} 次`;
/** Y 軸整數格式(避免被切掉的小數)。 */
const formatInt = (v: number): string => String(Math.round(v));
/** X 軸短日期:2024-06-23 → 06/23;無法解析則原樣。 */
const shortDate = (s: string): string => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}`;
};
/** 年份折線至少需要的年數,低於此改用長條;再低則顯示資料不足。 */
const YEAR_MIN_FOR_LINE = 4;
const YEAR_MIN_FOR_BAR = 2;

function AnalysisChartsSectionBase({
  stats,
  loading = false,
  topN = 10,
  bottomN = 10,
  yearAsBar = false,
  className = '',
}: AnalysisChartsSectionProps) {
  const data = useMemo(
    () => buildAnalysisChartData(stats, { topN, bottomN }),
    [stats, topN, bottomN],
  );

  const allEmpty = !loading && isAnalysisDataEmpty(data);

  return (
    <section className={`flex flex-col gap-4 pb-32 ${className}`}>
      {/* 區塊標題 + 娛樂說明(小型,不突出) */}
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-neutral-100">歷史統計圖表</h2>
        <p className="text-xs leading-relaxed text-neutral-500">
          以下圖表為歷史資料統計，僅供娛樂參考，不代表中獎率。
        </p>
      </header>

      {allEmpty ? (
        <div className="rounded-2xl border border-white/[0.06] bg-neutral-900 p-8">
          <p className="text-center text-sm text-neutral-400">
            資料不足,無法產生統計圖表
          </p>
          <p className="mt-1 text-center text-xs text-neutral-600">
            選擇較長的期數範圍後再試一次
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 1. 熱門號排行 */}
          <BarRankChart
            title="熱門號排行"
            subtitle="出現次數較多的號碼"
            data={data.hot}
            loading={loading}
            formatValue={formatTimes}
          />

          {/* 2. 冷門號排行 */}
          <BarRankChart
            title="冷門號排行"
            subtitle="出現次數較少的號碼"
            data={data.cold}
            loading={loading}
            formatValue={formatTimes}
          />

          {/* 3. 尾數分析 */}
          <BarRankChart
            title="尾數分析"
            subtitle="各尾數出現次數"
            data={data.tail}
            loading={loading}
            formatValue={formatTimes}
          />

          {/* 9. 星期分析 */}
          <BarRankChart
            title="星期分析"
            subtitle="各星期開出次數"
            data={data.weekday}
            loading={loading}
            sort={false}
            formatValue={formatTimes}
          />

          {/* 4. 奇偶比例 */}
          <RatioDonutChart
            title="奇偶比例"
            subtitle="奇數 / 偶數佔比"
            data={data.oddEven}
            loading={loading}
            centerSubLabel="總數"
          />

          {/* 5. 大小比例 */}
          <RatioDonutChart
            title="大小比例"
            subtitle="大 / 小佔比"
            data={data.bigSmall}
            loading={loading}
            centerSubLabel="總數"
          />

          {/* 7. 月份分析 */}
          <BarRankChart
            title="月份分析"
            subtitle="各月份開出次數"
            data={data.month}
            loading={loading}
            sort={false}
            formatValue={formatTimes}
          />

          {/* 8. 年份分析:依年數自動選擇,避免出現奇怪的空折線 */}
          {(() => {
            const yearPoints = data.year[0]?.points ?? [];
            if (yearPoints.length < YEAR_MIN_FOR_BAR) {
              return (
                <ChartCard
                  title="年份分析"
                  subtitle="各年份開出次數"
                  empty
                  emptyMessage="資料不足"
                  emptyHint="需更多年份資料"
                />
              );
            }
            if (yearAsBar || yearPoints.length < YEAR_MIN_FOR_LINE) {
              return (
                <BarRankChart
                  title="年份分析"
                  subtitle="各年份開出次數"
                  data={yearPoints}
                  loading={loading}
                  sort={false}
                  formatValue={formatTimes}
                />
              );
            }
            return (
              <TrendLineChart
                title="年份分析"
                subtitle="各年份開出次數走勢"
                data={data.year}
                loading={loading}
                formatValue={formatInt}
              />
            );
          })()}

          {/* 6. 和值趨勢(獨立整列、加高、短日期、整數 Y 軸) */}
          <div className="lg:col-span-2">
            <TrendLineChart
              title="和值趨勢"
              subtitle="各期和值走勢"
              data={data.sumTrend}
              loading={loading}
              height={320}
              formatLabel={shortDate}
              formatValue={formatInt}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export const AnalysisChartsSection = memo(AnalysisChartsSectionBase);
export default AnalysisChartsSection;
