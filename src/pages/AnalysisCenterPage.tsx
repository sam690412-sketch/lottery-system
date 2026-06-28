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
import { calcHotCold, calcOddEven, calcBigSmall, calcSumAnalysis, calcTailAnalysis } from '@/utils/statistics';
import { validateAllBuiltInHistory } from '@/utils/historyValidation';
import DataSourceBadge from '@/components/data/DataSourceBadge';

const GAMES: [LotteryType, string][] = [['power', '威力彩'], ['lotto649', '大樂透'], ['daily539', '今彩539']];
const RANGE_LABEL: Record<string, string> = { '100': '近100期', '300': '近300期', '500': '近500期', '1000': '近1000期', 'all': '全部歷史' };
const BIG_THRESHOLD: Record<LotteryType, number> = { power: 19, lotto649: 25, daily539: 20, lotto49c: 25, daily39c: 20, star3: 5, star4: 5 };

// LotteryResult → statistics.ts 需要的 HistoricalDraw 形狀
function toDraws(rs: LotteryResult[]) {
  return rs.map(r => ({ mainNumbers: r.zone1, specialNumber: r.special ?? undefined, date: r.date }));
}
function Bar({ label, value, max, sub }: { label: string; value: number; max: number; sub?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-10 text-gray-400 shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-gray-800 rounded overflow-hidden"><div className="h-full bg-amber-500/70" style={{ width: pct + '%' }} /></div>
      <span className="w-14 text-right text-gray-300 shrink-0">{sub ?? value}</span>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
      <h3 className="text-sm font-bold text-gray-200 mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function AnalysisCenterPage() {
  const [game, setGame] = useState<LotteryType>('power');
  const [range, setRange] = useState<AnalysisRange>(100);

  const results = useMemo(() => getByRange(game, range), [game, range]);
  const draws = useMemo(() => toDraws(results), [results]);
  const summary = useMemo(() => getDataSummary(game), [game]);

  // V25-E：三彩種資料驗證摘要(內建資料,只算一次);依目前彩種取狀態
  const validations = useMemo(() => validateAllBuiltInHistory(), []);
  const gameValidation = validations[game];

  const hot = useMemo(() => calcHotCold(draws, 'hot', 10), [draws]);
  const cold = useMemo(() => calcHotCold(draws, 'cold', 10), [draws]);
  const oddEven = useMemo(() => calcOddEven(draws), [draws]);
  const bigSmall = useMemo(() => calcBigSmall(draws, BIG_THRESHOLD[game] ?? 20), [draws, game]);
  const sum = useMemo(() => calcSumAnalysis(draws), [draws]);
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
  const WD = ['日', '一', '二', '三', '四', '五', '六'];

  const hotMax = hot[0]?.count ?? 1;

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">AI 分析中心</h1>
        <p className="text-sm text-gray-500">沿用統計引擎 + 可切換分析區間。以下為統計整理，僅供娛樂分析，非投注建議。</p>
      </div>

      {/* V25-G：資料來源徽章(統一 props + mode) */}
      <DataSourceBadge
        sourceKind={getDataSourceKind()}
        validation={gameValidation?.summary.severity ?? 'yellow'}
        totalRecords={summary.count}
        dateRange={gameValidation?.dateRange ?? { from: null, to: null }}
        latestDate={summary.latestDate}
        mode="analysis"
        updatedAt={summary.updatedAt}
      />

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

      <Section title="一、熱門號排行（前10）">
        <div className="space-y-1.5">{hot.map((h) => <Bar key={h.number} label={String(h.number)} value={h.count} max={hotMax} sub={`${h.count}次`} />)}</div>
      </Section>
      <Section title="二、冷門號排行（前10）">
        <div className="space-y-1.5">{cold.map((c) => <Bar key={c.number} label={String(c.number)} value={c.count} max={hotMax} sub={`${c.count}次`} />)}</div>
      </Section>
      <Section title="三、奇偶比例">
        <p className="text-xs text-gray-300">奇數 {oddEven.oddRate}　偶數 {oddEven.evenRate}（奇 {oddEven.oddCount} / 偶 {oddEven.evenCount}）</p>
      </Section>
      <Section title="四、大小比例">
        <p className="text-xs text-gray-300">大號 {bigSmall.bigRate}　小號 {bigSmall.smallRate}（門檻 {bigSmall.threshold}）</p>
      </Section>
      <Section title="五、和值分析">
        <p className="text-xs text-gray-300">平均和值 {sum.avgSum}　最小 {sum.minSum}　最大 {sum.maxSum}　常見區間 {sum.commonRange}</p>
      </Section>
      <Section title="六、尾數分析">
        <div className="space-y-1.5">{tail.map((t) => <Bar key={t.tail} label={`尾${t.tail}`} value={t.count} max={tail[0]?.count || 1} sub={`${t.count}`} />)}</div>
      </Section>
      <Section title="七、月份分析">
        <div className="space-y-1.5">{Object.entries(dateStats.month).sort((a, b) => Number(a[0]) - Number(b[0])).map(([m, c]) => <Bar key={m} label={`${m}月`} value={c} max={Math.max(...Object.values(dateStats.month), 1)} />)}</div>
      </Section>
      <Section title="八、年份分析">
        <div className="space-y-1.5">{Object.entries(dateStats.year).sort((a, b) => Number(a[0]) - Number(b[0])).map(([y, c]) => <Bar key={y} label={y} value={c} max={Math.max(...Object.values(dateStats.year), 1)} />)}</div>
      </Section>
      <Section title="九、星期分析">
        <div className="space-y-1.5">{Object.entries(dateStats.weekday).sort((a, b) => Number(a[0]) - Number(b[0])).map(([w, c]) => <Bar key={w} label={`週${WD[Number(w)]}`} value={c} max={Math.max(...Object.values(dateStats.weekday), 1)} />)}</div>
      </Section>

      <p className="text-[11px] text-gray-500 text-center px-4">以上為歷史統計整理，僅供參考娛樂分析，非投注建議。資料若為示意，請以官方開獎為準。理性購買、量力而為。</p>
    </div>
  );
}
