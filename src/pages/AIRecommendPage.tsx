// ============================================================
// V19.2.1 AI Recommendation Center - Plain Language + Actions
// Add to watchlist, Generate 3 sets, VIP CTA, tracking
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles, BrainCircuit, Target, Layers, ChevronLeft,
  RefreshCw, PlusCircle, Dices, Crown, Lock, CheckCircle2
} from 'lucide-react';
import { generateAIRecommend, analyzeHotCold, analyzeOmission, getNumberInsightText } from '@/utils/lotteryAnalytics';
import type { NumberInsight } from '@/utils/lotteryAnalytics';
import type { LotteryType } from '@/utils/lotteryAnalytics';
import { addToObservationPool, isInObservationPool } from '@/utils/observationPool';
import { trackAIRecommendAction, trackAddToWatchlist, trackAIVIPCTA, trackGenerate3Sets } from '@/utils/analytics';
import { getCurrentRole } from '@/utils/permissions';
import { useSyncExternalStore } from 'react';
import { getBackendAuthSnapshot, subscribeBackendAuthSnapshot } from '@/utils/backendAuthSnapshot';
import { getPermGuardSource, computeBackendPermission } from '@/utils/backendPermission';

const LOTTERY_TABS: { key: LotteryType; label: string; desc: string }[] = [
  { key: 'power',    label: '威力彩',  desc: '38選6 + 特別號' },
  { key: 'lotto649', label: '大樂透',  desc: '49選6' },
  { key: 'daily539', label: '今彩539', desc: '39選5' },
];

