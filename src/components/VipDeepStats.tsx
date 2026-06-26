// ============================================================
// V14 VIP 深度分析區 - 僅 VIP / Tester / Admin 可見
// ============================================================
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, TrendingUp, Timer, Hash, Plus } from 'lucide-react';
import { canViewDeepStats } from '@/utils/statPermission';
import { addToObservationPool, isInObservationPool } from '@/utils/observationPool';
import { useState } from 'react';

interface HeatItem { number: number; score: number; freq: number; missing: number; }
interface CycleItem { number: number; avgCycle: number; currentMissing: number; isOverdue: boolean; overdueRatio: string; }
interface TailTrend { tail: number; recentCount: number; oldCount: number; trend: '升溫' | '降溫' | '持平'; change: string; }

interface Props {
  heatScores: HeatItem[];
  missingCycles: CycleItem[];
  tailTrends: TailTrend[];
}

export default function VipDeepStats({ heatScores, missingCycles, tailTrends }: Props) {
  const canView = canViewDeepStats();
  const [poolSet, setPoolSet] = useState<Set<number>>(new Set());
  const handleAdd = (num: number) => { if (addToObservationPool(num)) setPoolSet(new Set([...poolSet, num])); };

  if (!canView) {
    return (
      <Card className="border-gray-700 bg-gray-900/30">
        <CardContent className="p-6 text-center space-y-3">
          <Lock className="w-8 h-8 text-gray-500 mx-auto" />
          <p className="text-gray-400 text-sm">VIP 深度分析區已鎖定</p>
          <p className="text-xs text-gray-500">完整歷史統計屬於 VIP 功能。如需大量歷史資料、完整回測或客製統計，請洽管理員。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2"><TrendingUp className="w-5 h-5" />VIP 深度分析</h2>

      {/* AI 熱度分數 */}
      <Card className="border-amber-800/30 bg-amber-950/10">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-amber-400"><TrendingUp className="w-4 h-4" />AI 熱度分數 TOP 10</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {heatScores.slice(0, 10).map(h => (
            <div key={h.number} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-sm">{h.number}</span>
                <div className="text-xs"><span className="text-amber-300 font-bold">{h.score}分</span><span className="text-gray-400 ml-2">出現{h.freq}次/遺漏{h.missing}期</span></div>
              </div>
              <button onClick={() => handleAdd(h.number)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-0.5"><Plus className="w-3 h-3" />{isInObservationPool(h.number) || poolSet.has(h.number) ? '已加入' : '觀察'}</button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 遺漏週期模型 */}
      <Card className="border-red-800/30 bg-red-950/10">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><Timer className="w-4 h-4" />遺漏週期模型 TOP 10 (超過平均)</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {missingCycles.filter(m => m.isOverdue).slice(0, 10).map(m => (
            <div key={m.number} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm">{m.number}</span>
                <div className="text-xs"><span className="text-red-300">已超過{m.overdueRatio}倍平均</span><span className="text-gray-400 ml-2">平均{m.avgCycle}期/目前{m.currentMissing}期</span></div>
              </div>
              <button onClick={() => handleAdd(m.number)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-0.5"><Plus className="w-3 h-3" />{isInObservationPool(m.number) || poolSet.has(m.number) ? '已加入' : '觀察'}</button>
            </div>
          ))}
          {missingCycles.filter(m => m.isOverdue).length === 0 && <p className="text-xs text-gray-500">目前無超過平均遺漏的號碼</p>}
        </CardContent>
      </Card>

      {/* 尾數循環模型 */}
      <Card className="border-blue-800/30 bg-blue-950/10">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-blue-400"><Hash className="w-4 h-4" />尾數循環模型</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {tailTrends.map(t => (
            <div key={t.tail} className="flex items-center justify-between py-1 text-sm">
              <span className="text-gray-300">尾數 {t.tail}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${t.trend === '升溫' ? 'text-red-400' : t.trend === '降溫' ? 'text-blue-400' : 'text-gray-400'}`}>{t.trend} {t.change}</span>
                <span className="text-xs text-gray-500">近{t.recentCount}/舊{t.oldCount}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 提示 */}
      <p className="text-xs text-gray-500 text-center">如需全部原始資料匯出、特殊模型或企業版分析，請洽管理員。</p>
    </div>
  );
}
