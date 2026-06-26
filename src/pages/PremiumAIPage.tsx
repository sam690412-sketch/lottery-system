// ============================================================
// V19.2.1 VIP Premium AI - Member-gated
// Non-VIP sees upgrade prompt, VIP sees algorithm names
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import {
  Crown, Lock, ChevronLeft, Sparkles, TrendingUp, TrendingDown,
  Layers, BrainCircuit, ArrowRight, Zap
} from 'lucide-react';
import { generatePremiumAI, backtestRecommend } from '@/utils/lotteryAnalytics';
import type { BacktestResult, LotteryType } from '@/utils/lotteryAnalytics';
import { getCurrentRole } from '@/utils/permissions';
import { trackPremiumAIView, trackAIVIPCTA } from '@/utils/analytics';
import { useAuth } from '@/providers/AuthProvider';
import { trpc } from '@/providers/trpc';
import { getVipGuardSource, computePremiumAIUnlock } from '@/utils/vipGuard';

const LOTTERY_TABS: { key: LotteryType; label: string }[] = [
  { key: 'power', label: '威力彩' },
  { key: 'lotto649', label: '大樂透' },
  { key: 'daily539', label: '今彩539' },
];

export default function PremiumAIPage() {
  const navigate = useNavigate();
  const [lottery, setLottery] = useState<LotteryType>('power');
  const [key, setKey] = useState(0);

  useEffect(() => { trackPremiumAIView(); }, []);

  const premium = useMemo(() => generatePremiumAI(lottery), [lottery, key]);
  const role = getCurrentRole();

  // Batch 3c (T04j-1): VIP gating 灰度。預設 localStorage（行為不變）；
  // 只有 VITE_VIP_GUARD_SOURCE=backend 時才用後端 getMyVipAuthority 判斷解鎖。
  const guardSource = getVipGuardSource();
  const { role: backendRole, authenticated, loading: authLoading } = useAuth();
  const vip = trpc.payment.getMyVipAuthority.useQuery(undefined, {
    enabled: guardSource === 'backend' && authenticated,
    retry: false,
  });
  const unlock = computePremiumAIUnlock({
    source: guardSource,
    localRole: role,
    authenticated,
    authLoading,
    backendRole,
    vipLoading: vip.isLoading,
    vipError: !!vip.error,
    backendIsVip: vip.data?.isVip ?? false,
    backendVipSource: vip.data?.source,
  });
  const isVip = unlock.state === 'unlock';

  // ---- BACKEND 模式：loading 畫面（不誤判、不閃鎖定） ----
  if (unlock.state === 'loading') {
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center gap-2 pt-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-800/50 transition"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="text-center py-12 text-gray-400 text-sm">正在驗證 VIP 狀態…</div>
      </div>
    );
  }

  // ---- NON-VIP UPGRADE SCREEN ----
  if (!isVip) {
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-800/50 transition"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
          <h1 className="text-lg font-bold text-amber-400 flex items-center gap-2"><Crown className="w-5 h-5" />進階AI分析</h1>
        </div>

        <div className="border border-amber-800/40 bg-gradient-to-b from-amber-950/20 to-gray-950 rounded-2xl p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-900/30 border-2 border-amber-700/40 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-amber-400 mb-2">進階AI分析功能</h2>
          {unlock.message ? (
            <p className="text-sm text-amber-300 mb-2">{unlock.message}</p>
          ) : null}
          <p className="text-sm text-gray-400 mb-2">這是 VIP 會員專屬的進階 AI 預測功能。</p>
          <p className="text-[11px] text-gray-500 mb-6 leading-relaxed">
            升級 VIP 後，你可以使用更強大的 AI 分析模型，獲得更精準的號碼推薦與深度趨勢報告。
          </p>

          <div className="space-y-2 mb-6 text-left">
            <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-gray-900/50 rounded-lg p-2.5"><Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />AI 熱門預測分析</div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-gray-900/50 rounded-lg p-2.5"><TrendingDown className="w-3.5 h-3.5 text-blue-500 shrink-0" />AI 冷門反彈偵測</div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-gray-900/50 rounded-lg p-2.5"><Layers className="w-3.5 h-3.5 text-emerald-500 shrink-0" />AI 組合優化</div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-gray-900/50 rounded-lg p-2.5"><BrainCircuit className="w-3.5 h-3.5 text-purple-500 shrink-0" />AI 綜合推薦報告</div>
          </div>

          <button onClick={() => { trackAIVIPCTA('premium_ai_lock'); navigate('/vip-value-v2'); }}
            className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 rounded-xl text-sm font-bold text-white hover:from-amber-500 hover:to-amber-400 transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
            <Crown className="w-5 h-5" />升級 VIP 解鎖
          </button>
          <button onClick={() => navigate('/ai-recommend')} className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition flex items-center gap-1 mx-auto">
            <ArrowRight className="w-3 h-3" />先試試免費的 AI 推薦
          </button>
        </div>
      </div>
    );
  }

  // ---- VIP FULL ACCESS ----
  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-800/50 transition"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
        <div>
          <h1 className="text-lg font-bold text-amber-400 flex items-center gap-2"><Crown className="w-5 h-5 text-amber-400" />Premium AI</h1>
          <p className="text-[10px] text-gray-500">VIP 專屬進階 AI 模型</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-950/30 to-purple-950/30 border border-amber-800/30 rounded-xl p-3 flex items-center gap-2">
        <Crown className="w-5 h-5 text-amber-400" />
        <div><span className="text-xs font-bold text-amber-400">VIP Premium 會員</span><p className="text-[10px] text-gray-500">享有完整 AI 演算法分析</p></div>
      </div>

      <div className="flex gap-2">
        {LOTTERY_TABS.map(t => <button key={t.key} onClick={() => setLottery(t.key)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${lottery === t.key ? 'bg-amber-600 text-white shadow-lg' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}>{t.label}</button>)}
      </div>

      {/* Hot Prediction (Random Forest) */}
      <Card className="border-red-800/30 bg-gradient-to-b from-red-950/10 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-red-400 flex items-center gap-1.5"><TrendingUp className="w-4 h-4" />熱門預測</h3>
            <span className="text-[9px] bg-red-950/50 text-red-400 rounded px-1.5 py-0.5 font-mono">Random Forest</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">{premium.hotPrediction.numbers.map(n => <span key={n} className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white text-sm font-bold">{n}</span>)}</div>
          <div className="flex justify-between text-[10px]"><span className="text-gray-500">信心指數</span><span className="text-red-400 font-bold">{premium.hotPrediction.confidence}%</span></div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1"><div className="h-full bg-red-500 rounded-full" style={{ width: `${premium.hotPrediction.confidence}%` }} /></div>
        </CardContent>
      </Card>

      {/* Cold Rebound (Markov) */}
      <Card className="border-blue-800/30 bg-gradient-to-b from-blue-950/10 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-blue-400 flex items-center gap-1.5"><TrendingDown className="w-4 h-4" />冷門反彈</h3>
            <span className="text-[9px] bg-blue-950/50 text-blue-400 rounded px-1.5 py-0.5 font-mono">Markov Chain</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">{premium.coldRebound.numbers.map(n => <span key={n} className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold">{n}</span>)}</div>
          <div className="flex justify-between text-[10px]"><span className="text-gray-500">信心指數</span><span className="text-blue-400 font-bold">{premium.coldRebound.confidence}%</span></div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${premium.coldRebound.confidence}%` }} /></div>
        </CardContent>
      </Card>

      {/* Combo Optimization (Ensemble) */}
      <Card className="border-emerald-800/30 bg-gradient-to-b from-emerald-950/10 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5"><Layers className="w-4 h-4" />組合優化</h3>
            <span className="text-[9px] bg-emerald-950/50 text-emerald-400 rounded px-1.5 py-0.5 font-mono">Ensemble</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">{premium.comboOptimized.numbers.map(n => <span key={n} className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-sm font-bold">{n}</span>)}</div>
          <div className="flex justify-between text-[10px]"><span className="text-gray-500">信心指數</span><span className="text-emerald-400 font-bold">{premium.comboOptimized.confidence}%</span></div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${premium.comboOptimized.confidence}%` }} /></div>
        </CardContent>
      </Card>

      {/* Ensemble AI (Bayesian) */}
      <Card className="border-purple-800/30 bg-gradient-to-b from-purple-950/10 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-purple-400 flex items-center gap-1.5"><BrainCircuit className="w-4 h-4" />AI 綜合推薦</h3>
            <span className="text-[9px] bg-purple-950/50 text-purple-400 rounded px-1.5 py-0.5 font-mono">Bayesian + Voting</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">{premium.ensemble.numbers.map(n => <span key={n} className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white text-sm font-bold">{n}</span>)}</div>
          <div className="flex justify-between text-[10px]"><span className="text-gray-500">信心指數</span><span className="text-purple-400 font-bold">{premium.ensemble.confidence}%</span></div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${premium.ensemble.confidence}%` }} /></div>
        </CardContent>
      </Card>

      {/* Analysis */}
      <Card className="border-gray-800/30">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-gray-200 mb-3">綜合分析報告</h3>
          <div className="space-y-2">{premium.ensemble.reasons.map((r, i) => <div key={i} className="flex items-start gap-2 text-[11px]"><Sparkles className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /><span className="text-gray-400">{r}</span></div>)}</div>
        </CardContent>
      </Card>

      {/* V19.3: Backtesting */}
      <PremiumBacktest lottery={lottery} />

      <button onClick={() => setKey(k => k + 1)} className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 rounded-xl text-sm font-bold text-white hover:from-amber-500 hover:to-amber-400 transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
        <BrainCircuit className="w-4 h-4" />重新計算 AI 模型
      </button>
    </div>
  );
}

// ---- Backtest Sub-component ----
function PremiumBacktest({ lottery }: { lottery: LotteryType }) {
  const [btHot, setBtHot] = useState<BacktestResult | null>(null);
  const [btCold, setBtCold] = useState<BacktestResult | null>(null);
  const [btEns, setBtEns] = useState<BacktestResult | null>(null);
  const [lookback, setLookback] = useState(100);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      setBtHot(backtestRecommend(lottery, 'hot', lookback));
      setBtCold(backtestRecommend(lottery, 'cold', lookback));
      setBtEns(backtestRecommend(lottery, 'ensemble', lookback));
      setRunning(false);
    }, 100);
  };

  return (
    <Card className="border-gray-800/50 bg-gradient-to-b from-gray-900 to-gray-950">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-200">回測中心</h3>
          <div className="flex gap-1">
            {[100, 300, 500].map(p => (
              <button key={p} onClick={() => setLookback(p)} className={`text-[9px] rounded px-1.5 py-0.5 transition ${lookback === p ? 'bg-amber-700 text-amber-200' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}>{p}期</button>
            ))}
          </div>
        </div>
        <button onClick={run} disabled={running} className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition disabled:opacity-50 mb-3 flex items-center justify-center gap-1.5">
          {running ? '計算中...' : `執行近${lookback}期回測`}
        </button>
        {!btHot && <p className="text-[11px] text-gray-500 text-center py-2">選擇期數後點擊執行</p>}
        {btHot && <div className="space-y-2">
          {[
            { label: '熱門預測', result: btHot, color: 'text-red-400', bar: 'bg-red-500' },
            { label: '冷門反彈', result: btCold, color: 'text-blue-400', bar: 'bg-blue-500' },
            { label: 'AI綜合', result: btEns, color: 'text-purple-400', bar: 'bg-purple-500' },
          ].map((item, i) => item.result && (
            <div key={i} className="bg-gray-900/50 rounded-lg p-2.5">
              <div className="flex justify-between text-[11px]"><span className={`font-bold ${item.color}`}>{item.label}</span><span className="text-gray-400">{item.result.hitRate}% ({item.result.hits}/{item.result.totalTests})</span></div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1"><div className={`h-full ${item.bar} rounded-full`} style={{ width: `${Math.min(100, item.result.hitRate * 3)}%` }} /></div>
              <p className="text-[9px] text-gray-600 mt-0.5">均配 {item.result.avgMatch} 個/期 · {item.result.totalTests}次測試</p>
            </div>
          ))}
        </div>}
      </CardContent>
    </Card>
  );
}
