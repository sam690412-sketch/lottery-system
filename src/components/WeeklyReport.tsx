// ============================================================
// V11 實測週報
// ============================================================
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { LotteryType } from '@/utils/lotteryConfig';
import { loadJournal } from '@/utils/backtest';
import { generateWeeklyReport } from '@/utils/report';
import { BarChart3, TrendingUp, TrendingDown, Trophy, Calendar, DollarSign } from 'lucide-react';

interface Props {
  lotteryType: LotteryType;
}

export default function WeeklyReport({ lotteryType }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);

  const entries = useMemo(() => loadJournal(lotteryType), [lotteryType]);
  const report = useMemo(() => generateWeeklyReport(entries, weekOffset), [entries, weekOffset]);

  if (!report && weekOffset === 0) {
    return (
      <Card className="border border-purple-900/30 bg-gray-900/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-purple-400 text-lg">
            <BarChart3 className="w-5 h-5" />
            實測週報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-6 text-sm">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            本週尚無實測記錄<br />
            <span className="text-xs">開始記錄開獎結果後自動產生週報</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="border border-gray-800 bg-gray-900/60">
        <CardContent className="py-6 text-center text-gray-500 text-sm">
          第{weekOffset + 1}週無資料
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-purple-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-purple-400 text-lg">
          <BarChart3 className="w-5 h-5" />
          第{report.weekNumber}週實測報告
          <Badge variant="outline" className="text-[10px] border-purple-700/40 text-purple-400">{report.lotteryName}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-gray-500">{report.startDate} ~ {report.endDate}</div>

        {/* 核心指標 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MetricCard label="投注期數" value={`${report.totalPeriods}期`} />
          <MetricCard label="總成本" value={`$${report.totalCost.toLocaleString()}`} icon={<DollarSign className="w-3 h-3 text-gray-500" />} />
          <MetricCard label="平均命中" value={`${report.avgHits}碼`} />
          <MetricCard label="中獎次數" value={`${report.winCount}次`} icon={<Trophy className="w-3 h-3 text-amber-500" />} />
        </div>

        {/* ROI */}
        <div className={`p-3 rounded ${report.roi >= 0 ? 'bg-green-950/20 border border-green-900/20' : 'bg-red-950/20 border border-red-900/20'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">本週 ROI</span>
            <span className={`text-lg font-bold ${report.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {report.roi >= 0 ? <TrendingUp className="w-4 h-4 inline mr-1" /> : <TrendingDown className="w-4 h-4 inline mr-1" />}
              {report.roi}%
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">{report.suggestion}</p>
        </div>

        {/* 命中分布 */}
        {Object.keys(report.hitDist).length > 0 && (
          <div className="p-3 rounded bg-gray-800/40">
            <div className="text-xs text-gray-400 mb-2">命中分布</div>
            {Object.entries(report.hitDist).sort((a, b) => Number(a[0]) - Number(b[0])).map(([hits, count]) => (
              <div key={hits} className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500 w-8">{hits}碼</span>
                <Progress value={(count / report.totalPeriods) * 100} className="h-1.5 flex-1" />
                <span className="text-xs text-gray-400 w-12 text-right">{count}次</span>
              </div>
            ))}
          </div>
        )}

        {/* 最佳組合 */}
        {report.bestCombo && (
          <div className="p-2 rounded bg-amber-950/20 border border-amber-900/20">
            <div className="text-[10px] text-amber-400 font-semibold mb-1">最佳組合</div>
            <div className="flex flex-wrap gap-1">
              {report.bestCombo.zone1.map(n => (
                <span key={n} className="w-8 h-8 rounded-full bg-amber-900/40 border border-amber-600/40 text-amber-300 text-xs flex items-center justify-center">{String(n).padStart(2, '0')}</span>
              ))}
            </div>
            <span className="text-xs text-amber-500 mt-1">命中 {report.bestCombo.hits} 碼</span>
          </div>
        )}

        {/* 策略表現 */}
        {Object.keys(report.strategies).length > 0 && (
          <div className="p-3 rounded bg-gray-800/40">
            <div className="text-xs text-gray-400 mb-2">策略表現</div>
            {Object.entries(report.strategies).map(([name, data]) => (
              <div key={name} className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">{name}</span>
                <span className="text-gray-300">{data.count}次 | 均{data.avgHits}碼</span>
              </div>
            ))}
          </div>
        )}

        {/* 週切換 */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setWeekOffset(w => w + 1)} className="text-xs border-gray-700 text-gray-400">上週</Button>
          {weekOffset > 0 && <Button size="sm" variant="outline" onClick={() => setWeekOffset(0)} className="text-xs border-gray-700 text-gray-400">本週</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="p-2 rounded bg-gray-800/40 text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">{icon}</div>
      <div className="text-sm font-bold text-gray-200">{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
