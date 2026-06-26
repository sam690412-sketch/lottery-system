// ============================================================
// V14.1 簡化產號結果 - 四層來源比例 + 主導來源 + 推薦理由摘要
// ============================================================
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Copy, Check, BarChart3 } from 'lucide-react';
import { getObservationPool } from '@/utils/observationPool';

interface Combo {
  id: string;
  name: string;
  zone1: number[];
  zone2: number;
  score: number;
  reason: string;
  riskWarning: string;
  style: string;
}

interface Props {
  combos: Combo[];
  methods: string[];
  lotteryType: string;
  dailyInfo?: { used: number; remaining: number } | null;
  useObservationPool?: boolean;
  sourceRatios?: Record<string, number>;
}

export default function SimpleResult({ combos, methods, dailyInfo, useObservationPool, sourceRatios }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  // V14.1: 使用真實 sourceScores 或回退到配置比例
  const getRealRatio = (): Record<string, number> => {
    if (sourceRatios && Object.keys(sourceRatios).length > 0) return sourceRatios;

    // 回退：根據啟用的方法計算比例
    const hasStat = methods.includes('stat') || methods.includes('all');
    const hasDream = methods.includes('dream') || methods.includes('all');
    const hasMeta = methods.includes('meta') || methods.includes('all');
    const hasObs = useObservationPool && getObservationPool().length > 0;

    let stat = hasStat ? 55 : 0;
    let dream = hasDream ? 15 : 0;
    let meta = hasMeta ? 15 : 0;
    let obs = hasObs ? 15 : 0;

    if (hasStat && !hasDream && !hasMeta && !hasObs) stat = 100;

    const total = stat + dream + meta + obs;
    if (total > 0 && total !== 100) {
      const factor = 100 / total;
      stat = Math.round(stat * factor);
      dream = Math.round(dream * factor);
      meta = Math.round(meta * factor);
      obs = Math.round(obs * factor);
      const diff = 100 - (stat + dream + meta + obs);
      if (diff !== 0) stat += diff;
    }
    return { 統計: stat, 觀察池: obs, 夢境: dream, 命理: meta };
  };

  const ratio = getRealRatio();

  // 主導來源
  const dominantSource = Object.entries(ratio)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '統計';

  // 推薦理由摘要
  const getSummaryItems = (): string[] => {
    const items: string[] = [];
    items.push('熱門號碼');
    if (ratio.觀察池 > 0) items.push('觀察池高權重');
    if (ratio.夢境 > 0) items.push('夢境象徵分析');
    if (ratio.命理 > 0) items.push('命理五行推薦');
    return items;
  };

  const summaryItems = getSummaryItems();

  // 來源顏色映射
  const sourceColors: Record<string, string> = {
    '統計': 'text-blue-400',
    '觀察池': 'text-cyan-400',
    '夢境': 'text-indigo-400',
    '命理': 'text-amber-400',
  };
  const sourceBarColors: Record<string, string> = {
    '統計': 'bg-blue-600',
    '觀察池': 'bg-cyan-600',
    '夢境': 'bg-indigo-600',
    '命理': 'bg-amber-600',
  };

  const copyCombo = (idx: number, combo: Combo) => {
    const text = combo.zone1.map(n => String(n).padStart(2, '0')).join(', ') +
      (combo.zone2 ? ` + ${String(combo.zone2).padStart(2, '0')}` : '');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  };

  const getSimpleReason = (combo: Combo) => {
    if (combo.score >= 90) return '多項指標均衡，整體評分優良';
    if (combo.score >= 80) return '統計指標與結構配置良好';
    if (combo.score >= 70) return '基本符合歷史分布規律';
    return '可供參考的組合，建議搭配個人判斷';
  };

  return (
    <div className="space-y-4">
      <Card className="border border-emerald-800/40 bg-emerald-950/10">
        <CardContent className="p-4">
          <h3 className="text-lg font-bold text-emerald-400 mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> 推薦組合
          </h3>

          {/* 推薦理由摘要 */}
          <div className="mb-4 p-3 rounded-lg bg-gray-900/40 border border-gray-700">
            <p className="text-sm font-bold text-gray-300 mb-2">本次推薦偏向：</p>
            <div className="space-y-1">
              {summaryItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-gray-300">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">共影響 {summaryItems.length} 項分析來源</p>
          </div>

          {/* 組合列表 */}
          <div className="space-y-3">
            {combos.map((combo, idx) => (
              <div key={combo.id} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white">{combo.name}</Badge>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                      {combo.score} 分
                    </Badge>
                  </div>
                  <button
                    onClick={() => copyCombo(idx, combo)}
                    className="text-gray-500 hover:text-gray-300 transition"
                  >
                    {copied === idx ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* 號碼球 */}
                <div className="flex flex-wrap gap-2 my-3">
                  {combo.zone1.map(n => (
                    <div
                      key={n}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-lg"
                    >
                      {String(n).padStart(2, '0')}
                    </div>
                  ))}
                  {combo.zone2 > 0 && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                      {String(combo.zone2).padStart(2, '0')}
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-400">{getSimpleReason(combo)}</p>
                {combo.reason && <p className="text-xs text-gray-500 mt-1">{combo.reason}</p>}
                {combo.riskWarning && <p className="text-xs text-amber-500/70 mt-1">{combo.riskWarning}</p>}
              </div>
            ))}
          </div>

          {/* V14.1: 四層來源比例 + 主導來源 */}
          <div className="mt-4 p-3 rounded-lg bg-gray-900/40 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-300">來源分析</p>
              <Badge className="bg-emerald-700 text-white text-xs">
                主導：{dominantSource}
              </Badge>
            </div>

            {/* 進度條 */}
            <div className="flex h-3 rounded-full overflow-hidden mb-2">
              {ratio.統計 > 0 && <div className={`${sourceBarColors['統計']}`} style={{ width: `${ratio.統計}%` }} />}
              {ratio.觀察池 > 0 && <div className={`${sourceBarColors['觀察池']}`} style={{ width: `${ratio.觀察池}%` }} />}
              {ratio.夢境 > 0 && <div className={`${sourceBarColors['夢境']}`} style={{ width: `${ratio.夢境}%` }} />}
              {ratio.命理 > 0 && <div className={`${sourceBarColors['命理']}`} style={{ width: `${ratio.命理}%` }} />}
            </div>

            {/* 比例文字 */}
            <div className="space-y-1">
              {ratio.統計 > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">統計</span>
                  <span className={sourceColors['統計']}>{ratio.統計}%</span>
                </div>
              )}
              {ratio.觀察池 > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">觀察池</span>
                  <span className={sourceColors['觀察池']}>{ratio.觀察池}%</span>
                </div>
              )}
              {ratio.夢境 > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">夢境</span>
                  <span className={sourceColors['夢境']}>{ratio.夢境}%</span>
                </div>
              )}
              {ratio.命理 > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">命理</span>
                  <span className={sourceColors['命理']}>{ratio.命理}%</span>
                </div>
              )}
            </div>

            {ratio.觀察池 === 0 && ratio.夢境 === 0 && ratio.命理 === 0 && (
              <p className="text-xs text-gray-500 mt-1">純統計模式。勾選夢境/命理/觀察池可啟用多元分析。</p>
            )}
          </div>

          {/* 每日次數 */}
          {dailyInfo && (
            <p className="text-xs text-gray-500 text-center mt-3">
              今日已用 {dailyInfo.used} 次，還剩 {dailyInfo.remaining} 次
            </p>
          )}

          {/* 展開詳細分析 */}
          <Button
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-2 text-gray-500 hover:text-gray-300"
          >
            {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {expanded ? '收起詳細分析' : '查看詳細分析'}
          </Button>

          {expanded && (
            <div className="mt-3 space-y-2 p-3 rounded-lg bg-gray-900/40 border border-gray-800 text-sm text-gray-400">
              <p className="font-bold text-gray-300">詳細說明</p>
              <p>• 以上組合通過16層漏斗評分，包含熱度、冷度、區間、奇偶、大小、和值、尾數、連號、質數、鏡像、遺漏、養號、卦象、觀察池、夢境、命理等維度</p>
              {ratio.觀察池 > 0 && <p>• 觀察池號碼已納入評分加權</p>}
              {ratio.夢境 > 0 && <p>• 夢境學派分析已納入評分加權（6大學派綜合）</p>}
              {ratio.命理 > 0 && <p>• 命理學派分析已納入評分加權（7大學派綜合）</p>}
              <p>• 分數為綜合評估，不代表中獎保證</p>
              <p>• 建議參考多組分散風險</p>
              <p>• 本系統僅為統計分析與娛樂輔助工具</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
