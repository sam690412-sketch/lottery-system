// ============================================================
// V16 首頁 - 七彩種三步驟導引式選號
// ============================================================
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Alert, AlertDescription } from '@/components/ui/alert';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';
import { generateCombos } from '@/utils/comboGenerator';
import type { ComboGenerationLog } from '@/utils/comboGenerator';
import { calculate13LayerScores } from '@/utils/scoring';
import { getObservationWeights } from '@/utils/observationPool';
import { getMustInclude, getMustExclude, getWeightScores } from '@/utils/observationPoolV3';
import { getDreamWeightsAllSchools, loadDailyDreamWeights } from '@/utils/dreamSchools';
import { getMetaphysicsWeights, loadDailyMetaWeights, type MetaSchoolId } from '@/utils/metaphysicsSchools';
import { generateAllHexagrams, hexagramToWeights } from '@/utils/hexagram';
import { loadBirthData, runAllDivinations } from '@/utils/divination';
import { loadDreamRecords } from '@/utils/dreamDB';
import { filterDivinationByOrientation, type OrientationId } from '@/utils/metaphysicsOrientation';
import { calcMetaphysicsWeights } from '@/utils/divination';
import {
  isMethodAvailable, checkBeforeGenerate, canUseMetaphysics,
  canUseAllMode, useVipTrial, getVipTrialRemaining, getCurrentRole,
} from '@/utils/permissions';
import { calcStats, loadOrDefaultHistory } from '@/utils/history';
import { userGetJson, hasPersonalNumbers } from '@/utils/userStorage';
import SimpleResult from '@/components/v12/SimpleResult';
import {
  Clapperboard, BarChart3, Heart, Moon, Sparkles, Layers,
  ChevronRight, AlertCircle, Zap, Lock, Brain, TrendingUp, Crown
} from 'lucide-react';
import { getDailyRecommendation } from '@/utils/backtest';
import { trackEvent, trackHomeEntry } from '@/utils/analytics';
import { trackFunnel } from '@/utils/funnelAnalytics';
import { getABVariant, getUpgradeCTA, trackABClick } from '@/utils/abTest';
import { trackFirst } from '@/utils/behaviorTracker';
import UpgradeTriggerBanner from '@/components/UpgradeTriggerBanner';
import GenerationProgress from '@/components/GenerationProgress';

type MethodType = 'stat' | 'keep' | 'dream' | 'meta' | 'all';

interface GeneratedCombo {
  id: string;
  name: string;
  zone1: number[];
  zone2: number;
  score: number;
  reason: string;
  riskWarning: string;
  style: string;
  relaxationLog?: ComboGenerationLog[];
}

interface HomeState {
  step: number;
  lotteryType: LotteryType;
  methods: MethodType[];
  comboCount: number;
  results: GeneratedCombo[] | null;
  missingInfo: string[];
  generating: boolean;
  showResult: boolean;
  progress: number; // V18.2.11: 產號進度 0-100
}

const METHOD_OPTIONS: {
  id: MethodType; label: string; desc: string; icon: typeof BarChart3;
  color: string;
}[] = [
  { id: 'stat', label: '純統計', desc: '只使用歷史資料與13層漏斗', icon: BarChart3, color: 'border-blue-500/40 bg-blue-950/20 text-blue-400' },
  { id: 'keep', label: '養號延續', desc: '輸入固定號碼，系統微調', icon: Heart, color: 'border-rose-500/40 bg-rose-950/20 text-rose-400' },
  { id: 'dream', label: '夢境選牌', desc: '輸入夢境內容，轉為象徵權重', icon: Moon, color: 'border-indigo-500/40 bg-indigo-950/20 text-indigo-400' },
  { id: 'meta', label: '命理輔助', desc: '依出生資料建立個人化權重', icon: Sparkles, color: 'border-amber-500/40 bg-amber-950/20 text-amber-400' },
  { id: 'all', label: '綜合模式', desc: '統計+養號+夢境+命理一起評分', icon: Layers, color: 'border-purple-500/40 bg-purple-950/20 text-purple-400' },
];

