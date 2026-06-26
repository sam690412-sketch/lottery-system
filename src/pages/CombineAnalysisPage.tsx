// ============================================================
// V16 P0-5: 樂合彩分析中心 - CombineAnalysisPage.tsx
// 熱門任二/三/四 ｜ 冷門任二/三/四 ｜ 連號組合 ｜ 同尾組合
// ============================================================

import { useState, useMemo, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getConfig, COMBINE_SOURCE_MAP, type LotteryType } from '@/utils/lotteryConfig';
import type { NumberScore } from '@/types';
import { loadOrDefaultHistory } from '@/utils/history';
import { calcStats } from '@/utils/history';
import { calculate13LayerScores } from '@/utils/scoring';
import { ArrowLeft, TrendingUp, TrendingDown, Hash, Zap } from 'lucide-react';

type AnalysisType = 'hot' | 'cold' | 'consecutive' | 'sameTail';

interface ComboAnalysis {
  numbers: number[];
  label: string;
  score: number;
  count: number;
  category: string;
}

const ANALYSIS_TABS: { key: AnalysisType; label: string; icon: ReactNode }[] = [
  { key: 'hot', label: '熱門組合', icon: <TrendingUp className="w-4 h-4" /> },
  { key: 'cold', label: '冷門組合', icon: <TrendingDown className="w-4 h-4" /> },
  { key: 'consecutive', label: '連號組合', icon: <Zap className="w-4 h-4" /> },
  { key: 'sameTail', label: '同尾組合', icon: <Hash className="w-4 h-4" /> },
];

function combinations(arr: number[], k: number): number[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  if (k === 1) return arr.map(e => [e]);
  const result: number[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const sub = combinations(arr.slice(i + 1), k - 1);
    sub.forEach(s => result.push([arr[i], ...s]));
  }
  return result;
}

