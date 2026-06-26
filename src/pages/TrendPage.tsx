// ============================================================
// V19.2.1 Trend Analysis Center - Period Switch + Explanations + VIP Lock
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import {
  TrendingUp, Flame, Snowflake, Timer, Hash, Divide,
  ArrowUpDown, MapPin, ChevronLeft, Lock, Sparkles, Crown
} from 'lucide-react';
import {
  analyzeHotCold, analyzeOmission, analyzeTail,
  analyzeOddEvenTrend, analyzeSizeTrend, analyzeZoneDistribution, getOddEvenStats
} from '@/utils/lotteryAnalytics';
import type { LotteryType } from '@/utils/lotteryAnalytics';
import { trackTrendPeriod, trackAIVIPCTA } from '@/utils/analytics';
import { getCurrentRole } from '@/utils/permissions';
import { useSyncExternalStore } from 'react';
import { getBackendAuthSnapshot, subscribeBackendAuthSnapshot } from '@/utils/backendAuthSnapshot';
import { getPermGuardSource, computeBackendPermission } from '@/utils/backendPermission';

const TABS = [
  { id: 'hot',     label: '熱門排行', icon: Flame,      explain: '統計最常開出的號碼，幫助你了解哪些號碼目前較活躍。' },
  { id: 'cold',    label: '冷門排行', icon: Snowflake,  explain: '找出較少開出的號碼，這些號碼可能即將反彈出現。' },
  { id: 'omit',    label: '遺漏排行', icon: Timer,      explain: '追蹤每個號碼距離上次開出多久，越久沒開越值得留意。' },
  { id: 'tail',    label: '尾數走勢', icon: Hash,       explain: '分析 0-9 每個尾數的開出頻率。' },
  { id: 'oddeven', label: '奇偶走勢', icon: Divide,     explain: '觀察奇數和偶數的比例變化。' },
  { id: 'size',    label: '大小走勢', icon: ArrowUpDown, explain: '比較大號碼和小號碼的出現比例。' },
  { id: 'zone',    label: '區間分布', icon: MapPin,     explain: '看號碼落在哪個數字區間較多。' },
];

const PERIODS = [30, 50, 100];

const LOTTERY_TABS: { key: LotteryType; label: string }[] = [
  { key: 'power', label: '威力彩' },
  { key: 'lotto649', label: '大樂透' },
  { key: 'daily539', label: '今彩539' },
];

