// ============================================================
// V11 4週/8週/12週 實測計畫 + 策略選擇
// ============================================================
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';
import { getDrawDates } from '@/utils/drawSchedule';
import { Calendar, DollarSign, Target, Clock, ListChecks } from 'lucide-react';

const WEEKS_OPTIONS = [4, 8, 12];
const COMBO_OPTIONS = [1, 2, 3, 5, 10];
const STRATEGIES = ['純統計', '保守', '平衡', '進取', '夢境強化', '卦象強化', '玄學綜合'];

interface Props {
  lotteryType: LotteryType;
}

export default function TestPlan({ lotteryType }: Props) {
  const config = getConfig(lotteryType);
  const [weeks, setWeeks] = useState(4);
  const [combos, setCombos] = useState(3);
  const [strategy, setStrategy] = useState('平衡');

  const dates = useMemo(() => getDrawDates(lotteryType, weeks * 7), [lotteryType, weeks]);
  const totalPeriods = dates.length;
  const totalCombos = totalPeriods * combos;
  const totalCost = totalCombos * config.ticketPrice;

  return (
    <Card className="border border-emerald-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-emerald-400 text-xl">
          <Target className="w-6 h-6" />
          {config.name} 實測計畫
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 設定 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">測試期間</label>
            <div className="flex gap-1">
              {WEEKS_OPTIONS.map(w => (
                <Button key={w} size="sm" variant={weeks === w ? 'default' : 'outline'}
                  onClick={() => setWeeks(w)}
                  className={weeks === w ? 'bg-emerald-600 text-white text-sm' : 'border-gray-600 text-gray-400 text-sm'}>
                  {w}週
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">每期組數</label>
            <div className="flex gap-1">
              {COMBO_OPTIONS.map(c => (
                <Button key={c} size="sm" variant={combos === c ? 'default' : 'outline'}
                  onClick={() => setCombos(c)}
                  className={combos === c ? 'bg-emerald-600 text-white text-sm' : 'border-gray-600 text-gray-400 text-sm'}>
                  {c}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">策略</label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {STRATEGIES.map(s => <SelectItem key={s} value={s} className="text-gray-100 text-sm">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatCard icon={<Calendar className="w-5 h-5 text-emerald-400" />} label="預計開獎" value={`${totalPeriods}期`} />
          <StatCard icon={<DollarSign className="w-5 h-5 text-amber-400" />} label="總預算" value={`$${totalCost.toLocaleString()}`} />
          <StatCard icon={<Target className="w-5 h-5 text-blue-400" />} label="總組數" value={`${totalCombos}組`} />
          <StatCard icon={<Clock className="w-5 h-5 text-purple-400" />} label={`${weeks}週成本`} value={`$${totalCost.toLocaleString()}`} />
        </div>

        {/* 摘要 */}
        <div className="p-3 rounded bg-gray-800/40 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">彩種</span>
            <span className={config.themeColor}>{config.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">開獎日</span>
            <span className="text-gray-300">{config.drawDays.join('、')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">每期成本</span>
            <span className="text-gray-300">{combos}組 × ${config.ticketPrice} = ${(combos * config.ticketPrice).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">使用策略</span>
            <Badge variant="outline" className="text-sm border-emerald-700 text-emerald-400">{strategy}</Badge>
          </div>
        </div>

        {/* 追蹤清單 */}
        <div>
          <p className="text-sm text-gray-400 mb-2 flex items-center gap-1"><ListChecks className="w-4 h-4" />追蹤清單（前10期）</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {dates.slice(0, 10).map((d, i) => {
              const dayName = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][d.getDay()];
              return (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-gray-800/30 text-sm">
                  <span className="text-gray-400">{i + 1}. {d.toISOString().split('T')[0]} {dayName}</span>
                  <span className="text-amber-500">{combos}組 × ${config.ticketPrice}</span>
                </div>
              );
            })}
            {dates.length > 10 && <p className="text-xs text-gray-600 text-center">...還有 {dates.length - 10} 期</p>}
          </div>
        </div>

        {/* 執行流程 */}
        <div className="p-3 rounded bg-emerald-950/20 border border-emerald-900/20">
          <p className="text-sm text-emerald-400 font-semibold mb-1">建議執行流程</p>
          <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
            <li>每開獎日前一天產生推薦組合</li>
            <li>記錄投注的組數與號碼</li>
            <li>開獎後輸入實際開獎結果</li>
            <li>更新實測日誌（命中數、獎金）</li>
            <li>{weeks}週後檢視週報分析成效</li>
          </ol>
        </div>

        <div className="p-2 rounded bg-orange-950/20 border border-orange-900/20">
          <p className="text-sm text-orange-300/70">
            {weeks}週實測僅為統計觀察用途，不代表未來績效。請設定預算上限並理性投注。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded bg-gray-800/40 flex items-center gap-3">
      {icon}
      <div>
        <div className="text-lg font-bold text-gray-200">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}