const LOTTERY_OPTIONS: { id: LotteryType; label: string; desc: string; color: string; badge: string; category: string }[] = [
  { id: 'power', label: '威力彩', desc: '1~38選6碼 + 特別區1~8', color: 'border-amber-500/50 bg-amber-950/30 text-amber-400', badge: 'B1', category: 'lotto6' },
  { id: 'lotto649', label: '大樂透', desc: '1~49選6碼 + 特別號', color: 'border-blue-500/50 bg-blue-950/30 text-blue-400', badge: 'B2', category: 'lotto6' },
  { id: 'daily539', label: '今彩539', desc: '1~39選5碼', color: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-400', badge: 'D', category: 'lotto6' },
  { id: 'lotto49c', label: '49樂合彩', desc: '1~49 任2/任3/任4', color: 'border-cyan-500/50 bg-cyan-950/30 text-cyan-400', badge: 'C49', category: 'combine' },
  { id: 'daily39c', label: '39樂合彩', desc: '1~39 任2/任3/任4', color: 'border-rose-500/50 bg-rose-950/30 text-rose-400', badge: 'C39', category: 'combine' },
  { id: 'star3', label: '三星彩', desc: '0~9 三位數', color: 'border-violet-500/50 bg-violet-950/30 text-violet-400', badge: 'S3', category: 'digit' },
  { id: 'star4', label: '四星彩', desc: '0~9 四位數', color: 'border-orange-500/50 bg-orange-950/30 text-orange-400', badge: 'S4', category: 'digit' },
];

const COMBO_OPTIONS = [1, 2, 3, 5, 10];

export default function HomePage() {
  const navigate = useNavigate();
  // QA-FIX-1: 狀態頁（numbers/records/statistics/metaphysics/member 等）由 App.tsx 的
  // useState(page)+switch 渲染，navigate() 不會切換；改用與底部導覽相同的 v12-navigate 事件。
  const goToStatePage = (key: string) => {
    window.dispatchEvent(new CustomEvent('v12-navigate', { detail: key }));
  };
  const obsPoolRef = useRef(false);
  const [state, setState] = useState<HomeState>({
    step: 1,
    lotteryType: 'power',
    methods: ['stat'],
    comboCount: 3,
    results: null,
    missingInfo: [],
    generating: false,
    showResult: false,
    progress: 0,
  });

  const config = useMemo(() => getConfig(state.lotteryType), [state.lotteryType]);

  // V18.1: 漏斗追蹤 + A/B 測試
  // V18.1.1: 首頁訪客 + 首次登入追蹤
  useEffect(() => {
    trackFunnel('visitors');
    trackFirst('first_login');
  }, []);
  const abVariant = getABVariant();
  const abCTA = getUpgradeCTA(abVariant);

  const selectLottery = (type: LotteryType) => {
    // V16: 樂合彩跳轉專屬模式頁面
    if (type === 'lotto49c' || type === 'daily39c') {
      navigate(`/combine/${type}`);
      return;
    }
    // V16: 數位型跳轉分析中心
    if (type === 'star3' || type === 'star4') {
      navigate(`/analysis/${type}`);
      return;
    }
    // 原有六合彩型邏輯
    setState(s => ({ ...s, lotteryType: type, step: 2, showResult: false, results: null }));
  };

  const toggleMethod = useCallback((method: MethodType) => {
    setState(s => {
      const has = s.methods.includes(method);
      let next: MethodType[];
      if (has) {
        next = s.methods.filter(m => m !== method);
        if (next.length === 0) next = ['stat'];
      } else {
        next = [...s.methods, method];
        if (method === 'all') next = ['all'];
        else if (s.methods.includes('all')) next = [method];
      }
      return { ...s, methods: next };
    });
  }, []);

  const selectComboCount = useCallback((count: number) => {
    setState(s => ({ ...s, comboCount: count, step: 3 }));
  }, []);

  // V18.2.9 P0-2: 正確檢查養號（使用 v12-keep-sets 而非 keep-${lotteryType}）
  const checkMissing = useCallback((): string[] => {
    const missing: string[] = [];
    const { methods, lotteryType } = state;

    if (methods.includes('keep') || methods.includes('all')) {
      if (!hasPersonalNumbers(lotteryType)) missing.push('keep');
    }
    if (methods.includes('dream') || methods.includes('all')) {
      const records = loadDreamRecords();
      const dailyDreamW = loadDailyDreamWeights();
      if (records.length === 0 && (!dailyDreamW || Object.keys(dailyDreamW).length === 0)) missing.push('dream');
    }
    if (methods.includes('meta') || methods.includes('all')) {
      const birth = loadBirthData();
      const dailyMetaW = loadDailyMetaWeights();
      if (!birth && (!dailyMetaW || Object.keys(dailyMetaW).length === 0)) missing.push('meta');
    }
    return missing;
  }, [state.methods, state.lotteryType]);

  const handleGenerate = useCallback(() => {
    const missing = checkMissing();

    // V14.1: 測試員跳過缺失資料檢查
    if (getCurrentRole() === 'tester') {
      // 測試員直接產號，不檢查缺失資料
    } else if (missing.length > 0) {
      // V18.2.9: 存 key 而非渲染文字，避免雙重「未填寫」
      setState(s => ({ ...s, missingInfo: missing }));
      return;
    }

    // V13: 產號前檢查每日次數
    const dailyCheck = checkBeforeGenerate();
    if (!dailyCheck.allowed) {
      setState(s => ({ ...s, missingInfo: [dailyCheck.message || '今日產號次數已用完'] }));
      return;
    }

    // V13: 檢查命理權限（含VIP體驗券）
    if (state.methods.includes('meta') || state.methods.includes('all')) {
      if (!canUseMetaphysics()) {
        const remaining = getVipTrialRemaining();
        if (remaining === 0 && getCurrentRole() === 'free') {
          setState(s => ({ ...s, missingInfo: ['命理輔助需VIP會員，你的VIP體驗已用完，請升級'] }));
          return;
        }
      }
    }

    // V13: 檢查綜合模式權限
    if (state.methods.includes('all') && !canUseAllMode()) {
      const remaining = getVipTrialRemaining();
      if (remaining === 0 && getCurrentRole() === 'free') {
        setState(s => ({ ...s, missingInfo: ['綜合模式需VIP會員，你的VIP體驗已用完，請升級'] }));
        return;
      }
    }

    // V14.0: 檢查觀察池
    const useObservationPool = (document.getElementById('use-observation-pool') as HTMLInputElement)?.checked || false;
    obsPoolRef.current = useObservationPool;

    if (missing.length > 0) {
      setState(s => ({ ...s, missingInfo: missing, showResult: false }));
      return;
    }

    // V13: 使用VIP體驗券（免費會員使用命理/綜合模式時）
    let trialUsed = false;
    if (getCurrentRole() === 'free') {
      const needsMeta = state.methods.includes('meta') || state.methods.includes('all');
      const needsAll = state.methods.includes('all');
      if ((needsMeta || needsAll) && !canUseMetaphysics()) {
        // 已經在前面檢查過了，這裡不應該進入
      } else if ((needsMeta || needsAll) && getVipTrialRemaining() > 0) {
        const trialRes = useVipTrial();
        if (trialRes.success) trialUsed = true;
      }
    }

    setState(s => ({ ...s, generating: true, missingInfo: [], showResult: false, progress: 0 }));

    setTimeout(() => {
      try {
        const historyRecords = loadOrDefaultHistory();
        const stats = calcStats(historyRecords);

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);
        const userZone1 = [5, 7, 9, 29, 30, 31];

        const hexSet = generateAllHexagrams(dateStr, timeStr, userZone1);
        const hexWeights = hexagramToWeights(hexSet);

        const personalWeights: Record<number, number> = {};

        // V14.0: 收集夢境權重（依學派）- 優先讀取「今日夢境權重」
        let dreamW: Record<number, number> = {};
        if ((state.methods.includes('dream') || state.methods.includes('all'))) {
          // 優先讀取用戶點擊「加入今日夢境權重」保存的權重
          const dailyDreamW = loadDailyDreamWeights();
          if (dailyDreamW && Object.keys(dailyDreamW).length > 0) {
            dreamW = dailyDreamW;
            Object.keys(dailyDreamW).forEach(n => {
              personalWeights[Number(n)] = (personalWeights[Number(n)] || 10) + 15;
            });
          } else {
            // 回退：從夢境記錄計算
            const dreamRecords = loadDreamRecords();
            if (dreamRecords.length > 0) {
              const latest = dreamRecords[0];
              const dreamNums = [...(latest.suggestedNumbers || []), ...(latest.dreamNumbers || [])]
                .filter(n => n >= 1 && n <= config.mainMax);
              [...new Set(dreamNums)].forEach(n => {
                personalWeights[n] = (personalWeights[n] || 10) + 15;
              });
              dreamW = getDreamWeightsAllSchools(latest.content || '', latest.emotion || '普通');
            }
          }
        }

        // V14.0: 收集命理權重（依學派）- 優先讀取「今日命理權重」
        let metaW: Record<number, number> = {};
        if ((state.methods.includes('meta') || state.methods.includes('all'))) {
          // 優先讀取用戶點擊「加入今日命理權重」保存的權重
          const dailyMetaW = loadDailyMetaWeights();
          if (dailyMetaW && Object.keys(dailyMetaW).length > 0) {
            metaW = dailyMetaW;
            Object.keys(dailyMetaW).forEach(n => {
              personalWeights[Number(n)] = (personalWeights[Number(n)] || 10) + 15;
            });
          } else {
            // 回退：從出生資料計算
            const birthData = loadBirthData();
            if (birthData) {
              const divResults = runAllDivinations(birthData);
              const orientation = userGetJson<OrientationId>('selected-orientation', 'wuxing');
              const filtered = filterDivinationByOrientation(divResults, orientation);
              const enabledResults = filtered.filter(r => r.enabled);
              if (enabledResults.length > 0) {
                const metaWeights = calcMetaphysicsWeights(enabledResults as Parameters<typeof calcMetaphysicsWeights>[0]);
                Object.entries(metaWeights).forEach(([num, weight]) => {
                  personalWeights[Number(num)] = (personalWeights[Number(num)] || 10) + weight * 0.3;
                });
              }
              const enabledSchools = userGetJson<string[]>('enabled-meta-schools',
                ['bazi', 'meihua', 'ziwei', 'heluo', 'numerology']);
              metaW = getMetaphysicsWeights(
              birthData.year, birthData.month, birthData.day,
              birthData.hour || 0, birthData.gender || '男',
              enabledSchools as MetaSchoolId[]
            );
            }
          }
        }

        // V16.3: 讀取 Observation Pool V3
        const mustInclude = getMustInclude(state.lotteryType);
        const mustExclude = getMustExclude(state.lotteryType);
        const v3WeightScores = getWeightScores(state.lotteryType);

        // V14.0: 收集觀察池權重（合併 V2 + V3 high/medium/low）
        const baseObsWeights = useObservationPool ? (getObservationWeights() || {}) : {};
        const obsWeights: Record<number, number> = { ...baseObsWeights };
        // V3 high/medium/low 權重合併
        for (const [num, weight] of Object.entries(v3WeightScores)) {
          const n = Number(num);
          obsWeights[n] = (obsWeights[n] || 0) + weight;
        }

        const scores = calculate13LayerScores(
          stats, userZone1, hexWeights, true,
          Object.keys(obsWeights).length > 0 ? obsWeights : undefined,
          dreamW,
          metaW,
        );

        const personalWeightBonus = (n: number) =>
          (dreamW[n] || 0) * 0.1 + (metaW[n] || 0) * 0.1 + (obsWeights[n] || 0) * 0.05;

        const enhancedScores = scores.map(s => ({
          ...s,
          total: s.total + personalWeightBonus(s.number) + (personalWeights[s.number] || 0) * 0.5,
        }));

        // V16.3: 傳入 must_include / must_exclude
        const { combos, warnings: comboWarnings } = generateCombos(
          state.lotteryType, enhancedScores, userZone1,
          '平衡', state.comboCount, true,
          mustInclude, mustExclude,
        );

        // V16.3: 顯示警告
        if (comboWarnings) {
          console.warn('[V3 Home]', comboWarnings);
        }

        // V13: 加入體驗券使用提示
        const resultCombos = combos as GeneratedCombo[];
        if (trialUsed) {
          const remaining = getVipTrialRemaining();
          resultCombos.forEach(c => {
            c.reason = `【VIP體驗已使用，剩餘${remaining}次】${c.reason}`;
          });
        }

        setState(s => ({
          ...s, generating: false, showResult: true, progress: 100,
          results: resultCombos,
          missingInfo: [],
        }));
      } catch (e) {
        void e;
        setState(s => ({ ...s, generating: false, missingInfo: ['產號時發生錯誤，請重試'] }));
      }
    // V18.2.11 MODULE C: 延遲產號完成，確保進度動畫至少顯示 1.5 秒
    }, 1800);
  }, [state.lotteryType, state.methods, state.comboCount, checkMissing, config.mainMax]);

  // V18.2.9 P0-1: 正確導航到填寫頁面
  const goToFill = useCallback((key: string) => {
    const pageMap: Record<string, string> = {
      'keep': 'numbers', 'dream': 'dream', 'meta': 'metaphysics',
    };
    const page = pageMap[key];
    if (page) {
      navigate(`/${page}`);
    }
  }, [navigate]);

  // V18.2.11 MODULE C: 產號進度動畫
  // 當 generating=true 時啟動進度條，至少顯示 1.5 秒
  const generationStartRef = useRef<number>(0);
  useEffect(() => {
    if (state.generating && generationStartRef.current === 0) {
      generationStartRef.current = Date.now();
    }
    if (!state.generating) {
      generationStartRef.current = 0;
    }
  }, [state.generating]);

  useEffect(() => {
    if (!state.generating) return;

    const MIN_DURATION = 1500;
    const tick = setInterval(() => {
      const elapsed = Date.now() - generationStartRef.current;
      // 0→90% 線性增長，至少持續 MIN_DURATION
      const target = Math.min(90, Math.floor((elapsed / MIN_DURATION) * 90));
      setState(s => s.progress < target ? { ...s, progress: target } : s);
    }, 80);

    return () => clearInterval(tick);
  }, [state.generating]);

  const currentStep = state.step;

  // V16.4: 今日AI推薦
  const dailyRec = useMemo(() => getDailyRecommendation(state.lotteryType), [state.lotteryType]);
  
  // V18: 付費牆控制
  const role = getCurrentRole();
  const isVIP = role === 'vip' || role === 'tester' || role === 'admin';

  return (
    <div className="space-y-6 pb-24">
      {/* V18.1.2 MODULE 1: UpgradeTriggerBanner - 條件觸發升級橫幅 */}
      {!isVIP && <UpgradeTriggerBanner />}

      {/* V16-6: 打造我的專屬號碼 — 第一屏主入口 */}
      <div className="rounded-2xl border border-amber-700/40 bg-gradient-to-b from-amber-950/30 to-transparent p-6 text-center">
        <h2 className="text-xl font-bold text-amber-300 mb-1">打造我的專屬號碼</h2>
        <p className="text-xs text-gray-400 mb-1">先用統計建立號碼池，再加入夢境、生日與命理，最後產生你的專屬號碼。</p>
        <p className="text-[11px] text-gray-500 mb-4">一步一步，做出屬於你的號碼。</p>
        <button
          onClick={() => navigate('/builder')}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-sm font-bold text-white transition shadow-lg shadow-amber-500/20"
        >
          開始打造我的專屬號碼
        </button>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs">
          <button onClick={() => goToStatePage('numbers')} className="text-gray-400 hover:text-amber-300 underline">快速選號</button>
          <button onClick={() => goToStatePage('records')} className="text-gray-400 hover:text-amber-300 underline">查看紀錄</button>
        </div>
      </div>

      {/* V16-6: 進階功能（非第一屏主入口；舊頁保留，僅收斂入口） */}
      <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
        <div className="text-sm font-bold text-gray-300 mb-1">進階功能</div>
        <p className="text-[11px] text-gray-500 mb-3">想深入查看統計、趨勢、AI 與命理分析，可以從這裡進入。</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button onClick={() => goToStatePage('statistics')} className="py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:border-amber-600/50">統計分析</button>
          <button onClick={() => navigate('/ai-analysis')} className="py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:border-amber-600/50">AI 深度分析</button>
          <button onClick={() => goToStatePage('metaphysics')} className="py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:border-amber-600/50">命理夢境</button>
          <button onClick={() => navigate('/trend')} className="py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:border-amber-600/50">趨勢分析</button>
        </div>
      </div>

      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-gray-100">選號導引</h1>
        <p className="text-sm text-gray-500 mt-1">三步驟完成你的今日選號</p>
      </div>

      {/* V16.4 Module B: 今日AI推薦卡 */}
      <Card className="border border-purple-800/50 bg-gradient-to-br from-purple-950/40 to-gray-900/80 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-purple-300">今日AI推薦</h2>
            <span className="text-xs text-gray-600 ml-auto">{dailyRec.date} 更新</span>
          </div>

          {/* 推薦號碼 - V18 付費牆 */}
          <div className="flex gap-2 mb-3 justify-center">
            {dailyRec.numbers.slice(0, isVIP ? 6 : 2).map((n, i) => (
              <div key={i} className="w-10 h-10 rounded-full bg-purple-500/20 border-2 border-purple-500/50 flex items-center justify-center text-sm font-bold text-purple-300">
                {String(n).padStart(2, '0')}
              </div>
            ))}
            {!isVIP && dailyRec.numbers.length > 2 && (
              <div className="w-10 h-10 rounded-full bg-gray-700/50 border-2 border-dashed border-gray-600 flex items-center justify-center text-xs text-gray-500 cursor-pointer" onClick={() => { trackEvent('vip_upgrade_click', 'ai_recommend_locked'); trackFirst('first_ai_recommend'); }}>
                <Lock className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* V18: VIP 提示 */}
          {!isVIP && (
            <div className="text-center mb-3">
              <p className="text-xs text-amber-400">免費會員顯示前2碼 · <button onClick={() => { trackEvent('vip_upgrade_click', 'ai_recommend_banner'); goToStatePage('member'); }} className="underline hover:text-amber-300">升級VIP</button> 查看完整6碼 + 每日5組</p>
            </div>
          )}

          {/* 信心度 + 主導來源 + 理由 */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-900/50 rounded p-2">
              <div className="text-xs text-gray-500">信心度</div>
              <div className="text-sm font-bold text-purple-400">{dailyRec.confidence}分</div>
            </div>
            <div className="bg-gray-900/50 rounded p-2">
              <div className="text-xs text-gray-500">主導來源</div>
              <div className="text-sm font-bold text-cyan-400">{dailyRec.dominantSource}</div>
            </div>
            <div className="bg-gray-900/50 rounded p-2">
              <div className="text-xs text-gray-500">推薦理由</div>
              <div className="text-xs text-gray-300 leading-tight">{dailyRec.reason}</div>
            </div>
          </div>

          {/* 驗證中心入口 */}
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-purple-700/50 text-purple-400 hover:bg-purple-950/30"
              onClick={() => navigate('/verify')}
            >
              <TrendingUp className="w-4 h-4 mr-1" />開獎驗證中心
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* V19.2.1: 雙入口導航 - 玄學派 / 數據派 */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { trackHomeEntry('xuanxue'); navigate('/xuanxue'); }}
          className="p-4 rounded-xl border border-purple-800/40 bg-gradient-to-b from-purple-950/30 to-gray-900/80 text-center hover:border-purple-700/60 transition group">
          <Moon className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition" />
          <h3 className="text-sm font-bold text-purple-300 mb-0.5">玄學選號</h3>
          <p className="text-[10px] text-gray-500">夢境 · 命理 · 養號</p>
        </button>
        <button onClick={() => { trackHomeEntry('data'); navigate('/ai-analysis'); }}
          className="p-4 rounded-xl border border-cyan-800/40 bg-gradient-to-b from-cyan-950/30 to-gray-900/80 text-center hover:border-cyan-700/60 transition group">
          <TrendingUp className="w-6 h-6 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition" />
          <h3 className="text-sm font-bold text-cyan-300 mb-0.5">AI數據選號</h3>
          <p className="text-[10px] text-gray-500">統計 · 趨勢 · AI分析</p>
        </button>
      </div>

      {/* 步驟指示器 */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map(step => (
          <div key={step} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
              step < currentStep ? 'bg-emerald-600 text-white' :
              step === currentStep ? 'bg-amber-500 text-white' :
              'bg-gray-800 text-gray-500'
            }`}>
              {step < currentStep ? '✓' : step}
            </div>
            {step < 3 && <div className={`w-8 h-0.5 ${step < currentStep ? 'bg-emerald-600' : 'bg-gray-800'}`} />}
          </div>
        ))}
      </div>

      {/* 步驟1：選彩種 */}
      {currentStep === 1 && (
        <Card className="border border-gray-800 bg-gray-900/80">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Clapperboard className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-gray-100">步驟1：選彩種</h2>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {LOTTERY_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => selectLottery(opt.id)}
                  className={`p-4 rounded-xl border-2 text-left transition flex items-center gap-3 ${
                    state.lotteryType === opt.id
                      ? opt.color
                      : 'border-gray-800 bg-gray-800/30 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    state.lotteryType === opt.id ? 'bg-white/10' : 'bg-gray-800'
                  }`}>
                    {opt.badge}
                  </div>
                  <div>
                    <p className="font-bold text-base">{opt.label}</p>
                    <p className="text-xs opacity-70">{opt.desc}</p>
                  </div>
                  {state.lotteryType === opt.id && <span className="ml-auto text-lg">✓</span>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步驟2：選號方式 */}
      {currentStep === 2 && (
        <Card className="border border-gray-800 bg-gray-900/80">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-gray-100">步驟2：選號方式</h2>
            </div>
            <p className="text-xs text-gray-500">可選擇一種或多種</p>
            <div className="grid grid-cols-1 gap-2">
              {METHOD_OPTIONS.map(opt => {
                const isSelected = state.methods.includes(opt.id);
                const check = isMethodAvailable(opt.id);
                const isLocked = !check.available;
                return (
                  <button
                    key={opt.id}
                    onClick={() => !isLocked && toggleMethod(opt.id)}
                    disabled={isLocked}
                    className={`p-4 rounded-xl border-2 text-left transition flex items-center gap-3 relative ${
                      isSelected
                        ? opt.color
                        : isLocked
                          ? 'border-gray-800/50 bg-gray-900/30 text-gray-600 opacity-60'
                          : 'border-gray-800 bg-gray-800/30 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <opt.icon className="w-5 h-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-base">{opt.label}</p>
                        {isLocked && <Lock className="w-3 h-3 text-gray-500" />}
                      </div>
                      <p className="text-xs opacity-70">{opt.desc}</p>
                      {isLocked && check.message && (
                        <p className="text-xs text-amber-500 mt-1">{check.message}</p>
                      )}
                    </div>
                    {isSelected && <span className="ml-auto text-lg shrink-0">✓</span>}
                  </button>
                );
              })}
            </div>
            <Button
              onClick={() => setState(s => ({ ...s, step: 3 }))}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200"
            >
              下一步 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 步驟3：產生組數 */}
      {currentStep >= 3 && (
        <Card className="border border-gray-800 bg-gray-900/80">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-gray-100">步驟3：產生組數</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {COMBO_OPTIONS.map(count => (
                <button
                  key={count}
                  onClick={() => selectComboCount(count)}
                  className={`px-6 py-3 rounded-xl border-2 text-lg font-bold transition ${
                    state.comboCount === count
                      ? 'border-amber-500 bg-amber-950/30 text-amber-400'
                      : 'border-gray-800 bg-gray-800/30 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  {count} 組
                </button>
              ))}
            </div>

            {/* V14.0: 觀察池選項 */}
            <div className="flex items-center gap-2 py-2 px-3 rounded bg-gray-800/50 border border-gray-700">
              <input type="checkbox" id="use-observation-pool" className="w-4 h-4 accent-amber-500" />
              <label htmlFor="use-observation-pool" className="text-sm text-gray-300 cursor-pointer">
                使用統計觀察池加權
              </label>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={state.generating}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white"
            >
              {state.generating ? '產號中...' : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  開始產號
                </>
              )}
            </Button>

            {state.missingInfo.length > 0 && (
              <Alert className="border-amber-500/40 bg-amber-950/20">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <AlertDescription className="text-amber-300 text-sm">
                  <p className="font-bold mb-1">請先完成以下資料：</p>
                  {state.missingInfo.map((item, i) => {
                    // V18.2.9 P0-4: 正確中文標籤
                    const labelMap: Record<string, string> = {
                      'keep': '養號尚未設定',
                      'dream': '夢境尚未解析',
                      'meta': '命理資料尚未完成',
                    };
                    const label = labelMap[item] || item;
                    const isQuotaError = item === '今日產號次數已用完，請明日再試或升級會員';
                    return (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-amber-800/20 last:border-0">
                        <span className="text-amber-300">• {label}</span>
                        {!isQuotaError && (
                          <button
                            onClick={() => goToFill(item)}
                            className="text-xs px-2 py-0.5 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 transition"
                          >
                            去填寫 →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </AlertDescription>
              </Alert>
            )}

            {/* V18.2.11 MODULE B: 產號進度動畫 */}
            {state.generating && !state.showResult && (
              <GenerationProgress progress={state.progress} />
            )}
          </CardContent>
        </Card>
      )}

      {/* V18.1: A/B 測試快速入口 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { trackEvent('xuanxue', 'nav_click'); navigate('/xuanxue'); }}
          className="p-3 rounded-xl border border-purple-800/50 bg-purple-950/20 text-left transition hover:bg-purple-950/30"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-purple-300">玄學選號</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">夢境·生日·手機·車牌·發票</p>
        </button>
        <button
          onClick={() => { trackEvent('vip_upgrade_click', `nav_quick_ab${abVariant}`); trackFunnel('vipViews'); trackABClick('vip_nav'); navigate('/vip-value'); }}
          className={`p-3 rounded-xl border text-left transition hover:scale-105 ${
            abVariant === 'A' ? 'border-purple-500 bg-purple-950/30' :
            abVariant === 'B' ? 'border-cyan-500 bg-cyan-950/30' :
            'border-indigo-500 bg-indigo-950/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <Crown className={`w-4 h-4 ${abVariant === 'A' ? 'text-purple-400' : abVariant === 'B' ? 'text-cyan-400' : 'text-indigo-400'}`} />
            <span className={`text-sm font-bold ${abVariant === 'A' ? 'text-purple-300' : abVariant === 'B' ? 'text-cyan-300' : 'text-indigo-300'}`}>{abCTA.highlight}</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">{abCTA.title}</p>
        </button>
      </div>

      {/* 產號結果 */}
      {state.showResult && state.results && (
        <SimpleResult
          combos={state.results}
          methods={state.methods}
          lotteryType={state.lotteryType}
          useObservationPool={obsPoolRef.current}
        />
      )}
   
      {/* 產號結果 */}
      {state.showResult && state.results && (
        <SimpleResult
          combos={state.results}
          methods={state.methods}
          lotteryType={state.lotteryType}
          useObservationPool={obsPoolRef.current}
        />
      )}
    </div>
  );
}
