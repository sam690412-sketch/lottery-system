// ============================================================
// 打造我的專屬號碼
// ============================================================
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, ChevronRight, Filter, SkipForward, RotateCcw, Sparkles } from 'lucide-react';
import StepIndicator, { BUILDER_STEPS } from '@/components/builder/StepIndicator';
import { analysisLink, type SavedNumbers } from '@/utils/quickPick';
import { getConfig, type LotteryType } from '@/utils/lotteryConfig';
import { userGetJson, userSetJson, USER_KEYS } from '@/utils/userStorage';
import { recordPreference, recordCollectionHistory, buildPersonalSeed, buildExplanation, recordAnalysisHistory } from '@/utils/personalProfile';
// V16-2: 統計整合（只呼叫既有 statistics.ts）
import { runBuilderStatistics, buildBaseNumberPool, type BuilderStatsResult, type BaseNumberPool } from '@/utils/builderStats';
// V16-3: 夢境/生日 疊加（只呼叫既有 dream/personalNumber 引擎）
import { applyDreamToPool, applyBirthdayToPool, type Influence } from '@/utils/builderPersonalization';
// V16-4: 命理疊加（只呼叫既有 metaphysicsSchools 引擎）+ VIP gating（沿用既有 helper）
import { applyMetaphysicsToPool, BUILDER_META_SCHOOLS } from '@/utils/builderMetaphysics';
// V16-5: AI 融合與結果（只依 currentNumberPool 權重排序，不接真實 AI/backtest）
import { buildFinalBuilderResult, type FinalBuilderResult } from '@/utils/builderFusion';
import { useSyncExternalStore } from 'react';
import { getBackendAuthSnapshot, subscribeBackendAuthSnapshot } from '@/utils/backendAuthSnapshot';
import { getPermGuardSource, computeBackendPermission } from '@/utils/backendPermission';

interface StepContent {
  title: string;
  desc: string;
}

const LOTTERIES = [
  { id: 'power', jackpot: '頭獎須對中第一區 6 號及第二區 1 號', ball: '' },
  { id: 'lotto649', jackpot: '頭獎須對中 6 個主號', ball: 'v33-ball-silver' },
  { id: 'daily539', jackpot: '頭獎須對中 5 個主號', ball: 'v33-ball-data' },
] as const;

const STEP_CONTENT: StepContent[] = [
  { title: '先選擇要打造的彩種', desc: '從歷史統計建立候選池，再選擇是否加上個人條件。' },
  { title: '先用歷史資料建立基礎號碼池', desc: '系統會先看熱號、冷號與遺漏值，建立第一版號碼池。' },
  { title: '想加入夢境嗎？', desc: '例如夢見水、蛇、飛機，系統會把夢境轉成號碼影響。可以略過。' },
  { title: '加入生日或紀念日', desc: '生日會變成你的個人號碼權重。可以略過。' },
  { title: '加入命理分析', desc: 'VIP 可使用八字、梅花易數、紫微等方式調整號碼。可以略過。' },
  { title: '你的專屬號碼完成了', desc: '這組號碼整合了你選擇的統計、夢境、生日與命理來源。' },
];

// V16-2.5: 影響強度箭頭（純顯示，從既有 weight 衍生，不重新計算）
function intensityArrows(weight: number): string {
  if (weight >= 25) return '↑↑↑';
  if (weight >= 15) return '↑↑';
  if (weight >= 1) return '↑';
  return '–';
}