export default function TrendPage() {
  const navigate = useNavigate();
  const [lottery, setLottery] = useState<LotteryType>('power');
  const [tab, setTab] = useState('hot');
  const [period, setPeriod] = useState(30);
  const role = getCurrentRole();
  // Batch 3d-4: 灰度。預設 localStorage（行為不變）；flag=backend 時改讀後端快照。
  const permSource = getPermGuardSource();
  const snapshot = useSyncExternalStore(subscribeBackendAuthSnapshot, getBackendAuthSnapshot, getBackendAuthSnapshot);
  const backendPerm = computeBackendPermission(snapshot, 'trend');
  const isVip = permSource === 'backend'
    ? backendPerm.state === 'allow'
    : (role === 'vip' || role === 'admin');
  const backendStatusMsg = permSource === 'backend'
    ? (backendPerm.state === 'loading' ? '驗證中…' : backendPerm.message)
    : undefined;

  const hotCold = useMemo(() => analyzeHotCold(lottery, 38), [lottery]);
  const omissions = useMemo(() => analyzeOmission(lottery), [lottery]);
  const tails = useMemo(() => analyzeTail(lottery), [lottery]);
  const oddEvenTrend = useMemo(() => analyzeOddEvenTrend(lottery, period), [lottery, period]);
  const sizeTrend = useMemo(() => analyzeSizeTrend(lottery, period), [lottery, period]);
  const zones = useMemo(() => analyzeZoneDistribution(lottery), [lottery]);
  const oddEvenStats = useMemo(() => getOddEvenStats(lottery), [lottery]);
  const currentTab = TABS.find(t => t.id === tab)!;

  const Nb = ({ n, c = 'bg-gray-800' }: { n: number; c?: string }) => <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${c} text-white`}>{n}</span>;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-800/50 transition"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
        <div>
          <h1 className="text-lg font-bold text-gray-100 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-cyan-400" />趨勢分析中心</h1>
          <p className="text-[10px] text-gray-500">深度數據趨勢追蹤</p>
        </div>
      </div>

      {/* Lottery */}
      <div className="flex gap-2">
        {LOTTERY_TABS.map(t => <button key={t.key} onClick={() => setLottery(t.key)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${lottery === t.key ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}>{t.label}</button>)}
      </div>

      {/* Period Switch */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
        {PERIODS.map(p => (
          <button key={p} onClick={() => { setPeriod(p); trackTrendPeriod(p); }}
            className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${period === p ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}>近{p}期</button>
        ))}
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(t => { const Icon = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-gray-800 text-gray-100 border border-gray-700/50' : 'text-gray-500 hover:text-gray-300'}`}><Icon className="w-3 h-3 inline mr-1" />{t.label}</button>
        ); })}
      </div>

      {/* Explanation */}
      <div className="bg-gray-900/50 border border-gray-800/30 rounded-lg p-2.5 flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-gray-400">{currentTab.explain}</p>
      </div>

      {/* Content */}
      {tab === 'hot' && <Card className="border-gray-800/50"><CardContent className="p-4 space-y-2"><h3 className="text-xs font-bold text-red-400 mb-2">最常開出的號碼</h3>{hotCold.hotNumbers.slice(0, 20).map((h, i) => <div key={h.number} className="flex items-center gap-2 text-[11px]"><Nb n={h.number} c={i < 5 ? 'bg-red-500' : i < 10 ? 'bg-red-700' : 'bg-gray-700'} /><div className="flex-1"><div className="flex justify-between"><span className="text-gray-300">第{i + 1}名 ({h.count}次)</span><span className="text-gray-500">{h.percentage}%</span></div><div className="h-1 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, h.percentage * 3)}%` }} /></div></div></div>)}</CardContent></Card>}

      {tab === 'cold' && <Card className="border-gray-800/50"><CardContent className="p-4 space-y-2"><h3 className="text-xs font-bold text-blue-400 mb-2">較少開出的號碼</h3>{hotCold.coldNumbers.slice(0, 20).map((c, i) => <div key={c.number} className="flex items-center gap-2 text-[11px]"><Nb n={c.number} c={i < 5 ? 'bg-blue-500' : i < 10 ? 'bg-blue-700' : 'bg-gray-700'} /><div className="flex-1"><div className="flex justify-between"><span className="text-gray-300">倒數{i + 1} ({c.count}次)</span><span className="text-gray-500">{c.percentage}%</span></div><div className="h-1 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, c.percentage * 3)}%` }} /></div></div></div>)}</CardContent></Card>}

      {tab === 'omit' && <Card className="border-gray-800/50"><CardContent className="p-4 space-y-2"><h3 className="text-xs font-bold text-amber-400 mb-2">多久沒開出了</h3>{omissions.slice(0, 20).map((o, i) => <div key={o.number} className="flex items-center gap-2 text-[11px]"><Nb n={o.number} c={o.currentGap > o.avgGap * 1.8 ? 'bg-amber-500' : o.currentGap > o.avgGap ? 'bg-amber-700' : 'bg-gray-700'} /><div className="flex-1"><div className="flex justify-between"><span className="text-gray-300">已遺漏 <span className="text-amber-400 font-bold">{o.currentGap}</span> 期</span><span className="text-gray-500">平均 {o.avgGap} 期</span></div><div className="h-1 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (o.currentGap / Math.max(...omissions.map(x => x.currentGap))) * 100)}%` }} /></div></div></div>)}</CardContent></Card>}

      {tab === 'tail' && <Card className="border-gray-800/50"><CardContent className="p-4 space-y-3"><div className="grid grid-cols-2 gap-2">{tails.map(t => <div key={t.tail} className="bg-gray-900/50 rounded-lg p-2"><div className="flex justify-between mb-1"><span className="text-sm font-bold text-purple-400">尾數 {t.tail}</span><span className="text-[10px] text-gray-500">{t.count}次</span></div><div className="flex flex-wrap gap-0.5">{t.numbers.map(n => <span key={n} className="text-[9px] bg-purple-950/30 text-purple-300 rounded px-1 py-0.5">{n}</span>)}</div></div>)}</div></CardContent></Card>}

      {tab === 'oddeven' && <Card className="border-gray-800/50"><CardContent className="p-4 space-y-3"><div className="flex items-center justify-around bg-emerald-950/10 rounded-lg p-3"><div className="text-center"><div className="text-xl font-bold text-emerald-400">{oddEvenStats.avgOdd}</div><div className="text-[10px] text-gray-500">平均奇數</div></div><div className="text-gray-600">:</div><div className="text-center"><div className="text-xl font-bold text-teal-400">{oddEvenStats.avgEven}</div><div className="text-[10px] text-gray-500">平均偶數</div></div></div><div className="space-y-1">{oddEvenTrend.map((t, i) => <div key={i} className="flex items-center gap-2 text-[10px]"><span className="text-gray-500 w-14">{t.period}</span><div className="flex-1 flex gap-0.5">{Array.from({ length: t.odd }).map((_, j) => <div key={j} className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />)}{Array.from({ length: t.even }).map((_, j) => <div key={j} className="w-2.5 h-2.5 rounded-sm bg-teal-700" />)}</div><span className="text-gray-400 w-6">{t.ratio}</span></div>)}</div></CardContent></Card>}

      {tab === 'size' && <Card className="border-gray-800/50"><CardContent className="p-4 space-y-3"><div className="space-y-1">{sizeTrend.map((t, i) => <div key={i} className="flex items-center gap-2 text-[10px]"><span className="text-gray-500 w-14">{t.period}</span><div className="flex-1 flex gap-0.5">{Array.from({ length: t.big }).map((_, j) => <div key={j} className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />)}{Array.from({ length: t.small }).map((_, j) => <div key={j} className="w-2.5 h-2.5 rounded-sm bg-sky-700" />)}</div><span className="text-gray-400 w-6">{t.ratio}</span></div>)}</div></CardContent></Card>}

      {tab === 'zone' && <Card className="border-gray-800/50"><CardContent className="p-4 space-y-3">{zones.map(z => <div key={z.zone} className="text-[11px]"><div className="flex justify-between mb-0.5"><span className="text-gray-300">{z.zone} 區</span><span className="text-gray-500">{z.count} 次 ({z.percentage}%)</span></div><div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" style={{ width: `${z.percentage}%` }} /></div></div>)}</CardContent></Card>}

      {/* VIP Deep Report Lock */}
      {!isVip && (
        <div className="relative overflow-hidden rounded-xl border border-amber-800/40 bg-gradient-to-b from-amber-950/20 to-gray-950 p-5 text-center">
          <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-[1px] flex flex-col items-center justify-center z-10">
            <Lock className="w-6 h-6 text-amber-500 mb-2" />
            {backendStatusMsg ? <p className="text-[10px] text-amber-300 mb-1">{backendStatusMsg}</p> : null}
            <p className="text-xs font-bold text-amber-400 mb-1">VIP 專屬功能</p>
            <p className="text-[10px] text-gray-500 mb-3">深度趨勢報告 + AI 預測模型</p>
            <button onClick={() => { trackAIVIPCTA('trend_lock'); navigate('/vip-value-v2'); }} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold text-white transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />升級 VIP 解鎖
            </button>
          </div>
          <div className="opacity-30">
            <h4 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-1.5"><Sparkles className="w-4 h-4" />深度趨勢報告</h4>
            <p className="text-[10px] text-gray-500">Random Forest 預測 / Markov 反彈分析 / Bayesian 機率評估</p>
          </div>
        </div>
      )}
      {isVip && (
        <Card className="border-amber-700/40 bg-gradient-to-b from-amber-950/10 to-transparent">
          <CardContent className="p-4 text-center">
            <h4 className="text-sm font-bold text-amber-400 mb-2 flex items-center justify-center gap-1.5"><Sparkles className="w-4 h-4" />VIP 深度趨勢報告</h4>
            <p className="text-[11px] text-gray-400 mb-3">結合多種演算法模型的進階分析</p>
            <button onClick={() => navigate('/premium-ai')} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold text-white transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5 mx-auto">
              <Crown className="w-3.5 h-3.5" />查看 Premium AI 分析
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
