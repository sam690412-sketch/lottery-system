import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Snowflake, Plus } from 'lucide-react';
import { addToObservationPool, isInObservationPool } from '@/utils/observationPool';
import { trackFirst } from '@/utils/behaviorTracker';
import { useState } from 'react';

interface Props {
  hot: { rank: number; number: number; count: number; rate: string }[];
  cold: { rank: number; number: number; count: number; rate: string }[];
}

export default function HotColdNumbers({ hot, cold }: Props) {
  const [poolSet, setPoolSet] = useState<Set<number>>(new Set());
  const handleAdd = (num: number) => {
    if (addToObservationPool(num)) {
      setPoolSet(new Set([...poolSet, num]));
      trackFirst('first_watchlist'); // V18.1.1: 首次觀察池追蹤
    }
  };
  return (
    <div className="space-y-4">
      {/* 熱門號碼 */}
      <Card className="border-red-800/30 bg-red-950/10">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><Flame className="w-4 h-4" />熱門號碼 TOP 10</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {hot.slice(0, 10).map(h => (
            <div key={h.number} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-6">#{h.rank}</span>
                <span className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm">{h.number}</span>
                <span className="text-xs text-gray-400">{h.count} 次 ({h.rate}%)</span>
              </div>
              <button onClick={() => handleAdd(h.number)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-0.5">
                <Plus className="w-3 h-3" />{isInObservationPool(h.number) || poolSet.has(h.number) ? '已加入' : '觀察'}
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
      {/* 冷門號碼 */}
      <Card className="border-blue-800/30 bg-blue-950/10">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-blue-400"><Snowflake className="w-4 h-4" />冷門號碼 TOP 10</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {cold.slice(0, 10).map(c => (
            <div key={c.number} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-6">#{c.rank}</span>
                <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">{c.number}</span>
                <span className="text-xs text-gray-400">{c.count} 次 ({c.rate}%)</span>
              </div>
              <button onClick={() => handleAdd(c.number)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-0.5">
                <Plus className="w-3 h-3" />{isInObservationPool(c.number) || poolSet.has(c.number) ? '已加入' : '觀察'}
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
