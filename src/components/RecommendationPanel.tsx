// ============================================================
// 推薦組合面板
// ============================================================
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Combination } from '@/types';
import { Gift, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  combinations: Combination[];
}

export default function RecommendationPanel({ combinations }: Props) {
  if (combinations.length === 0) return null;

  const styleColor = (style: string) => {
    switch (style) {
      case '保守': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case '平衡': return 'bg-green-500/20 text-green-400 border-green-500/40';
      case '進取': return 'bg-red-500/20 text-red-400 border-red-500/40';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border border-amber-900/30 bg-gray-900/80 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-400 text-lg">
            <Gift className="w-5 h-5" />
            今日推薦組合
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {combinations.map(combo => {
              const odd = combo.zone1.filter(n => n % 2 === 1).length;
              const big = combo.zone1.filter(n => n >= 20).length;
              const sum = combo.zone1.reduce((a, b) => a + b, 0);
              const zones = [
                combo.zone1.filter(n => n <= 9).length,
                combo.zone1.filter(n => n >= 10 && n <= 19).length,
                combo.zone1.filter(n => n >= 20 && n <= 29).length,
                combo.zone1.filter(n => n >= 30).length,
              ];

              return (
                <div key={combo.id} className="p-4 rounded-lg bg-gray-800/60 border border-gray-700/50">
                  {/* 組合標題 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`${styleColor(combo.style)}`}>
                        {combo.style}
                      </Badge>
                      <span className="text-lg font-bold text-gray-100">{combo.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-amber-400 font-bold">{combo.score}分</span>
                    </div>
                  </div>

                  {/* 號碼顯示 */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {combo.zone1.map(n => (
                      <div key={n} className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        combo.style === '保守' ? 'bg-blue-900/40 border border-blue-500/40 text-blue-300' :
                        combo.style === '平衡' ? 'bg-green-900/40 border border-green-500/40 text-green-300' :
                        'bg-red-900/40 border border-red-500/40 text-red-300'
                      }`}>
                        {String(n).padStart(2, '0')}
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold bg-amber-900/40 border border-amber-500/40 text-amber-300 ml-2">
                      {combo.zone2}
                    </div>
                    <span className="text-xs text-gray-500 self-center ml-1">第二區</span>
                  </div>

                  {/* 統計 */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-2">
                    <span>奇偶 {odd}:{6 - odd}</span>
                    <span>大小 {big}:{6 - big}</span>
                    <span>和值 {sum}</span>
                    <span>四區 {zones.join('-')}</span>
                  </div>

                  {/* 理由 */}
                  <p className="text-xs text-amber-300/70 mb-2">{combo.reason}</p>

                  {/* 風險提醒 */}
                  <div className="flex items-center gap-1 text-xs text-orange-400/80">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{combo.riskWarning}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
