/**
 * SelectionAnalysisPage.tsx  (V24 — AI 選號分析中心)
 *
 * 路由:/selection-analysis(請於 router 註冊,見交付說明)。
 * 功能:輸入主號 → scoreSelection() → 顯示整體統計完整度、九項評分、分析報告。
 * 定位:統計分析,非預測;標示娛樂用途。
 *
 * 採 Adapter Pattern:把 getByRange 的開獎資料整理成評分引擎輸入,
 * 不修改 statistics.ts / HistoryProvider / HistoryEngine。
 */

import { useEffect, useMemo, useState } from 'react';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getByRange, RANGE_OPTIONS, type AnalysisRange } from '@/utils/historyAnalysisEngine';
import { getDataSourceKind } from '@/providers/historyProvider';
import {
  scoreSelection,
  type SelectionScoreResult,
} from '@/utils/selectionScoreEngine';

const GAMES: [LotteryType, string][] = [
  ['power', '威力彩'],
  ['lotto649', '大樂透'],
  ['daily539', '今彩539'],
];
const RANGE_LABEL: Record<string, string> = {
  '100': '近100期',
  '300': '近300期',
  '500': '近500期',
  '1000': '近1000期',
  all: '全部歷史',
};

const SCORE_CARDS: { key: keyof SelectionScoreResult; label: string }[] = [
  { key: 'hotScore', label: '熱門符合' },
  { key: 'coldScore', label: '冷門平衡' },
  { key: 'oddEvenScore', label: '奇偶' },
  { key: 'bigSmallScore', label: '大小' },
  { key: 'tailScore', label: '尾數' },
  { key: 'sumScore', label: '和值' },
  { key: 'distributionScore', label: '區域' },
  { key: 'repeatScore', label: '重覆' },
  { key: 'trendScore', label: '趨勢' },
];

function parseNumbers(raw: string): number[] {
  return raw
    .split(/[^0-9]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
}

function scoreColor(v: number): string {
  if (v >= 80) return 'text-orange-300';
  if (v >= 60) return 'text-amber-300';
  return 'text-neutral-400';
}

export default function SelectionAnalysisPage() {
  const [game, setGame] = useState<LotteryType>('power');
  const [range, setRange] = useState<AnalysisRange>(300);
  const [input, setInput] = useState('05 08 12 21 31 36');
  const [result, setResult] = useState<SelectionScoreResult | null>(null);

  const numbers = useMemo(() => parseNumbers(input), [input]);

  const runAnalysis = (g: LotteryType, r: AnalysisRange, nums: number[]) => {
    const history = getByRange(g, r).map((d) => ({ mainNumbers: d.zone1 }));
    setResult(scoreSelection({ lotteryType: g, numbers: nums, history }));
  };

  // 支援 query param 自動分析:/selection-analysis?game=power&numbers=5,8,12
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    const qNums = q.get('numbers');
    const qGame = q.get('game') as LotteryType | null;
    if (qGame && GAMES.some(([g]) => g === qGame)) setGame(qGame);
    if (qNums) {
      const nums = parseNumbers(qNums);
      setInput(nums.map((n) => String(n).padStart(2, '0')).join(' '));
      runAnalysis(qGame && GAMES.some(([g]) => g === qGame) ? qGame : game, range, nums);
    }
    // 僅在掛載時執行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 pb-32">
      <div>
        <h1 className="text-2xl font-bold text-neutral-100">AI 選號分析</h1>
        <p className="text-sm text-neutral-500">
          統計分析,非預測。以下為號碼平衡度與歷史吻合度的整理,僅供娛樂分析。
        </p>
      </div>

      <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/15 px-3 py-2 text-xs text-cyan-200/80">
        資料來源:{getDataSourceKind() === 'official' ? '官方' : '示意資料(非官方開獎)'}
      </div>

      {/* 彩種 */}
      <div className="flex flex-wrap gap-2">
        {GAMES.map(([g, label]) => (
          <button
            key={g}
            onClick={() => setGame(g)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              game === g
                ? 'border-amber-500 bg-amber-600 text-white'
                : 'border-neutral-700 bg-neutral-900/50 text-neutral-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 分析區間 */}
      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((r) => (
          <button
            key={String(r)}
            onClick={() => setRange(r)}
            className={`rounded-lg border px-3 py-1 text-xs ${
              range === r
                ? 'border-purple-500 bg-purple-600 text-white'
                : 'border-neutral-700 bg-neutral-900/50 text-neutral-400'
            }`}
          >
            {RANGE_LABEL[String(r)]}
          </button>
        ))}
      </div>

      {/* 號碼輸入 */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputMode="numeric"
          placeholder="輸入號碼,例如 05 08 12 21 31 36"
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-orange-500 focus:outline-none"
        />
        <button
          onClick={() => runAnalysis(game, range, numbers)}
          disabled={numbers.length === 0}
          className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          開始分析
        </button>
      </div>
      <p className="text-xs text-neutral-600">
        已輸入 {numbers.length} 個號碼
        {numbers.length > 0 ? `:${numbers.map((n) => String(n).padStart(2, '0')).join(' ')}` : ''}
      </p>

      {result ? (
        <>
          {/* 整體評分 */}
          <div className="rounded-2xl border border-white/[0.06] bg-neutral-900 p-6 text-center">
            <p className="text-xs text-neutral-500">整體統計完整度</p>
            <p className="mt-1 text-5xl font-bold text-orange-400">
              {result.overallScore}
              <span className="ml-1 text-lg text-neutral-500">分</span>
            </p>
            <p className="mt-1 text-[11px] text-neutral-600">娛樂用途</p>
          </div>

          {/* 九個評分卡 */}
          <div className="grid grid-cols-3 gap-3">
            {SCORE_CARDS.map((c) => (
              <div
                key={c.key}
                className="rounded-xl border border-white/[0.06] bg-neutral-900 p-3 text-center"
              >
                <p className="text-xs text-neutral-500">{c.label}</p>
                <p className={`mt-1 text-2xl font-bold tabular-nums ${scoreColor(result[c.key] as number)}`}>
                  {result[c.key] as number}
                </p>
              </div>
            ))}
          </div>

          {/* 分析報告 */}
          <div className="rounded-2xl border border-white/[0.06] bg-neutral-900 p-4">
            <h3 className="mb-2 text-sm font-semibold text-neutral-200">分析報告</h3>
            <ul className="space-y-1.5">
              {result.reason.map((line, i) => (
                <li key={i} className="flex gap-2 text-xs text-neutral-300">
                  <span className="text-orange-500">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      <p className="px-4 text-center text-[11px] text-neutral-600">
        以上為歷史統計整理,僅供娛樂分析,非投注建議。理性購買、量力而為。
      </p>
    </div>
  );
}
