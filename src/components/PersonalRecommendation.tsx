// ============================================================
// 今日個人化推薦
// ============================================================
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Zap } from 'lucide-react';
import type { Combination } from '@/types';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';
interface Props {
  combinations: Combination[];
  strategy: string;
  onStrategyChange: (strategy: string) => void;
  lotteryType?: LotteryType;
}

const STRATEGIES: { key: string; label: string; desc: string; color: string }[] = [
  { key: '保守', label: '保守型', desc: '保留4-5養號，個人化輔助1-2碼', color: 'text-blue-400 border-blue-500/40 bg-blue-900/20' },
  { key: '平衡', label: '平衡型', desc: '養號2-3 + 統計2-3 + 個人化1-2', color: 'text-green-400 border-green-500/40 bg-green-900/20' },
  { key: '進取', label: '進取型', desc: '統計A/B為主，個人化做尾數調整', color: 'text-red-400 border-red-500/40 bg-red-900/20' },
  { key: '夢境強化', label: '夢境強化', desc: '夢境權重15%，仍通過13層漏斗', color: 'text-indigo-400 border-indigo-500/40 bg-indigo-900/20' },
  { key: '卦象強化', label: '卦象強化', desc: '卦象權重15%，仍通過13層漏斗', color: 'text-purple-400 border-purple-500/40 bg-purple-900/20' },
  { key: '純統計', label: '純統計型', desc: '只用歷史統計與結構，不用個人化', color: 'text-gray-400 border-gray-500/40 bg-gray-900/20' },
];

export default function PersonalRecommendation({ combinations, strategy, onStrategyChange, lotteryType = 'power' }: Props) {
  const config = getConfig(lotteryType);
  const styleColor = (style: string) => {
    switch (style) {
      case '保守': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case '平衡': return 'bg-green-500/20 text-green-400 border-green-500/40';
      case '進取': return 'bg-red-500/20 text-red-400 border-red-500/40';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    }
  };

  return (
    <div className="space-y-4">
      {/* 策略選擇 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {STRATEGIES.map(s => (
          <Button
            key={s.key}
            variant="outline"
            onClick={() => onStrategyChange(s.key)}
            className={`h-auto py-2 px-3 flex flex-col items-start gap-0.5 border ${strategy === s.key ? s.color + ' ring-1 ring-amber-500/50' : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:bg-gray-700/50'}`}
          >
            <span className="text-base font-bold">{s.label}</span>
            <span className="text-sm opacity-70">{s.desc}</span>
          </Button>
        ))}
      </div>

      {/* 推薦組合 */}
      {combinations.length === 0 ? (
        <Card className="border border-gray-800 bg-gray-900/60">
          <CardContent className="py-8 text-center text-gray-500">
            <Zap className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            請先在「今日選號」頁面點擊「啟動13層選號漏斗」
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {combinations.map(combo => {
            const odd = combo.zone1.filter(n => n % 2 === 1).length;
            const big = combo.zone1.filter(n => n >= 20).length;
            const sum = combo.zone1.reduce((a, b) => a + b, 0);
            return (
              <Card key={combo.id} className={`border ${combo.style === strategy ? 'border-amber-600/50' : 'border-gray-800'} bg-gray-900/60`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={styleColor(combo.style)}>{combo.style}</Badge>
                      <span className="font-bold text-gray-100">{combo.name}</span>
                    </div>
                    <span className="text-amber-400 font-bold">{combo.score}分</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {combo.zone1.map(n => (
                      <div key={n} className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold border ${
                        combo.style === '保守' ? 'bg-blue-900/40 border-blue-500/40 text-blue-300' :
                        combo.style === '平衡' ? 'bg-green-900/40 border-green-500/40 text-green-300' :
                        'bg-red-900/40 border-red-500/40 text-red-300'
                      }`}>{String(n).padStart(2, '0')}</div>
                    ))}
                    {config.hasSpecial && config.specialMode === 'separate' && (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold bg-amber-900/40 border border-amber-500/40 text-amber-300 ml-1">{combo.zone2}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 mb-2">
                    <span>奇偶 {odd}:{config.mainCount - odd}</span>
                    <span>大小 {big}:{config.mainCount - big}</span>
                    <span>和值 {sum}</span>
                  </div>
                  <p className="text-xs text-amber-300/60">{combo.reason}</p>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-orange-400/70">
                    <AlertTriangle className="w-3 h-3" />
                    {combo.riskWarning}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
