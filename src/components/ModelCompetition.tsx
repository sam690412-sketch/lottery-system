// ============================================================
// V10 模型競賽 - 三彩種化
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { runModelCompetition } from '@/utils/backtest';
import type { DrawRecord } from '@/types';
import type { AnyPersonalSource } from '@/types/personal';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';
import { Swords, Trophy } from 'lucide-react';

interface Props {
  records: DrawRecord[];
  userZone1: number[];
  sources: AnyPersonalSource[];
  lotteryType: LotteryType;
}

export default function ModelCompetition({ records, userZone1, sources, lotteryType }: Props) {
  const config = getConfig(lotteryType);
  const [results, setResults] = useState<{ strategy: string; hitRate: number; roi: number; avgHits?: number; ticketPrice?: number; totalCost?: number; twoPlusCount?: number; threePlusCount?: number; specialHitRate?: number; maxConsecutiveMiss?: number; stabilityScore?: number }[]>([]);
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    if (records.length < 50) return;
    setRunning(true);
    setTimeout(() => {
      const res = runModelCompetition(lotteryType, records.slice(0, Math.floor(records.length * 0.7)), userZone1, sources);
      setResults(res.results.sort((a, b) => b.roi - a.roi));
      setRunning(false);
    }, 100);
  };

  if (records.length < 50) {
    return (
      <Card className="border border-gray-800 bg-gray-900/60">
        <CardContent className="py-8 text-center text-gray-500">
          <Swords className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p>{config.name} 資料不足50期，無法進行模型競賽。</p>
        </CardContent>
      </Card>
    );
  }

  const best = results[0];

  return (
    <div className="space-y-4">
      <Card className="border border-purple-900/30 bg-gray-900/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-purple-400 text-lg">
            <Swords className="w-5 h-5" />
            {config.name} 模型競賽
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${config.themeColor} border-current`}>{config.name}</Badge>
            <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">6策略對決</Badge>
          </div>

          <Button onClick={handleRun} disabled={running} className="w-full bg-purple-600 hover:bg-purple-500 text-gray-900">
            <Swords className="w-4 h-4 mr-1" />
            {running ? '競賽進行中...' : `開始${config.name}模型競賽`}
          </Button>

          {best && (
            <div className="p-3 rounded bg-amber-950/20 border border-amber-700/30 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-xs text-amber-400 font-bold">冠軍：{best.strategy} 策略</div>
                <div className="text-[10px] text-amber-300/70">ROI {best.roi}% | 平均{best.avgHits}碼 | 每注{best.ticketPrice}元</div>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 font-semibold">排名結果</div>
              {results.map((r, i) => (
                <div key={r.strategy} className="p-2 rounded bg-gray-800/40">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                        #{i + 1}
                      </span>
                      <span className="text-sm text-gray-200">{r.strategy}</span>
                    </div>
                    <span className={`text-xs font-bold ${r.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>{r.roi}% ROI</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <Progress value={Math.max(0, Math.min(100, r.stabilityScore ?? 0))} className="h-1" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 mt-1 text-[10px] text-gray-500">
                    <span>平均{r.avgHits}碼</span>
                    <span>2+碼{r.twoPlusCount}次</span>
                    <span>3+碼{r.threePlusCount}次</span>
                    {config.hasSpecial && <span>特別號{r.specialHitRate}%</span>}
                    <span>最大連未中{r.maxConsecutiveMiss}期</span>
                    <span>投注${(r.totalCost ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