export default function AIRecommendPage() {
  const navigate = useNavigate();
  const [lottery, setLottery] = useState<LotteryType>('power');
  const [refreshKey, setRefreshKey] = useState(0);
  const [addedNums, setAddedNums] = useState<number[]>([]);
  const [sets3, setSets3] = useState<number[][]>([]);

  const aiRec = useMemo(() => generateAIRecommend(lottery), [lottery, refreshKey]);
  const hotCold = useMemo(() => analyzeHotCold(lottery, 38), [lottery]);
  const omissions = useMemo(() => analyzeOmission(lottery), [lottery]);
  const role = getCurrentRole();
  // Batch 3d-4: 灰度。預設 localStorage（行為不變）；flag=backend 時改讀後端快照。
  const permSource = getPermGuardSource();
  const snapshot = useSyncExternalStore(subscribeBackendAuthSnapshot, getBackendAuthSnapshot, getBackendAuthSnapshot);
  const backendPerm = computeBackendPermission(snapshot, 'aiRecommend');
  const isVip = permSource === 'backend'
    ? backendPerm.state === 'allow'
    : (role === 'vip' || role === 'admin');
  const backendStatusMsg = permSource === 'backend'
    ? (backendPerm.state === 'loading' ? '驗證中…' : backendPerm.message)
    : undefined;

  const handleAddAll = () => {
    trackAIRecommendAction('add_all_to_watchlist');
    aiRec.numbers.forEach(n => addToObservationPool(n, 3));
    setAddedNums([...aiRec.numbers]);
    trackAddToWatchlist(aiRec.numbers);
  };

  const handleAddSingle = (n: number) => {
    addToObservationPool(n, 3);
    setAddedNums(prev => [...prev, n]);
    trackAddToWatchlist([n]);
  };

  const handleGenerate3 = () => {
    trackGenerate3Sets();
    const s1 = generateAIRecommend(lottery);
    const s2 = generateAIRecommend(lottery);
    const s3 = generateAIRecommend(lottery);
    setSets3([s1.numbers, s2.numbers, s3.numbers]);
    trackAIRecommendAction('generate_3_sets');
  };

  const numColor = (n: number) => {
    if (aiRec.numbers.includes(n)) return 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20';
    if (hotCold.hotNumbers.slice(0, 8).some(h => h.number === n)) return 'bg-red-900/50 text-red-300 border border-red-800/30';
    if (hotCold.coldNumbers.slice(0, 8).some(c => c.number === n)) return 'bg-blue-900/50 text-blue-300 border border-blue-800/30';
    return 'bg-gray-800 text-gray-400';
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-800/50 transition"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
        <div>
          <h1 className="text-lg font-bold text-gray-100 flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-purple-400" />AI推薦中心</h1>
          <p className="text-[10px] text-gray-500">AI 幫你挑號碼，告訴你為什麼</p>
        </div>
      </div>

      {/* Lottery */}
      <div className="flex gap-2">
        {LOTTERY_TABS.map(t => (
          <button key={t.key} onClick={() => setLottery(t.key)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center ${lottery === t.key ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}>
            {t.label}<span className="text-[8px] opacity-60 font-normal">{t.desc}</span>
          </button>
        ))}
      </div>

      {/* Main Recommendation */}
      <Card className="border-purple-700/40 bg-gradient-to-b from-purple-950/20 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div><h2 className="text-base font-bold text-amber-400 flex items-center gap-1.5"><Sparkles className="w-4 h-4" />AI 推薦這組號碼</h2><p className="text-[10px] text-gray-500">綜合多項數據分析結果</p></div>
            <button onClick={() => { trackAIRecommendAction('refresh'); setRefreshKey(k => k + 1); }} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-purple-400 transition"><RefreshCw className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            {aiRec.numbers.map((n, i) => (
              <span key={n} className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/20">{n}</span>
            ))}
          </div>

          {/* Confidence */}
          <div className="bg-gray-900/50 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-1.5"><span className="text-xs text-gray-400">AI 信心度</span><span className="text-sm font-bold text-amber-400">{aiRec.confidence}%</span></div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-600 via-amber-500 to-amber-400 rounded-full" style={{ width: `${aiRec.confidence}%` }} /></div>
            <p className="text-[10px] text-gray-500 mt-1.5">信心度越高，表示 AI 對這組號碼的綜合評估越有信心，但不保證中獎。</p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {aiRec.sources.map((s, i) => <span key={i} className="text-[9px] bg-gray-800 text-gray-400 rounded-full px-2 py-0.5">{s.name} {s.contribution}%</span>)}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button onClick={handleAddAll} disabled={addedNums.length === aiRec.numbers.length}
          className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1.5">
          {addedNums.length === aiRec.numbers.length ? <><CheckCircle2 className="w-4 h-4" />已加入觀察池</> : <><PlusCircle className="w-4 h-4" />一鍵加入觀察池</>}
        </button>
        <button onClick={handleGenerate3}
          className="flex-1 py-3 bg-purple-700 hover:bg-purple-600 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1.5">
          <Dices className="w-4 h-4" />產生 3 組號碼
        </button>
      </div>

      {/* 3 Sets Result */}
      {sets3.length > 0 && (
        <Card className="border-purple-800/30">
          <CardContent className="p-4">
            <h3 className="text-xs font-bold text-purple-400 mb-3">AI 產生的 3 組號碼</h3>
            <div className="space-y-2">
              {sets3.map((set, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-8">第{i + 1}組</span>
                  <div className="flex items-center gap-1.5 flex-1">
                    {set.map(n => <span key={n} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-600/30 text-purple-300 text-[11px] font-bold border border-purple-700/30">{n}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendation Reasons */}
      <Card className="border-gray-800/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-gray-200 flex items-center gap-1.5 mb-2"><Target className="w-4 h-4 text-amber-400" />為什麼推薦這組號碼</h3>
          <p className="text-[10px] text-gray-500 mb-2">AI 根據以下分析結果綜合判斷：</p>
          <ul className="space-y-2">
            {aiRec.reasons.map((r, i) => (
              <li key={i} className="text-[11px] text-gray-400 flex items-start gap-2 bg-gray-900/30 rounded-lg p-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-950/50 border border-amber-800/30 text-amber-400 text-[9px] font-bold shrink-0">{i + 1}</span>{r}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Weight Analysis */}
      <Card className="border-gray-800/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-gray-200 flex items-center gap-1.5 mb-2"><Layers className="w-4 h-4 text-cyan-400" />各項分析佔比</h3>
          <p className="text-[10px] text-gray-500 mb-2">AI 參考了以下分析項目，按權重綜合計算：</p>
          <div className="space-y-2">
            {aiRec.weights.map((w, i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] mb-0.5"><span className="text-gray-300">{w.factor}</span><span className="text-gray-500">{w.weight}%</span></div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${w.weight * 2}%` }} /></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Source Analysis */}
      <Card className="border-gray-800/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-gray-200 mb-3">分析來源比例</h3>
          <div className="grid grid-cols-2 gap-2">
            {aiRec.sources.map((s, i) => (
              <div key={i} className="bg-gray-900/50 border border-gray-800/30 rounded-lg p-2.5 text-center">
                <div className="text-lg font-bold text-amber-400">{s.contribution}%</div>
                <div className="text-[11px] text-gray-300">{s.name}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* V19.3: Number Insight Cards */}
      <Card className="border-amber-800/30 bg-gradient-to-b from-amber-950/10 to-transparent">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-1.5"><Target className="w-4 h-4" />每個號碼的分析說明</h3>
          <div className="space-y-2">
            {aiRec.insights.map((ins: NumberInsight) => {
              const lines = getNumberInsightText(ins);
              return (
                <div key={ins.number} className="bg-gray-900/50 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white text-sm font-bold">{ins.number}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        {ins.isHot && <span className="text-[8px] bg-red-900/50 text-red-400 rounded px-1">熱門</span>}
                        {ins.isCold && <span className="text-[8px] bg-blue-900/50 text-blue-400 rounded px-1">冷門</span>}
                        <span className="text-[8px] text-gray-500">{ins.isOdd ? '奇數' : '偶數'} · 尾數{ins.tail}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {lines.map((l, i) => <p key={i} className="text-[10px] text-gray-400">· {l}</p>)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Number Map with Add Buttons */}
      <Card className="border-gray-800/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-gray-200 mb-3">全號碼分佈圖</h3>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: lottery === 'power' ? 38 : lottery === 'lotto649' ? 49 : 39 }, (_, i) => i + 1).map(n => {
              const isAdded = addedNums.includes(n) || isInObservationPool(n);
              return (
                <button key={n} onClick={() => !isAdded && handleAddSingle(n)}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${numColor(n)} ${isAdded ? 'opacity-50' : 'hover:scale-110'}`}>
                  {isAdded ? '✓' : n}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-3 text-[9px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-amber-600" />AI推薦</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-900/50 border border-red-800/30" />熱門</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-900/50 border border-blue-800/30" />冷門</span>
          </div>
        </CardContent>
      </Card>

      {/* VIP CTA for non-VIP */}
      {!isVip && (
        <div className="border border-amber-800/40 bg-gradient-to-b from-amber-950/20 to-transparent rounded-xl p-5 text-center">
          <Crown className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          {backendStatusMsg ? <p className="text-[11px] text-amber-300 mb-2">{backendStatusMsg}</p> : null}
          <h3 className="text-sm font-bold text-amber-400 mb-1">升級 VIP，獲得更強大的 AI 分析</h3>
          <p className="text-[11px] text-gray-500 mb-3">VIP 會員可使用 Random Forest、Markov、Bayesian 等進階演算法模型</p>
          <button onClick={() => { trackAIVIPCTA('ai_recommend_page'); navigate('/vip-value-v2'); }}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold text-white transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5 mx-auto">
            <Crown className="w-4 h-4" />升級 VIP
          </button>
        </div>
      )}

      {/* VIP quick link for VIP users */}
      {isVip && (
        <button onClick={() => navigate('/premium-ai')} className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 rounded-xl text-sm font-bold text-white hover:from-amber-500 hover:to-amber-400 transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
          <Crown className="w-4 h-4" />進入 Premium AI 分析
        </button>
      )}

      <div className="px-3 py-2 rounded-lg bg-gray-900/30 border border-gray-800/30">
        <p className="text-[10px] text-gray-500 leading-relaxed text-center">AI 推薦僅供參考，不保證中獎。請理性投注，量力而行。</p>
      </div>
    </div>
  );
}
