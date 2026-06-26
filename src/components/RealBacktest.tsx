// ============================================================
// V10 真實回測頁 - 三彩種化
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { runBacktest } from '@/utils/backtest';
import type { DrawRecord } from '@/types';
import type { AnyPersonalSource } from '@/types/personal';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';
import { TrendingUp, AlertCircle, DollarSign, Target, BarChart3 } from 'lucide-react';

interface Props {
  records: DrawRecord[];
  userZone1: number[];
  sources: AnyPersonalSource[];
  lotteryType: LotteryType;
}

export default function RealBacktest({ records, userZone1, sources, lotteryType }: Props) {
  const config = getConfig(lotteryType);
  const [period, setPeriod] = useState('100');
  const [strategy, setStrategy] = useState('平衡');
  const [result, setResult] = useState<ReturnType<typeof runBacktest> | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    if (records.length < 20) return;
    setRunning(true);
    setTimeout(() => {
      const n = parseInt(period);
      const testRecords = records.slice(-n);
      const trainEnd = records.length - n;
      const trainRecords = records.slice(0, Math.max(trainEnd, Math.floor(records.length * 0.5)));
      const res = runBacktest(lotteryType, trainRecords, testRecords, userZone1, sources, strategy);
      setResult(res);
      setRunning(false);
    }, 100);
  };

  if (records.length < 20) {
    return (
      <Card className="border border-gray-800 bg-gray-900/60">
        <CardContent className="py-12 text-center text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p>{config.name} 歷史資料不足20期，無法回測。</p>
          <p className="text-xs mt-1">請到「資料管理」頁面匯入更多開獎資料。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border border-amber-900/30 bg-gray-900/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-400 text-lg">
            <Target className="w-5 h-5" />
            {config.name} 真實回測
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${config.themeColor} border-current`}>
              {config.mainMin}~{config.mainMax}選{config.mainCount}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">
              每注{config.ticketPrice}元
            </Badge>
            <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">
              {records.length}期資料
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-300 text-sm">回測期間</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="30" className="text-gray-100">近30期</SelectItem>
                  <SelectItem value="100" className="text-gray-100">近100期</SelectItem>
                  <SelectItem value="300" className="text-gray-100">近300期</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300 text-sm">策略</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {['保守', '平衡', '進取', '夢境強化', '卦象強化', '純統計'].map(s =>
                    <SelectItem key={s} value={s} className="text-gray-100">{s}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <AlertCircle className="w-3.5 h-3.5" />
            訓練期：{Math.max(records.length - parseInt(period), Math.floor(records.length * 0.5))}期 | 測試期：近{period}期
          </div>

          <Button onClick={handleRun} disabled={running} className="w-full bg-amber-600 hover:bg-amber-500 text-gray-900">
            <TrendingUp className="w-4 h-4 mr-1" />
            {running ? '回測中...' : `執行${config.name}回測`}
          </Button>

          {result && (
            <div className="space-y-3 mt-2">
              {/* 核心指標 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <MetricCard label="平均命中" value={`${result.avgHits}碼`} color="text-amber-400" />
                <MetricCard label="2碼+次數" value={`${result.twoPlusCount}次`} color="text-blue-400" />
                <MetricCard label="3碼+次數" value={`${result.threePlusCount}次`} color="text-purple-400" />
                <MetricCard label="4碼+次數" value={`${result.fourPlusCount}次`} color="text-pink-400" />
              </div>

              {/* 命中分布 */}
              <div className="p-3 rounded bg-gray-800/40">
                <div className="text-xs text-gray-400 mb-2">命中碼數分布</div>
                <div className="space-y-1">
                  {Array.from({ length: config.mainCount + 1 }, (_, h) => {
                    const tp = result.totalPeriods || parseInt(period);
                    const pct = tp > 0 ? ((result.hitDist?.[h] || 0) / tp * 100) : 0;
                    return (
                      <div key={h} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-10">{h}碼</span>
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs text-gray-400 w-16 text-right">{result.hitDist?.[h] || 0}期 ({pct.toFixed(1)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {config.hasSpecial && (
                <div className="p-3 rounded bg-gray-800/40">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{config.specialMode === 'separate' ? '第二區命中率' : '特別號相關'}</span>
                    <span className="text-purple-400">{result.specialHitRate}%</span>
                  </div>
                </div>
              )}

              {/* 獎項分布 */}
              {Object.keys(result.prizeTiers).length > 0 && (
                <div className="p-3 rounded bg-gray-800/40">
                  <div className="text-xs text-gray-400 mb-2 flex items-center gap-1"><BarChart3 className="w-3 h-3" />獎項分布</div>
                  {Object.entries(result.prizeTiers).map(([tier, count]) => (
                    <div key={tier} className="flex justify-between text-xs">
                      <span className="text-gray-500">{tier}</span>
                      <span className="text-amber-400">{count}次</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 成本與ROI */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-gray-800/40 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="text-[10px] text-gray-500">總投注 ({result.totalPeriods}期×{result.ticketPrice}元)</div>
                    <div className="text-sm font-bold text-gray-300">${result.totalCost.toLocaleString()}</div>
                  </div>
                </div>
                <div className="p-2 rounded bg-gray-800/40 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="text-[10px] text-gray-500">估算獎金</div>
                    <div className="text-sm font-bold text-amber-400">${result.estimatedPrize.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MetricCard label="ROI" value={`${result.roi}%`} color={result.roi >= 0 ? 'text-green-400' : 'text-red-400'} />
                <MetricCard label="最大連未中" value={`${result.maxConsecutiveMiss}期`} color="text-red-400" />
              </div>

              <div className="p-2 rounded bg-red-950/20 border border-red-900/20">
                <p className="text-[10px] text-red-300/70">
                  免責聲明：以上為{config.name}歷史回測結果，不代表未來績效。{config.name}為純隨機抽獎，任何模型均無法保證中獎。
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded bg-gray-800/60 text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
