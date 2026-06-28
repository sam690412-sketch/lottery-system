// ============================================================
// V22 Part 3 — AI Analysis Center
// 沿用 statistics.ts（不改演算法）+ 新 HistoryEngine（區間切換）。
// 不影響 Builder/13層/scoring。資料目前為示意（simulated），已標示。
// ============================================================
import { useState, useMemo } from 'react';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getByRange, RANGE_OPTIONS, type AnalysisRange } from '@/utils/historyAnalysisEngine';
import { getDataSummary } from '@/utils/historyEngine';
import { getDataSourceKind, type LotteryResult } from '@/providers/historyProvider';
import { calcHotCold, calcOddEven, calcBigSmall, calcTailAnalysis } from '@/utils/statistics';
import AnalysisChartsSection from '@/components/analysis/AnalysisChartsSection';
import { mapStatisticsToInput } from '@/utils/historyChartAdapter';

const GAMES: [LotteryType, string][] = [['power', '威力彩'], ['lotto649', '大樂透'], ['daily539', '今彩539']];
const RANGE_LABEL: Record<string, string> = { '100': '近100期', '300': '近300期', '500': '近500期', '1000': '近1000期', 'all': '全部歷史' };
const BIG_THRESHOLD: Record<LotteryType, number> = { power: 19, lotto649: 25, daily539: 20, lotto49c: 25, daily39c: 20, star3: 5, star4: 5 };

// LotteryResult → statistics.ts 需要的 HistoricalDraw 形狀
function toDraws(rs: LotteryResult[]) {
  return rs.map(r => ({ mainNumbers: r.zone1, specialNumber: r.special ?? undefined, date: r.date }));
}

export default function AnalysisCenterPage() {
  const [game, setGame] = useState<LotteryType>('power');
  const [range, setRange] = useState<AnalysisRange>(100);

  const results = useMemo(() => getByRange(game, range), [game, range]);
  const draws = useMemo(() => toDraws(results), [results]);
  const summary = useMemo(() => getDataSummary(game), [game]);

  const hot = useMemo(() => calcHotCold(draws, 'hot', 10), [draws]);
  const cold = useMemo(() => calcHotCold(draws, 'cold', 10), [draws]);
  const oddEven = useMemo(() => calcOddEven(draws), [draws]);
  const bigSmall = useMemo(() => calcBigSmall(draws, BIG_THRESHOLD[game] ?? 20), [draws, game]);
  const tail = useMemo(() => calcTailAnalysis(draws), [draws]);

  // 新增：日期型分析（月份/年份/星期）—— 既有頁面沒有
  const dateStats = useMemo(() => {
    const month: Record<number, number> = {}, year: Record<number, number> = {}, weekday: Record<number, number> = {};
    for (const r of results) {
      const d = new Date(r.date);
      if (isNaN(d.getTime())) continue;
      month[d.getMonth() + 1] = (month[d.getMonth() + 1] || 0) + 1;
      year[d.getFullYear()] = (year[d.getFullYear()] || 0) + 1;
      weekday[d.getDay()] = (weekday[d.getDay()] || 0) + 1;
    }
    return { month, year, weekday };
  }, [results]);

  // 和值趨勢：由各期主號加總後依日期排序而成的時間序列。
  // 沿用 statistics.ts 的口徑（僅加總主號），但 statistics.ts 無逐期序列，故在此衍生，不改 statistics.ts。
  const sumSeries = useMemo(() =>
    draws
      .map(d => ({ date: d.date, sum: d.mainNumbers.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(x => ({ period: x.date, sum: x.sum }))
  , [draws]);

  // 統一轉成 Chart Engine 輸入（唯一硬接點集中在 historyChartAdapter）。
  const chartStats = useMemo(() => mapStatisticsToInput({
    hot,
    cold,
    tail,
    oddEven: { oddCount: oddEven.oddCount, evenCount: oddEven.evenCount },
    bigSmall: { bigCount: bigSmall.bigCount, smallCount: bigSmall.smallCount },
    sumSeries,
    month: Object.entries(dateStats.month).map(([m, c]) => ({ month: Number(m), count: c })),
    year: Object.entries(dateStats.year).map(([y, c]) => ({ year: Number(y), count: c })),
    weekday: Object.entries(dateStats.weekday).map(([w, c]) => ({ weekday: Number(w), count: c })),
  }), [hot, cold, tail, oddEven, bigSmall, sumSeries, dateStats]);

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">AI 分析中心</h1>
        <p className="text-sm text-gray-500">沿用統計引擎 + 可切換分析區間。以下為統計整理，不代表中獎率。</p>
      </div>

      {/* 資料概況（Part 9） */}
      <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/15 px-3 py-2 text-xs text-cyan-200/80">
        目前已分析：{summary.count} 期 · 最新：{summary.latestDate || '—'} · 來源：{getDataSourceKind() === 'official' ? '官方' : '示意資料（非官方開獎）'}
      </div>

      {/* 彩種 + 區間切換 */}
      <div className="flex flex-wrap gap-2">
        {GAMES.map(([g, label]) => (
          <button key={g} onClick={() => setGame(g)} className={`px-3 py-1.5 rounded-lg text-sm border ${game === g ? 'bg-amber-600 border-amber-500 text-white' : 'bg-gray-900/50 border-gray-700 text-gray-300'}`}>{label}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((r) => (
          <button key={String(r)} onClick={() => setRange(r)} className={`px-3 py-1 rounded-lg text-xs border ${range === r ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-900/50 border-gray-700 text-gray-400'}`}>{RANGE_LABEL[String(r)]}</button>
        ))}
      </div>

      {/* 統計圖表（V23：改用共用 Chart Engine 呈現,取代舊文字/Bar） */}
      <AnalysisChartsSection stats={chartStats} />

      <p className="text-[11px] text-gray-500 text-center px-4">以上為歷史統計整理，僅供參考娛樂，不代表中獎率。資料若為示意，請以官方開獎為準。理性購買、量力而為。</p>
    </div>
  );
}