export default function CombineAnalysisPage() {
  const navigate = useNavigate();
  const { type: urlType } = useParams<{ type: string }>();
  
  // Support both /combine-analysis/49 and /combine-analysis/lotto49c
  const ALIAS: Record<string, LotteryType> = { '49': 'lotto49c', '39': 'daily39c' };
  const type = (ALIAS[urlType || ''] || urlType || 'lotto49c') as LotteryType;
  
  const config = getConfig(type);
  const sourceType = COMBINE_SOURCE_MAP[type] || 'lotto649';
  const sourceConfig = getConfig(sourceType);
  const [activeTab, setActiveTab] = useState<AnalysisType>('hot');
  const [playSize, setPlaySize] = useState<2 | 3 | 4>(2);

  const analysis = useMemo(() => {
    const draws = loadOrDefaultHistory();
    const stats = calcStats(draws);
    const scores = calculate13LayerScores(stats, [], {} as Record<number, number>, false);
    const filtered = scores.filter(s => s.number >= config.mainMin && s.number <= config.mainMax);

    // 取得所有可用號碼的評分 lookup
    const scoreMap: Record<number, NumberScore> = {};
    for (const s of filtered) scoreMap[s.number] = s;

    // 根據分析類型選擇不同的組合生成策略
    if (activeTab === 'consecutive' || activeTab === 'sameTail') {
      // V16.3: 連號/同尾在「完整號碼範圍」內搜尋
      const fullRange = Array.from({ length: config.mainMax - config.mainMin + 1 }, (_, i) => config.mainMin + i);

      let targetCombos: number[][];

      if (activeTab === 'consecutive') {
        // 連號：生成所有連續號碼組合
        targetCombos = [];
        for (let start = config.mainMin; start <= config.mainMax - playSize + 1; start++) {
          const combo = Array.from({ length: playSize }, (_, i) => start + i);
          if (combo.every(n => n >= config.mainMin && n <= config.mainMax)) {
            targetCombos.push(combo);
          }
        }
      } else {
        // 同尾：按尾數分組，生成所有同尾組合
        const tailGroups: Record<number, number[]> = {};
        for (const n of fullRange) {
          const tail = n % 10;
          if (!tailGroups[tail]) tailGroups[tail] = [];
          tailGroups[tail].push(n);
        }
        targetCombos = [];
        for (const group of Object.values(tailGroups)) {
          if (group.length >= playSize) {
            const tailCombos = combinations(group, playSize);
            targetCombos.push(...tailCombos);
          }
        }
      }

      const results: ComboAnalysis[] = targetCombos.map(combo => {
        const sorted = combo.sort((a, b) => a - b);
        const avgScore = Math.round(sorted.reduce((sum, n) => {
          const sc = scoreMap[n];
          return sum + (sc ? sc.total : 0);
        }, 0) / playSize);

        return {
          numbers: sorted,
          label: sorted.map(n => String(n).padStart(2, '0')).join('-'),
          score: avgScore,
          count: sorted.reduce((sum, n) => sum + (scoreMap[n]?.sourceScores?.['統計'] || 0), 0),
          category: activeTab === 'consecutive' ? '連號' : '同尾',
        };
      });

      return results.sort((a, b) => b.score - a.score).slice(0, 20);
    }

    // 熱門/冷門：在高分候選池中搜尋
    const cands = filtered.filter(s => s.grade === 'A' || s.grade === 'B')
      .sort((a, b) => b.total - a.total).slice(0, 20).map(s => s.number);

    const allCombos = combinations(cands, playSize);

    const results: ComboAnalysis[] = allCombos.map(combo => {
      const sorted = combo.sort((a, b) => a - b);
      const avgScore = Math.round(sorted.reduce((sum, n) => {
        const sc = scoreMap[n];
        return sum + (sc ? sc.total : 0);
      }, 0) / playSize);

      const isConsecutive = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
      const tails = sorted.map(n => n % 10);
      const isSameTail = tails.every(t => t === tails[0]);

      return {
        numbers: sorted,
        label: sorted.map(n => String(n).padStart(2, '0')).join('-'),
        score: avgScore,
        count: sorted.reduce((sum, n) => sum + (scoreMap[n]?.sourceScores?.['統計'] || 0), 0),
        category: isConsecutive ? '連號' : isSameTail ? '同尾' : '一般',
      };
    });

    switch (activeTab) {
      case 'hot': return results.sort((a, b) => b.score - a.score).slice(0, 20);
      case 'cold': return results.sort((a, b) => a.score - b.score).slice(0, 20);
      default: return results.slice(0, 20);
    }
  }, [type, activeTab, playSize, config.mainMin, config.mainMax]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 p-4 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">{config.name} - 分析中心</h1>
            <p className="text-xs text-gray-500">資料來源：{sourceConfig.name}歷史數據</p>
          </div>
        </div>

        {/* 玩法選擇 */}
        <div className="flex gap-2 mb-4">
          {[2, 3, 4].map(k => (
            <Button key={k} size="sm" variant={playSize === k ? 'default' : 'outline'}
              onClick={() => setPlaySize(k as 2 | 3 | 4)}
              className={playSize === k ? 'bg-cyan-600' : 'border-gray-600 text-gray-400'}>
              任{k === 2 ? '二' : k === 3 ? '三' : '四'}
            </Button>
          ))}
        </div>

        {/* 分析標籤 */}
        <div className="flex gap-2 mb-6">
          {ANALYSIS_TABS.map(tab => (
            <Button key={tab.key} size="sm" variant={activeTab === tab.key ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? 'bg-amber-600' : 'border-gray-600 text-gray-400'}>
              {tab.icon}<span className="ml-1">{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* 結果列表 */}
        <div className="space-y-2">
          {analysis.length === 0 ? (
            <Card className="p-6 text-center bg-gray-800/50 border-gray-700">
              <p className="text-gray-500">此條件下無符合的組合</p>
            </Card>
          ) : (
            analysis.map((item, idx) => (
              <Card key={idx} className="p-3 flex items-center gap-3 bg-gray-800/50 border-gray-700">
                <span className="text-xs text-gray-600 w-6">{idx + 1}</span>
                <div className="flex gap-1.5 flex-1">
                  {item.numbers.map(n => (
                    <span key={n} className="w-8 h-8 rounded-full bg-gray-700/50 border border-gray-600 flex items-center justify-center text-xs font-bold text-gray-300">
                      {String(n).padStart(2, '0')}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-cyan-400 font-mono">{item.score}分</span>
                {item.category !== '一般' && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">{item.category}</span>
                )}
              </Card>
            ))
          )}
        </div>

        <div className="mt-6">
          <Button onClick={() => navigate('/')} variant="outline" className="w-full border-gray-600 text-gray-400">🏠 返回首頁</Button>
        </div>
      </div>
    </div>
  );
}
