// ============================================================
// V10.5 玄學權重總表
// ============================================================
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { runAllDivinations, calcMetaphysicsWeights } from '@/utils/divination';
import { loadBirthData } from '@/utils/divination';
import { Scale, AlertTriangle } from 'lucide-react';

const PRESETS = {
  '標準': { stats: 45, structure: 20, personal: 15, userKeep: 10, metaphysics: 10 },
  '玄學強化': { stats: 35, structure: 15, personal: 15, userKeep: 10, metaphysics: 25 },
  '純統計': { stats: 60, structure: 20, personal: 15, userKeep: 5, metaphysics: 0 },
};

export default function MetaphysicsWeightTable() {
  const birth = loadBirthData();
  const [weights, setWeights] = useState({ stats: 45, structure: 20, personal: 15, userKeep: 10, metaphysics: 10 });

  const divResults = useMemo(() => birth ? runAllDivinations(birth) : [], [birth]);
  const metaWeights = useMemo(() => {
    if (divResults.length === 0) return {};
    return calcMetaphysicsWeights(divResults);
  }, [divResults]);

  const topNumbers = useMemo(() => {
    return Object.entries(metaWeights).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [metaWeights]);

  const handlePreset = (name: keyof typeof PRESETS) => {
    setWeights({ ...PRESETS[name] });
  };

  const total = weights.stats + weights.structure + weights.personal + weights.userKeep + weights.metaphysics;

  return (
    <Card className="border border-violet-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-violet-400 text-xl">
          <Scale className="w-6 h-6" />
          玄學權重總表
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded bg-violet-950/20 border border-violet-900/20 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <p className="text-sm text-violet-300/70">
            玄學綜合權重包含：卦象、梅花易數、六爻、奇門遁甲、八字、紫微、河洛、飛星、生肖、塔羅。可自行調整總權重比例。
          </p>
        </div>

        {/* 預設 */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(name => (
            <Button key={name} size="sm" variant="outline" onClick={() => handlePreset(name)} className="text-base border-gray-600 text-gray-400">
              {name}
            </Button>
          ))}
        </div>

        {/* 權重調整 */}
        {[
          { key: 'stats', label: '統計資料', color: 'text-amber-400' },
          { key: 'structure', label: '號碼結構', color: 'text-blue-400' },
          { key: 'personal', label: '個人化資料', color: 'text-pink-400' },
          { key: 'userKeep', label: '養號權重', color: 'text-green-400' },
          { key: 'metaphysics', label: '玄學綜合', color: 'text-violet-400' },
        ].map(({ key, label, color }) => (
          <div key={key}>
            <div className="flex justify-between mb-1">
              <span className={`text-base ${color}`}>{label}</span>
              <span className="text-base text-gray-300 font-bold">{weights[key as keyof typeof weights]}%</span>
            </div>
            <Slider
              value={[weights[key as keyof typeof weights]]}
              onValueChange={v => setWeights(w => ({ ...w, [key]: v[0] }))}
              min={0} max={60} step={5}
            />
          </div>
        ))}

        <div className={`text-base text-center ${total === 100 ? 'text-green-400' : 'text-red-400'}`}>
          總計：{total}% {total !== 100 && `（需調整至100%）`}
        </div>

        {/* 玄學推薦號碼 */}
        {topNumbers.length > 0 && (
          <div className="p-3 rounded bg-gray-800/40">
            <p className="text-base text-gray-400 mb-2">玄學綜合推薦號碼（Top 10）</p>
            <div className="flex flex-wrap gap-2">
              {topNumbers.map(([n, score]) => (
                <div key={n} className="flex flex-col items-center">
                  <span className="w-12 h-12 rounded-full bg-violet-900/40 border border-violet-500/40 text-violet-300 flex items-center justify-center text-lg font-bold">{n}</span>
                  <span className="text-xs text-gray-500 mt-0.5">{Math.round(score)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