// V16-3: 號碼池前 6 名（顯示用）
function renderPoolTop6(pool: BaseNumberPool) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-300 mb-1">更新後號碼池</div>
      <div className="flex flex-wrap gap-2">
        {pool.entries.slice(0, 6).map((e) => (
          <span key={e.num}
            className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/50 flex items-center justify-center text-sm font-bold text-amber-300">
            {String(e.num).padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  );
}

// V16-3: 打造進度條（顯示用）
function renderProgress(rows: { label: string; pct: number }[]) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-300 mb-2">打造進度</div>
      <div className="space-y-1.5">
        {rows.map((p) => (
          <div key={p.label} className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 w-10">{p.label}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${p.pct}%` }} />
            </div>
            <span className="text-gray-500 w-8 text-right">{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BuilderPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get('game');
  const [step, setStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const last = BUILDER_STEPS.length - 1;

  // V16-2: 彩種選擇 + 統計分析狀態
  const [lotteryType, setLotteryType] = useState<LotteryType | null>(() => requested === 'power' || requested === 'lotto649' || requested === 'daily539' ? requested : null);
  // QA-FIX-1: 收藏到「我的號碼」(同一套 v12-keep-sets storage)。訪客本機暫存。
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'duplicate' | 'failed'>('idle');
  const saveToMyNumbers = () => {
    if (!finalResult || !lotteryType) return;
    const existing = userGetJson<SavedNumbers[]>(USER_KEYS.KEEP_SETS, []);
    const nums = [...finalResult.mainNumbers];
    // 重複偵測：同彩種 + 同主號（排序後比對）
    const sortedKey = (a: number[]) => [...a].sort((x, y) => x - y).join(',');
    const isDup = existing.some((s) => s.type === lotteryType && sortedKey(s.numbers) === sortedKey(nums));
    if (isDup) { setSaveStatus('duplicate'); return; }
    const secondZone = getConfig(lotteryType).specialMode === 'separate' ? finalResult.specialNumber : undefined;
    const special = secondZone === undefined && finalResult.specialNumber !== undefined
      ? `特別號 ${finalResult.specialNumber}` : '';
    const newSet: SavedNumbers = {
      id: Date.now().toString(),
      name: `打造號碼 ${new Date().toLocaleDateString('zh-TW')}`,
      numbers: nums,
      type: lotteryType,
      note: ['由打造流程產生', special].filter(Boolean).join('・'),
      secondZone,
    };
    userSetJson(USER_KEYS.KEEP_SETS, [newSet, ...existing]);
    if (!userGetJson<SavedNumbers[]>(USER_KEYS.KEEP_SETS, []).some(set => set.id === newSet.id)) {
      setSaveStatus('failed');
      return;
    }
    // V19 Sprint-4: 記錄偏好記憶 + 收藏歷史（localStorage，不建後端）
    recordPreference({ lottery: lotteryType, collected: nums });
    recordCollectionHistory(`${lotteryType} · ${nums.slice(0, 3).join(',')}…`);
    recordAnalysisHistory(`${lotteryType} · ${(finalResult.sourceWeights || []).filter(w => w.pct > 0).map(w => w.label).join('+') || '統計'}`);
    setSaveStatus('saved');
  };
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<BuilderStatsResult | null>(null);
  const [baseNumberPool, setBaseNumberPool] = useState<BaseNumberPool | null>(null);
  const [statsDetailOpen, setStatsDetailOpen] = useState(false); // V16-7: 統計詳情收合

  // V16-3: 夢境/生日 疊加狀態（currentNumberPool = 疊加後的池）
  const [currentNumberPool, setCurrentNumberPool] = useState<BaseNumberPool | null>(null);
  const [dreamText, setDreamText] = useState('');
  const [dreamApplied, setDreamApplied] = useState(false);
  const [dreamInfluences, setDreamInfluences] = useState<Influence[]>([]);
  const [dreamSummary, setDreamSummary] = useState('');
  const [birthday, setBirthday] = useState('');
  const [birthdayApplied, setBirthdayApplied] = useState(false);
  const [birthdayInfluences, setBirthdayInfluences] = useState<Influence[]>([]);
  const [birthdaySummary, setBirthdaySummary] = useState('');

  // V16-4: 命理狀態 + VIP gating（沿用既有 backendPermission/snapshot；flag 預設 localStorage）
  const [metaMethod, setMetaMethod] = useState<string>('');
  const [metaBirthday, setMetaBirthday] = useState('');
  const [metaQuestion, setMetaQuestion] = useState('');
  const [metaApplied, setMetaApplied] = useState(false);
  const [metaInfluences, setMetaInfluences] = useState<Influence[]>([]);
  const [metaSummary, setMetaSummary] = useState('');

  const permSource = getPermGuardSource();
  const snapshot = useSyncExternalStore(subscribeBackendAuthSnapshot, getBackendAuthSnapshot, getBackendAuthSnapshot);
  const metaPerm = computeBackendPermission(snapshot, 'metaphysics');
  // localStorage 模式維持現狀（命理沿用既有頁的 gating；此處 builder 不改 permissions 本體）：
  // 預設 localStorage 模式時，本 wizard 命理視為「可嘗試」（與既有 MetaphysicsPage 一致性由 V16-4 後另行對齊）。
  const metaUnlocked = permSource === 'backend' ? metaPerm.state === 'allow' : true;

  // 進入 Step 2（統計）時自動執行；只呼叫既有 statistics.ts
  function runStatistics(type: LotteryType) {
    setAnalysisLoading(true);
    try {
      const result = runBuilderStatistics(type);
      const pool = buildBaseNumberPool(result);
      setAnalysisResult(result);
      setBaseNumberPool(pool);
      setCurrentNumberPool(pool); // V16-3: 疊加起點 = 基礎池
    } finally {
      setAnalysisLoading(false);
    }
  }

  // V16-3: 夢境疊加（呼叫既有 dream 引擎，疊加到 currentNumberPool）
  function handleApplyDream() {
    if (!currentNumberPool || !dreamText.trim() || dreamApplied) return;
    const r = applyDreamToPool(currentNumberPool, dreamText);
    setCurrentNumberPool(r.pool);
    setDreamInfluences(r.influences);
    setDreamSummary(r.summary);
    setDreamApplied(true);
  }

  // V16-3: 生日疊加（呼叫既有 personalNumber 引擎，疊加到 currentNumberPool）
  function handleApplyBirthday() {
    if (!currentNumberPool || !birthday || birthday > today || birthdayApplied) return;
    const r = applyBirthdayToPool(currentNumberPool, birthday);
    setCurrentNumberPool(r.pool);
    setBirthdayInfluences(r.influences);
    setBirthdaySummary(r.summary);
    setBirthdayApplied(true);
  }

  // V16-4: 命理疊加（呼叫既有 metaphysicsSchools 引擎，疊加到 currentNumberPool）
  function handleApplyMetaphysics() {
    if (!currentNumberPool || !metaMethod || !metaBirthday || metaApplied) return;
    const r = applyMetaphysicsToPool(currentNumberPool, { birthday: metaBirthday, method: metaMethod, question: metaQuestion });
    setCurrentNumberPool(r.pool);
    setMetaInfluences(r.influences);
    setMetaSummary(r.summary);
    setMetaApplied(true);
  }

  const goToStep = (next: number) => {
    if (next > 0 && !lotteryType) return;
    if (next > 0 && lotteryType && !analysisResult) runStatistics(lotteryType);
    if (next > step) {
      setCompletedSteps(completed => [...new Set([
        ...completed, step, ...(next > 1 ? [0, 1] : []),
      ])]);
    }
    setStep(next);
  };
  const goNext = () => goToStep(Math.min(last, step + 1));
  const goPrev = () => setStep((s) => Math.max(0, s - 1));
  const skip = () => goNext();
  const restart = () => {
    setSaveStatus('idle');
    setStep(0);
    setCompletedSteps([]);
    setLotteryType(null);
    setAnalysisResult(null);
    setBaseNumberPool(null);
    setCurrentNumberPool(null);
    setDreamText(''); setDreamApplied(false); setDreamInfluences([]); setDreamSummary('');
    setBirthday(''); setBirthdayApplied(false); setBirthdayInfluences([]); setBirthdaySummary('');
    setMetaMethod(''); setMetaBirthday(''); setMetaQuestion(''); setMetaApplied(false); setMetaInfluences([]); setMetaSummary('');
  };

  // V16-3/4: 動態打造進度（夢境/生日/命理 套用後才 15%）
  const buildProgress: { label: string; pct: number }[] = [
    { label: '統計', pct: baseNumberPool ? 30 : 0 },
    { label: '夢境', pct: dreamApplied ? 15 : 0 },
    { label: '生日', pct: birthdayApplied ? 15 : 0 },
    { label: '命理', pct: metaApplied ? 15 : 0 },
    { label: 'AI', pct: 0 },
  ];

  // V16-5: 最終結果（只依 currentNumberPool 權重排序；不接真實 AI/backtest）
  const finalResult: FinalBuilderResult | null =
    currentNumberPool && lotteryType
      ? buildFinalBuilderResult({
          lotteryType,
          currentNumberPool,
          appliedSources: {
            statistics: !!baseNumberPool,
            dream: dreamApplied,
            birthday: birthdayApplied,
            metaphysics: metaApplied,
          },
        })
      : null;

  const currentConfig = lotteryType ? getConfig(lotteryType) : null;
  const mainRange = currentConfig ? currentConfig.mainMax - currentConfig.mainMin + 1 : 0;
  const eligibleCandidates = currentConfig && currentNumberPool
    ? new Set(currentNumberPool.entries
        .filter(({ num }) => num >= currentConfig.mainMin && num <= currentConfig.mainMax)
        .map(({ num }) => num)).size
    : mainRange;
  const omittedCandidates = mainRange - eligibleCandidates;
  const retainedPct = mainRange ? Math.round(100 * eligibleCandidates / mainRange) : 0;

  const content = STEP_CONTENT[step];
  const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const isResultStep = step === last;
  // 中間步驟（夢境/生日/命理）可略過
  const canSkip = step >= 2 && step <= 4;

  return (
    <div className="v33-workbench v33-builder">
      {/* Header */}
      <div className="v33-builder-header flex items-center gap-2 pt-2">
        <button aria-label="返回上一頁" onClick={() => window.history.state?.idx ? navigate(-1) : navigate('/')} className="p-2 rounded-lg hover:bg-gray-800/50 transition">
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h1 className="v33-workbench-title font-bold text-gray-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            打造我的專屬號碼
          </h1>
          <p className="text-xs text-gray-500">可返回已完成步驟。後續步驟請點「下一步」。</p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} completed={completedSteps} canContinue={Boolean(lotteryType)} onJump={goToStep} />

      {/* Step content */}
      <Card className="v33-builder-content">
        <CardContent className="v33-builder-content-inner space-y-3 min-h-[200px]">
          <div className="text-xs text-amber-400">步驟 {step + 1} / {BUILDER_STEPS.length}</div>
          <h2 className="text-lg font-bold text-gray-100">{content.title}</h2>
          <p className="text-sm text-gray-400">{content.desc}</p>

          {step === 0 ? (
            /* Step 1: 彩種選擇 */
            <div className="v33-builder-games">
              {LOTTERIES.map((lottery) => {
                const config = getConfig(lottery.id);
                const selected = lotteryType === lottery.id;
                return (
                  <button key={lottery.id} type="button" aria-pressed={selected}
                    className="v33-builder-game"
                    onClick={() => {
                      if (!selected) {
                        restart();
                        setLotteryType(lottery.id);
                      }
                    }}>
                    <span className={`v33-builder-game-ball v33-sphere ${lottery.ball}`} aria-hidden="true">
                      <span className="v33-ball-face">{config.mainMax}</span>
                    </span>
                    <span className="v33-builder-game-copy">
                      <strong>{config.name}</strong>
                      <span>{lottery.jackpot}</span>
                    </span>
                    <span className="v33-builder-game-check" aria-hidden="true">
                      {selected && <Check size={15} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : step === 1 ? (
            /* Step 2: 基礎統計（呼叫既有 statistics.ts） */
            analysisLoading ? (
              <div className="mt-4 text-center text-sm text-gray-500 py-8">分析中…</div>
            ) : analysisResult ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg bg-gray-950/40 border border-gray-800 p-3 text-xs text-gray-400">{analysisResult.summary}</div>
                <div className="text-xs text-amber-300">基礎號碼池已建立（{baseNumberPool?.entries.length ?? 0} 個號碼）· 統計權重 30%</div>

                {/* V16-7: 統計詳情可收合，避免一進來滿版數據 */}
                <button
                  onClick={() => setStatsDetailOpen((v) => !v)}
                  className="text-xs text-gray-400 hover:text-amber-300 underline"
                >
                  {statsDetailOpen ? '收合統計詳情' : '查看統計詳情（熱號／冷號／遺漏／分布）'}
                </button>
                {statsDetailOpen && (
                  <div className="space-y-2 rounded-lg bg-gray-950/30 border border-gray-800 p-3">
                    <div>
                      <span className="text-amber-400 font-bold">熱號 Top10：</span>
                      <span className="text-gray-300">{analysisResult.hotTop10.map((h) => h.number).join('、')}</span>
                    </div>
                    <div>
                      <span className="text-sky-400 font-bold">冷號 Top10：</span>
                      <span className="text-gray-300">{analysisResult.coldTop10.map((c) => c.number).join('、')}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">遺漏值（前5）：</span>
                      <span className="text-gray-300">{analysisResult.missing.slice(0, 5).map((m) => `${m.number}(${m.missingPeriods})`).join('、')}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">區間分布：</span>
                      <span className="text-gray-300">奇偶 {analysisResult.oddEven.oddRate} / {analysisResult.oddEven.evenRate}；大小 {analysisResult.bigSmall.bigRate} / {analysisResult.bigSmall.smallRate}</span>
                    </div>
                  </div>
                )}

                {/* V16-2.5: 文案 */}
                {baseNumberPool && (
                  <div className="mt-2 pt-3 border-t border-gray-800 space-y-1">
                    <h3 className="text-base font-bold text-amber-300">你的專屬號碼正在成形</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      統計分析已經開始影響你的號碼。下一步加入夢境、生日或命理後，號碼池還會繼續調整。
                    </p>
                  </div>
                )}

                {/* V16-2.5: 目前專屬號碼池（前 6 名，號碼球） */}
                {baseNumberPool && baseNumberPool.entries.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-bold text-gray-300 mb-2">目前專屬號碼池</div>
                    <div className="flex flex-wrap gap-2">
                      {baseNumberPool.entries.slice(0, 6).map((e) => (
                        <span key={e.num}
                          className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/50 flex items-center justify-center text-sm font-bold text-amber-300">
                          {String(e.num).padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* V16-2.5: 影響來源（直接用既有 reasons，不重新計算） */}
                {baseNumberPool && baseNumberPool.entries.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-bold text-gray-300 mb-2">統計影響</div>
                    <div className="space-y-1">
                      {baseNumberPool.entries.slice(0, 6).map((e) => (
                        <div key={e.num} className="flex items-center gap-2 text-xs">
                          <span className="text-amber-300 font-mono w-7">{String(e.num).padStart(2, '0')}</span>
                          <span className="text-amber-400 w-12">{intensityArrows(e.weight)}</span>
                          <span className="text-gray-500">{e.reasons.join('、')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 打造進度條（動態） */}
                {baseNumberPool && (
                  <div className="mt-3">
                    <div className="text-xs font-bold text-gray-300 mb-2">打造進度</div>
                    <div className="space-y-1.5">
                      {buildProgress.map((p) => (
                        <div key={p.label} className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 w-10">{p.label}</span>
                          <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${p.pct}%` }} />
                          </div>
                          <span className="text-gray-500 w-8 text-right">{p.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* V16-2.5: 變化預告卡（僅介紹，不導頁、不實作） */}
                {baseNumberPool && (
                  <div className="mt-3 rounded-lg border border-gray-800 bg-gray-950/40 p-3">
                    <div className="text-xs font-bold text-gray-300 mb-1.5">下一步可以做什麼？</div>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>· 加入夢境分析</li>
                      <li>· 加入生日分析</li>
                      <li>· 加入命理分析</li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 text-center text-sm text-gray-500 py-6">
                {lotteryType ? '準備分析…' : '請先回到上一步選擇彩種'}
              </div>
            )
          ) : step === 2 ? (
            /* Step 3: 夢境分析（呼叫既有 dream 引擎，疊加到 currentNumberPool） */
            !currentNumberPool ? (
              <div className="mt-4 text-center text-sm text-amber-300 py-6">請先完成基礎統計分析。</div>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <input
                  type="text"
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value)}
                  disabled={dreamApplied}
                  aria-label="夢境描述"
                  placeholder="例如：夢見大海、蛇、飛機、下雨"
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-gray-200 text-sm focus:border-amber-500 outline-none"
                />
                <div className="flex gap-2">
                  <Button onClick={handleApplyDream} disabled={!dreamText.trim() || dreamApplied} className="bg-amber-600 hover:bg-amber-500 text-white">{dreamApplied ? '已加入夢境' : '加入夢境分析'}</Button>
                  <Button variant="ghost" onClick={skip} className="text-gray-400">略過</Button>
                </div>
                {dreamApplied && (
                  <div className="space-y-2 pt-1">
                    <div className="text-xs text-amber-300">{dreamSummary}</div>
                    {dreamInfluences.length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-gray-300 mb-1">夢境影響了這些號碼</div>
                        <div className="space-y-1">
                          {[...new Map(dreamInfluences.map((i) => [i.num, i])).values()].slice(0, 8).map((i) => (
                            <div key={i.num} className="flex items-center gap-2 text-xs">
                              <span className="text-amber-300 font-mono w-7">{String(i.num).padStart(2, '0')}</span>
                              <span className="text-gray-500">{i.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {renderPoolTop6(currentNumberPool)}
                    {renderProgress(buildProgress)}
                  </div>
                )}
              </div>
            )
          ) : step === 3 ? (
            /* Step 4: 生日分析（呼叫既有 personalNumber 引擎，疊加到 currentNumberPool） */
            !currentNumberPool ? (
              <div className="mt-4 text-center text-sm text-amber-300 py-6">請先完成基礎統計分析。</div>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  max={today}
                  disabled={birthdayApplied}
                  aria-label="生日或紀念日"
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-gray-200 text-sm focus:border-amber-500 outline-none"
                />
                <div className="flex gap-2">
                  <Button onClick={handleApplyBirthday} disabled={!birthday || birthday > today || birthdayApplied} className="bg-amber-600 hover:bg-amber-500 text-white">{birthdayApplied ? '已加入生日' : '加入生日分析'}</Button>
                  <Button variant="ghost" onClick={skip} className="text-gray-400">略過</Button>
                </div>
                {birthdayApplied && (
                  <div className="space-y-2 pt-1">
                    <div className="text-xs text-amber-300">{birthdaySummary}</div>
                    {birthdayInfluences.length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-gray-300 mb-1">生日影響了這些號碼</div>
                        <div className="space-y-1">
                          {[...new Map(birthdayInfluences.map((i) => [i.num, i])).values()].slice(0, 8).map((i) => (
                            <div key={i.num} className="flex items-center gap-2 text-xs">
                              <span className="text-amber-300 font-mono w-7">{String(i.num).padStart(2, '0')}</span>
                              <span className="text-gray-500">{i.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {renderPoolTop6(currentNumberPool)}
                    {renderProgress(buildProgress)}
                  </div>
                )}
              </div>
            )
          ) : step === 4 ? (
            /* Step 5: 命理分析（VIP/後端權限灰度；呼叫既有 metaphysicsSchools 引擎） */
            !currentNumberPool ? (
              <div className="mt-4 text-center text-sm text-amber-300 py-6">請先完成基礎統計分析。</div>
            ) : permSource === 'backend' && metaPerm.state === 'loading' ? (
              <div className="mt-4 text-center text-sm text-gray-500 py-8">驗證中…</div>
            ) : !metaUnlocked ? (
              /* 非 VIP / 未登入 / payment_pending / backend error：顯示鎖定，但仍可略過 */
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-4 text-center">
                  <p className="text-sm text-amber-300 mb-1">
                    {metaPerm.reason === 'not_authenticated' ? '請先登入後使用命理分析'
                      : metaPerm.reason === 'payment_pending' ? '付款確認中，開通後即可使用'
                      : metaPerm.reason === 'backend_error' ? '目前無法確認會員狀態，請稍後再試'
                      : '命理分析是 VIP 專屬功能'}
                  </p>
                  <p className="text-xs text-gray-500">可先略過，之後升級再回來加入命理。</p>
                </div>
                <Button variant="ghost" onClick={skip} className="text-gray-400">略過</Button>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  {BUILDER_META_SCHOOLS.map((m) => (
                    <button key={m.id} onClick={() => setMetaMethod(m.id)}
                      className={[
                        'py-2 rounded-lg text-xs font-bold border transition',
                        metaMethod === m.id ? 'bg-amber-500 text-gray-950 border-amber-400'
                          : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-amber-600/50',
                      ].join(' ')}>
                      {m.name}
                    </button>
                  ))}
                </div>
                <input type="date" value={metaBirthday} onChange={(e) => setMetaBirthday(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-gray-200 text-sm focus:border-amber-500 outline-none" />
                <input type="text" value={metaQuestion} onChange={(e) => setMetaQuestion(e.target.value)}
                  placeholder="想問的事情 / 意念（可留空）"
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-gray-200 text-sm focus:border-amber-500 outline-none" />
                <div className="flex gap-2">
                  <Button onClick={handleApplyMetaphysics} disabled={!metaMethod || !metaBirthday || metaApplied}
                    className="bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40">加入命理分析</Button>
                  <Button variant="ghost" onClick={skip} className="text-gray-400">略過</Button>
                </div>
                {metaApplied && (
                  <div className="space-y-2 pt-1">
                    <div className="text-xs text-amber-300">{metaSummary}</div>
                    {metaInfluences.length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-gray-300 mb-1">命理影響了這些號碼</div>
                        <div className="space-y-1">
                          {[...new Map(metaInfluences.map((i) => [i.num, i])).values()].slice(0, 8).map((i) => (
                            <div key={i.num} className="flex items-center gap-2 text-xs">
                              <span className="text-amber-300 font-mono w-7">{String(i.num).padStart(2, '0')}</span>
                              <span className="text-gray-500">{i.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {renderPoolTop6(currentNumberPool)}
                    {renderProgress(buildProgress)}
                  </div>
                )}
              </div>
            )
          ) : (
            /* Step 6: AI 融合與結果（依 currentNumberPool 權重排序，不接真實 AI） */
            !finalResult ? (
              <div className="mt-4 text-center text-sm text-amber-300 py-6">請先完成基礎統計分析。</div>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                {/* 最終推薦號碼（第一層：主號最大、特別號獨立） */}
                <div>
                  <div className="text-sm font-bold text-amber-300 mb-2">你的專屬號碼</div>
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {finalResult.mainNumbers.map((n) => (
                      <span key={n} className="w-12 h-12 rounded-full bg-amber-500 text-gray-950 flex items-center justify-center text-lg font-extrabold shadow-lg shadow-amber-500/20">
                        {String(n).padStart(2, '0')}
                      </span>
                    ))}
                    {finalResult.specialNumber != null && (
                      <div className="flex flex-col items-center">
                        <span className="text-sky-400 text-[10px] mb-0.5">特別號</span>
                        <span className="w-12 h-12 rounded-full bg-sky-500 text-gray-950 flex items-center justify-center text-lg font-extrabold shadow-lg shadow-sky-500/20">
                          {String(finalResult.specialNumber).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 備用號碼 */}
                {finalResult.backupNumbers.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-gray-300 mb-2">備用號碼</div>
                    <div className="flex flex-wrap gap-2">
                      {finalResult.backupNumbers.map((n) => (
                        <span key={n} className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 text-gray-300 flex items-center justify-center text-xs font-bold">
                          {String(n).padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 信心指數（展示用） */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-300">信心指數</span>
                    <span className="text-amber-300 font-bold">{finalResult.confidenceScore}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${finalResult.confidenceScore}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">信心指數是系統依照資料來源完整度計算，僅供參考，不代表中獎機率。</p>
                </div>

                {/* 權重來源圖 */}
                <div>
                  <div className="text-xs font-bold text-gray-300 mb-2">權重來源圖</div>
                  <div className="space-y-1.5">
                    {finalResult.sourceWeights.map((sw) => (
                      <div key={sw.label} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 w-14">{sw.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${sw.pct}%` }} />
                        </div>
                        <span className="text-gray-500 w-8 text-right">{sw.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 每顆號碼形成原因 */}
                <div>
                  <div className="text-xs font-bold text-gray-300 mb-2">號碼形成原因</div>
                  <div className="space-y-1">
                    {finalResult.explanation.map((ex) => (
                      <div key={ex.num} className="flex items-start gap-2 text-xs">
                        <span className="text-amber-300 font-mono w-7">{String(ex.num).padStart(2, '0')}</span>
                        <span className="text-gray-500">{ex.reasons.length ? ex.reasons.join('、') : '基礎統計'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* V21: Explain 故事 — 為什麼是這組號碼（娛樂分析，非投注建議） */}
                <div className="rounded-lg border border-purple-900/40 bg-purple-950/15 p-3">
                  <div className="text-xs font-bold text-purple-300 mb-1.5">為什麼是這組號碼</div>
                  {(() => {
                    const used = finalResult.sourceWeights.filter(w => w.pct > 0).map(w => w.label);
                    return (
                      <>
                        <p className="text-xs text-gray-300 leading-relaxed mb-1">
                          今天主要使用了：{used.length ? used.join('、') : '統計分析'}，所以為你產出上面這組號碼。
                        </p>
                        <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                          {buildExplanation({ seed: buildPersonalSeed({ favoriteLottery: lotteryType || 'power' }), selectedModules: used })}
                        </p>
                      </>
                    );
                  })()}
                </div>

                {/* 摘要 */}
                <div className="rounded-lg bg-gray-950/40 border border-gray-800 p-3 text-xs text-gray-400">{finalResult.summary}</div>

                {/* AI 深度融合（VIP 區塊，僅顯示，不接真實 AI） */}
                <div className="rounded-lg border border-amber-700/40 bg-amber-950/15 p-3">
                  <div className="text-xs font-bold text-amber-300 mb-1">AI 深度融合</div>
                  {permSource === 'backend' && metaPerm.state === 'loading' ? (
                    <p className="text-xs text-gray-500">驗證中…</p>
                  ) : metaUnlocked ? (
                    <p className="text-xs text-gray-400">已保留 AI 融合區塊（完整模型即將套用）。</p>
                  ) : (
                    <p className="text-xs text-gray-400">
                      {metaPerm.reason === 'backend_error' ? '目前無法確認會員狀態，請稍後再試'
                        : 'AI 深度融合為 VIP 功能，升級後可套用完整模型。'}
                    </p>
                  )}
                </div>

                {/* QA-FIX-1: 收藏到「我的號碼」(v12-keep-sets)；訪客本機暫存 */}
                <div className="pt-1">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={saveToMyNumbers} className="bg-amber-600 hover:bg-amber-500 text-white" title="收藏到我的號碼">
                      收藏到我的號碼
                    </Button>
                    <Button variant="outline" onClick={restart} className="border-amber-700/50 text-amber-400">
                      <RotateCcw className="w-4 h-4 mr-1" />重新打造
                    </Button>
                  </div>
                  {saveStatus === 'failed' && <p className="mt-2 text-xs text-rose-300" role="alert">本機收藏未成功，請重試。</p>}
                  {saveStatus === 'saved' && (
                    <p className="mt-2 text-xs text-emerald-400">已收藏到「我的號碼」。提示：這組號碼儲存在目前的瀏覽器。</p>
                  )}
                  {saveStatus === 'duplicate' && (
                    <p className="mt-2 text-xs text-gray-400">這組號碼已在「我的號碼」中，未重複收藏。</p>
                  )}
                  {(saveStatus === 'saved' || saveStatus === 'duplicate') && (
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <Button asChild variant="outline" className="border-gray-700 text-gray-200">
                        <Link to={'/my-numbers?game=' + lotteryType}>查看我的號碼</Link>
                      </Button>
                      <Button asChild variant="outline" className="border-gray-700 text-gray-200">
                        <Link to={analysisLink(lotteryType!, finalResult.mainNumbers)}>分析這組</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="v33-builder-controls flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={goPrev} disabled={step === 0}
          className="border-gray-700 text-gray-300">
          <ChevronLeft className="w-4 h-4 mr-1" />上一步
        </Button>
        {canSkip && (
          <Button variant="ghost" onClick={skip} className="text-gray-400">
            <SkipForward className="w-4 h-4 mr-1" />略過
          </Button>
        )}
        <div className="flex-1" />
        {!isResultStep ? (
          <Button onClick={goNext} disabled={step === 0 && !lotteryType}
            className="bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40">
            下一步<ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button variant="outline" onClick={restart} className="border-amber-700/50 text-amber-400">
            <RotateCcw className="w-4 h-4 mr-1" />重新開始
          </Button>
        )}
      </div>
      <aside className="v33-pool-panel v33-panel" aria-labelledby="v33-pool-title">
        <h2 id="v33-pool-title"><Filter size={17} aria-hidden="true" />漏斗收斂狀態</h2>
        <div role="status" aria-atomic="true">
          <dl className="v33-pool-counts">
            <div><dt>主號總數</dt><dd>{currentConfig ? mainRange : '—'}</dd></div>
            <div><dt>目前候選</dt><dd>{currentConfig ? eligibleCandidates : '—'}</dd></div>
            <div><dt>未納入</dt><dd>{currentConfig ? omittedCandidates : '—'}</dd></div>
          </dl>
          <div className="v33-pool-track" aria-hidden="true">
            <span style={{ width: `${retainedPct}%` }} />
          </div>
          <p className="v33-pool-stage">
            {currentNumberPool ? `保留 ${retainedPct}% 的主號候選` : currentConfig ? '等待建立統計候選池' : '選擇彩種後顯示主號範圍'}
          </p>
        </div>
        <p className="v33-pool-note">依目前候選名單計算，篩選權重不代表開獎機率。</p>
      </aside>
    </div>
  );
}
