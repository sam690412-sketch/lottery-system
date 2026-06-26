// ============================================================
// V10.5 掛法種類展示 - 10種命理方法
// ============================================================
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { runAllDivinations } from '@/utils/divination';
import { loadBirthData } from '@/utils/divination';
import { Compass, AlertTriangle } from 'lucide-react';

export default function DivinationMethodsPanel() {
  const birth = loadBirthData();
  const results = useMemo(() => birth ? runAllDivinations(birth) : [], [birth]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    results.forEach(r => { init[r.method] = r.enabled; });
    return init;
  });

  if (!birth) {
    return (
      <Card className="border border-purple-900/30 bg-gray-900/80">
        <CardContent className="py-8 text-center text-gray-500">
          <Compass className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-base">請先輸入命理資料</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-purple-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-purple-400 text-xl">
          <Compass className="w-6 h-6" />
          命理掛法結果（{results.length}種）
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-3 rounded bg-purple-950/20 border border-purple-900/20 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
          <p className="text-sm text-purple-300/70">
            所有掛法皆為簡化娛樂版本，不具備預測能力。每種方法可獨立開關。
          </p>
        </div>

        {results.map(r => (
          <div key={r.method} className={`p-3 rounded-lg border transition ${enabled[r.method] ? 'bg-gray-800/60 border-purple-700/30' : 'bg-gray-800/20 border-gray-800/30 opacity-60'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Switch checked={enabled[r.method] || false} onCheckedChange={c => setEnabled(prev => ({ ...prev, [r.method]: c }))} />
                <span className="text-base font-semibold text-gray-200">{r.method}</span>
                <Badge variant="outline" className="text-base border-gray-600 text-gray-400">{r.dominantElement}</Badge>
              </div>
              <span className="text-base text-purple-400 font-bold">{r.score}分</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">{r.data}</p>
            <p className="text-sm text-gray-300 mb-2">{r.description}</p>
            <div className="flex flex-wrap gap-1.5 mb-1">
              <span className="text-sm text-gray-500">推薦：</span>
              {r.recommendedNumbers.slice(0, 6).map(n => (
                <span key={n} className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300 flex items-center justify-center text-sm font-semibold">{n}</span>
              ))}
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-500">強勢尾數：<span className="text-green-400">{r.luckyTails.join('、')}</span></span>
              {r.avoidTails.length > 0 && <span className="text-gray-500">忌用尾數：<span className="text-red-400">{r.avoidTails.join('、')}</span></span>}
            </div>
            <p className="text-xs text-gray-600 mt-1 italic">{r.entertainmentNote}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
