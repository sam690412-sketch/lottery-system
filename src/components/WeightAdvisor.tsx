// ============================================================
// 權重建議器
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { analyzeWeightEffectiveness } from '@/utils/backtest';
import type { DrawRecord } from '@/types';
import type { LotteryType } from '@/utils/lotteryConfig';
import { Lightbulb, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface Props {
  records: DrawRecord[];
  userZone1: number[];
  lotteryType?: LotteryType;
}

export default function WeightAdvisor({ records, userZone1, lotteryType = 'power' }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<{ number: number; totalScore: number; hitCount: number; effectiveness: number; layer: string; suggestion: string }[]>([]);

  const handleAnalyze = () => {
    if (records.length < 50) return;
    setAnalyzing(true);
    const mid = Math.floor(records.length * 0.7);
    const train = records.slice(0, mid);
    const test = records.slice(mid);
    const res = analyzeWeightEffectiveness(lotteryType, train, test, userZone1);
    setResults(res);
    setAnalyzing(false);
  };

  const effectiveCount = results.filter(r => r.effectiveness > 0).length;
  const ineffectiveCount = results.filter(r => r.effectiveness <= 0).length;

  return (
    <div className="space-y-4">
      <Card className="border border-amber-900/30 bg-gray-900/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-400 text-lg">
            <Lightbulb className="w-5 h-5" />
            權重建議器
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-gray-500">
            根據最近30-50期實測績效，分析每個篩選層的有效性。注意：歷史績效不代表未來結果。
          </p>

          <Button onClick={handleAnalyze} disabled={analyzing || records.length < 50} className="w-full bg-amber-600 hover:bg-amber-500 text-gray-900">
            <Lightbulb className="w-4 h-4 mr-1" />
            {analyzing ? '分析中...' : records.length < 50 ? '需至少50期資料' : '分析權重有效性'}
          </Button>

          {results.length > 0 && (
            <>
              {/* 摘要 */}
              <div className="flex gap-3">
                <Badge className="bg-green-900/30 text-green-400 border-green-500/30">
                  <TrendingUp className="w-3 h-3 mr-1" />{effectiveCount}層有效
                </Badge>
                <Badge className="bg-red-900/30 text-red-400 border-red-500/30">
                  <TrendingDown className="w-3 h-3 mr-1" />{ineffectiveCount}層無效
                </Badge>
              </div>

              {/* 各層分析 */}
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="p-3 rounded bg-gray-800/40 border border-gray-700/30">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {r.effectiveness > 0 ? <TrendingUp className="w-3.5 h-3.5 text-green-400" /> :
                         r.effectiveness > -5 ? <Minus className="w-3.5 h-3.5 text-gray-400" /> :
                         <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                        <span className="text-sm font-bold text-gray-200">{r.layer}</span>
                      </div>
                      <span className={`text-xs font-bold ${r.effectiveness > 0 ? 'text-green-400' : r.effectiveness > -5 ? 'text-gray-400' : 'text-red-400'}`}>
                        {r.effectiveness > 0 ? '+' : ''}{r.effectiveness}‰
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Progress value={Math.max(0, Math.min(100, 50 + r.effectiveness))} className="h-1 flex-1" />
                    </div>
                    <p className="text-xs text-gray-500">{r.suggestion}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded bg-yellow-950/20 border border-yellow-900/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-300/70">
                    以上建議僅基於歷史回測結果，不代表未來績效。調整權重可能改善也可能惡化選號品質。請持續實測驗證。
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
