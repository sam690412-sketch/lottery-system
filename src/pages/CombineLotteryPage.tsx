// ============================================================
// V16 樂合彩專屬模式 - CombineLotteryPage.tsx
// 49樂合彩 / 39樂合彩 共用
// 任二 / 任三 / 任四
// ============================================================

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getConfig, COMBINE_SOURCE_MAP, PLAY_TYPE_CONFIG, type LotteryType, type CombinePlayType } from '@/utils/lotteryConfig';
import { generateLottoCombine, type CombineResult, type ScoredCombination } from '@/utils/combineGenerator';
import { calculate13LayerScores } from '@/utils/scoring';
import { calcStats, loadOrDefaultHistory } from '@/utils/history';
import { getObservationWeights } from '@/utils/observationPool';
import { getMustInclude, getMustExclude, getWeightScores } from '@/utils/observationPoolV3';
import { loadDailyDreamWeights } from '@/utils/dreamSchools';
import { loadDailyMetaWeights } from '@/utils/metaphysicsSchools';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, BarChart3, Copy, Loader2, Zap } from 'lucide-react';

const COMBO_COUNTS = [3, 5, 10];

interface Props {
  forcedType?: LotteryType;
}

export default function CombineLotteryPage({ forcedType }: Props = {}) {
  const { lotteryType } = useParams<{ lotteryType: string }>();
  const navigate = useNavigate();
  const type = (forcedType || lotteryType || 'lotto49c') as LotteryType;
  const config = getConfig(type);
  const sourceType = COMBINE_SOURCE_MAP[type] || 'lotto649';
  const sourceConfig = getConfig(sourceType);

  const [selectedPlay, setSelectedPlay] = useState<CombinePlayType | null>(null);
  const [enableObservation, setEnableObservation] = useState(true);
  const [enableDream, setEnableDream] = useState(false);
  const [enableMeta, setEnableMeta] = useState(false);
  const [comboCount, setComboCount] = useState(5);
  const [result, setResult] = useState<CombineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const isValid = selectedPlay !== null;

  async function handleGenerate() {
    if (!selectedPlay) return;
    setLoading(true);
    try {
      // 獲取源彩種數據
      const draws = loadOrDefaultHistory();
      const stats = calcStats(draws);
      const hexWeights = {} as Record<number, number>;

      // V16.3: 讀取 Observation Pool V3
      const mustInclude = getMustInclude(type);
      const mustExclude = getMustExclude(type);
      const v3WeightScores = getWeightScores(type);

      // V16.3: 合併 V2 觀察池權重 + V3 high/medium/low 權重
      const baseObsWeights = enableObservation ? (getObservationWeights() || {}) : {};
      const mergedObsWeights: Record<number, number> = { ...baseObsWeights };
      // V3 high/medium/low 權重合併進觀察池權重
      for (const [num, weight] of Object.entries(v3WeightScores)) {
        const n = Number(num);
        mergedObsWeights[n] = (mergedObsWeights[n] || 0) + weight;
      }

      const dreamWeights = enableDream ? (loadDailyDreamWeights() ?? undefined) : undefined;
      const metaWeights = enableMeta ? (loadDailyMetaWeights() ?? undefined) : undefined;

      const scores = calculate13LayerScores(
        stats, [], hexWeights, false,
        Object.keys(mergedObsWeights).length > 0 ? mergedObsWeights : undefined,
        dreamWeights || undefined,
        metaWeights || undefined
      );

      // 過濾到源彩種範圍
      const filteredScores = scores.filter(s => s.number >= config.mainMin && s.number <= config.mainMax);

      const combineResult = generateLottoCombine(
        type as 'lotto49c' | 'daily39c',
        selectedPlay,
        filteredScores,
        comboCount,
        mustInclude,
        mustExclude
      );

      // V16.3: 顯示警告
      if (combineResult.warnings) {
        // 警告會在 UI 中自然顯示（暫存 console，可後續擴展為 toast）
        console.warn('[V3]', combineResult.warnings);
      }

      setResult(combineResult);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function copyNumbers(combo: ScoredCombination, idx: number) {
    const text = combo.numbers.join(' ');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 p-4 pb-24">
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">{config.name} - 專屬產號</h1>
            <p className="text-xs text-gray-500">資料來源：{sourceConfig.name}歷史數據</p>
          </div>
        </div>

        {/* Step 1: 玩法選擇 */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">第一步：選擇玩法</h2>
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(PLAY_TYPE_CONFIG) as [CombinePlayType, { label: string; k: number; oddsDesc: string }][]).map(([key, p]) => (
              <Card
                key={key}
                onClick={() => { setSelectedPlay(key); setResult(null); }}
                className={`p-4 cursor-pointer transition-all border-2 ${
                  selectedPlay === key
                    ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                }`}
              >
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-1 ${selectedPlay === key ? 'text-cyan-400' : 'text-gray-300'}`}>{p.label}</div>
                  <div className="text-xs text-gray-500 mb-2">選{p.k}個號碼</div>
                  <div className="text-xs text-gray-600">C(15,{p.k}) 組合</div>
                  <div className="text-xs text-amber-500/70 mt-1">{p.oddsDesc}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Step 2: 輔助選項 */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">第二步：輔助選項</h2>
          <div className="space-y-2 bg-gray-800/30 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={enableObservation} onCheckedChange={v => setEnableObservation(v as boolean)} />
              <span className="text-sm text-gray-300">使用觀察池加權</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={enableDream} onCheckedChange={v => setEnableDream(v as boolean)} />
              <span className="text-sm text-gray-300">使用夢境解析</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={enableMeta} onCheckedChange={v => setEnableMeta(v as boolean)} />
              <span className="text-sm text-gray-300">命理輔助</span>
            </label>
          </div>
        </div>

        {/* Step 3: 產號數量 */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">第三步：產號數量</h2>
          <div className="flex items-center gap-4 bg-gray-800/30 rounded-lg p-4">
            <div className="flex gap-2">
              {COMBO_COUNTS.map(c => (
                <Button
                  key={c}
                  size="sm"
                  variant={comboCount === c ? 'default' : 'outline'}
                  onClick={() => setComboCount(c)}
                  className={comboCount === c ? 'bg-cyan-600' : 'border-gray-600 text-gray-400'}
                >
                  {c} 組
                </Button>
              ))}
            </div>
            <div className="text-sm text-gray-500 ml-auto">
              每注 NT${config.ticketPrice} × {comboCount} 組 = <span className="text-amber-400">NT${config.ticketPrice * comboCount}</span>
            </div>
          </div>
        </div>

        {/* 產號按鈕 */}
        <Button
          onClick={handleGenerate}
          disabled={!isValid || loading}
          className="w-full h-14 text-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 mb-4"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-5 h-5 mr-2" />}
          {loading ? '產號中...' : '🚀 開始產號'}
        </Button>

        {/* 分析中心入口 */}
        <Button
          onClick={() => navigate(`/combine-analysis/${type === 'lotto49c' ? '49' : '39'}`)}
          variant="outline"
          className="w-full mb-8 border-amber-700/50 text-amber-400 hover:bg-amber-950/30 hover:text-amber-300"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          查看樂合彩分析（熱門/冷門/連號/同尾）
        </Button>

        {/* 結果 */}
        {result && (
          <div className="space-y-4">
            {/* V16.3: V3 警告顯示 */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-700/50 space-y-1">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-red-400">⚠️ {w}</p>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">產號結果</h2>
              <span className="text-xs text-gray-500">候選池 {result.candidateCount} 碼 / 共 {result.totalCombinations} 種組合</span>
            </div>

            {result.combos.map((combo, idx) => (
              <Card key={idx} className="p-4 bg-gray-800/50 border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">組合 {idx + 1}</span>
                  <span className="text-sm font-bold text-cyan-400">評分 {combo.avgScore}</span>
                </div>

                {/* 號碼球 */}
                <div className="flex gap-2 mb-3">
                  {combo.numbers.map((n, i) => (
                    <div
                      key={i}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                        combo.details[i]?.grade === 'A'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : combo.details[i]?.grade === 'B'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-gray-700/50 border-gray-600 text-gray-300'
                      }`}
                    >
                      {String(n).padStart(2, '0')}
                    </div>
                  ))}
                </div>

                {/* 來源比例 */}
                <div className="flex gap-2 mb-3 flex-wrap">
                  {Object.entries(combo.sourceRatios).filter(([_, v]) => v > 0).map(([key, val]) => (
                    <span key={key} className="text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400">
                      {key} {val}%
                    </span>
                  ))}
                </div>

                {/* 號碼詳情 */}
                <div className="text-xs text-gray-500 mb-3 space-y-1">
                  {combo.details.map((d, i) => (
                    <span key={i} className="inline-block mr-3">
                      {String(d.number).padStart(2, '0')}: 評分{d.score} ({d.grade}級)
                    </span>
                  ))}
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-gray-600 text-gray-400 text-xs" onClick={() => copyNumbers(combo, idx)}>
                    <Copy className="w-3 h-3 mr-1" />
                    {copied === idx ? '已複製' : '複製號碼'}
                  </Button>
                  <Button size="sm" variant="outline" className="border-gray-600 text-gray-400 text-xs">
                    加入觀察池
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
