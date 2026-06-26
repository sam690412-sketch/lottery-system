// ============================================================
// 投注追蹤面板
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Combination, TrackResult } from '@/types';
import { checkPrize } from '@/utils/lottery';
import { Target, Plus, Trash2, TrendingUp, DollarSign } from 'lucide-react';

interface Props {
  combinations: Combination[];
  trackResults: TrackResult[];
  onTrack: (result: TrackResult) => void;
  onClear: () => void;
}

export default function TrackingPanel({ combinations, trackResults, onTrack, onClear }: Props) {
  const [drawZone1Str, setDrawZone1Str] = useState('');
  const [drawZone2Str, setDrawZone2Str] = useState('');
  const [selectedCombo, setSelectedCombo] = useState('');

  const totalCost = trackResults.reduce((a, r) => a + r.cost, 0);
  const totalPrize = trackResults.reduce((a, r) => a + r.prizeAmount, 0);
  const roi = totalCost > 0 ? ((totalPrize - totalCost) / totalCost * 100) : 0;

  const handleTrack = () => {
    const drawZone1 = drawZone1Str.split(/[,，\s]+/).map(Number).filter(n => n >= 1 && n <= 38);
    const drawZone2 = Number(drawZone2Str);
    if (drawZone1.length !== 6 || drawZone2 < 1 || drawZone2 > 8) {
      alert('請輸入正確的開獎號碼');
      return;
    }

    const combo = combinations.find(c => c.id === selectedCombo) || combinations[0];
    if (!combo) return;

    const matchCount = combo.zone1.filter(n => drawZone1.includes(n)).length;
    const matchZone2 = combo.zone2 === drawZone2;
    const prize = checkPrize(combo.zone1, combo.zone2, drawZone1, drawZone2);

    onTrack({
      date: new Date().toISOString().split('T')[0],
      combinationId: combo.id,
      comboName: combo.name,
      myZone1: combo.zone1,
      myZone2: combo.zone2,
      drawZone1,
      drawZone2,
      matchCount,
      matchZone2,
      prize: prize.level,
      prizeAmount: prize.amount,
      cost: 100,
    });

    setDrawZone1Str('');
    setDrawZone2Str('');
  };

  return (
    <Card className="border border-amber-900/30 bg-gray-900/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-amber-400 text-lg">
          <Target className="w-5 h-5" />
          投注追蹤
          {trackResults.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-900/20">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ROI總覽 */}
        {trackResults.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="p-3 rounded-lg bg-gray-800/60 text-center">
              <div className="text-xs text-gray-500">總投入</div>
              <div className="text-lg font-bold text-gray-200">${totalCost.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-800/60 text-center">
              <div className="text-xs text-gray-500">總獎金</div>
              <div className="text-lg font-bold text-amber-400">${totalPrize.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-800/60 text-center">
              <div className="text-xs text-gray-500">ROI</div>
              <div className={`text-lg font-bold ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* 輸入開獎號碼 */}
        <div className="space-y-3">
          <div>
            <Label className="text-gray-300 text-sm">選擇追蹤組合</Label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {combinations.map(c => (
                <Button
                  key={c.id}
                  variant={selectedCombo === c.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCombo(c.id)}
                  className={selectedCombo === c.id ? 'bg-amber-600 text-gray-900' : 'border-gray-600 text-gray-300'}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-300 text-sm">開獎第一區 (6碼)</Label>
              <Input
                value={drawZone1Str}
                onChange={e => setDrawZone1Str(e.target.value)}
                placeholder="例: 3,8,15,22,29,35"
                className="mt-1 bg-gray-800 border-gray-700 text-amber-100 placeholder:text-gray-600"
              />
            </div>
            <div>
              <Label className="text-gray-300 text-sm">開獎第二區 (1碼)</Label>
              <Input
                value={drawZone2Str}
                onChange={e => setDrawZone2Str(e.target.value)}
                placeholder="例: 5"
                className="mt-1 bg-gray-800 border-gray-700 text-amber-100 placeholder:text-gray-600 w-24"
              />
            </div>
          </div>

          <Button
            onClick={handleTrack}
            className="w-full bg-gray-800 hover:bg-gray-700 text-amber-400 border border-amber-700/50"
          >
            <Plus className="w-4 h-4 mr-1" />
            記錄本期結果
          </Button>
        </div>

        {/* 追蹤歷史 */}
        {trackResults.length > 0 && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            <div className="flex items-center gap-2 text-xs text-gray-500 px-2">
              <TrendingUp className="w-3 h-3" />
              <span>已追蹤 {trackResults.length} 期</span>
            </div>
            {trackResults.map((r, i) => (
              <div key={i} className="p-2 rounded bg-gray-800/40 border border-gray-700/30 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{r.date}</span>
                    <span className="font-bold text-amber-400">{r.comboName}</span>
                    <span className="text-gray-500">vs 開獎{r.drawZone1.join(',')}+{r.drawZone2}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">命中{r.matchCount}碼</span>
                    {r.matchZone2 && <span className="text-purple-400">第二區中</span>}
                    <DollarSign className="w-3 h-3 text-green-400" />
                    <span className={`font-bold ${r.prizeAmount > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                      ${r.prizeAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
                {r.prize !== '未中獎' && (
                  <div className="text-xs text-amber-300/70 mt-1">
                    中{r.prize}！組合號碼: {r.myZone1.join(',')} + {r.myZone2}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
