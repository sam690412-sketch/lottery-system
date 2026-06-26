// ============================================================
// 個人化回測
// ============================================================
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import type { NumberScore } from '@/types';
import type { StrategyV6 } from '@/types/personal';
import { BarChart3 } from 'lucide-react';

interface BacktestResult {
  strategy: StrategyV6;
  totalHits: number;
  avgHits: string;
  threePlus: number;
  matchRate: string;
}

interface Props {
  
  personalScores: NumberScore[];
  pureStatScores: NumberScore[];
}

export default function PersonalBacktest({ personalScores, pureStatScores }: Props) {
  const [drawStr, setDrawStr] = useState('');
  const [results, setResults] = useState<BacktestResult[]>([]);

  const runBacktest = () => {
    const draw = drawStr.split(/[,，\s]+/).map(Number).filter(n => n >= 1 && n <= 38);
    if (draw.length !== 6) { alert('請輸入6個開獎號碼'); return; }

    const scoreSets: { name: StrategyV6; scores: NumberScore[] }[] = [
      { name: '平衡', scores: personalScores },
      { name: '純統計', scores: pureStatScores },
    ];

    const newResults = scoreSets.map(({ name, scores: s }) => {
      const top16 = s.slice(0, 16).map(x => x.number);
      const hits = draw.filter(n => top16.includes(n)).length;
      return {
        strategy: name,
        totalHits: hits,
        avgHits: hits.toFixed(2),
        threePlus: hits >= 3 ? 1 : 0,
        matchRate: (hits / 6 * 100).toFixed(1),
      };
    });
    setResults(newResults);
  };

  return (
    <div className="space-y-4">
      {/* 輸入開獎號碼 */}
      <Card className="border border-gray-800 bg-gray-900/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-400 text-lg">
            <BarChart3 className="w-5 h-5" />
            個人化回測比較
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-gray-300 text-sm">輸入開獎第一區6碼 (逗號分隔)</Label>
            <div className="flex gap-2 mt-1">
              <Input value={drawStr} onChange={e => setDrawStr(e.target.value)} placeholder="例: 9,14,22,29,32,37" className="bg-gray-800 border-gray-700 text-amber-100 placeholder:text-gray-600" />
              <Button onClick={runBacktest} className="bg-amber-600 hover:bg-amber-500 text-gray-900 whitespace-nowrap">比較</Button>
            </div>
          </div>

          {results.length > 0 && (
            <div className="space-y-3 mt-2">
              {results.map((r, i) => (
                <div key={i} className="p-3 rounded-lg bg-gray-800/40 border border-gray-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={r.strategy === '平衡' ? 'text-purple-400 border-purple-500/40' : 'text-gray-400 border-gray-500/40'}>
                      {r.strategy === '平衡' ? '個人化+統計' : r.strategy}
                    </Badge>
                    <span className="text-lg font-bold text-amber-400">{r.totalHits}碼命中</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-20">命中率</span>
                      <Progress value={parseFloat(r.matchRate)} className="h-2 flex-1" />
                      <span className="text-xs text-gray-300 w-12 text-right">{r.matchRate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分數分布對比 */}
          <div className="mt-4">
            <h4 className="text-sm font-bold text-gray-300 mb-2">分數分布對比</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded bg-gray-800/30">
                <div className="text-xs text-purple-400 mb-1">個人化模型</div>
                <div className="text-2xl font-bold text-gray-100">
                  A:{personalScores.filter(s => s.grade === 'A').length} B:{personalScores.filter(s => s.grade === 'B').length}
                </div>
                <div className="text-xs text-gray-500">C:{personalScores.filter(s => s.grade === 'C').length} D:{personalScores.filter(s => s.grade === 'D').length}</div>
              </div>
              <div className="p-3 rounded bg-gray-800/30">
                <div className="text-xs text-gray-400 mb-1">純統計模型</div>
                <div className="text-2xl font-bold text-gray-100">
                  A:{pureStatScores.filter(s => s.grade === 'A').length} B:{pureStatScores.filter(s => s.grade === 'B').length}
                </div>
                <div className="text-xs text-gray-500">C:{pureStatScores.filter(s => s.grade === 'C').length} D:{pureStatScores.filter(s => s.grade === 'D').length}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
