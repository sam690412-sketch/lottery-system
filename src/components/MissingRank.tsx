import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Plus } from 'lucide-react';
import { addToObservationPool, isInObservationPool } from '@/utils/observationPool';
import { useState } from 'react';

interface Props {
  items: { rank: number; number: number; missingPeriods: number; lastDrawDate: string }[];
}

export default function MissingRank({ items }: Props) {
  const [poolSet, setPoolSet] = useState<Set<number>>(new Set());
  const handleAdd = (num: number) => { if (addToObservationPool(num)) setPoolSet(new Set([...poolSet, num])); };
  return (
    <Card className="border-orange-800/30 bg-orange-950/10">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-orange-400"><Clock className="w-4 h-4" />遺漏期數排行 TOP 15</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {items.slice(0, 15).map(item => (
          <div key={item.number} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-6">#{item.rank}</span>
              <span className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-sm">{item.number}</span>
              <div className="text-xs">
                <span className="text-orange-300">{item.missingPeriods} 期未開</span>
                <span className="text-gray-500 ml-2">上次: {item.lastDrawDate}</span>
              </div>
            </div>
            <button onClick={() => handleAdd(item.number)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-0.5">
              <Plus className="w-3 h-3" />{isInObservationPool(item.number) || poolSet.has(item.number) ? '已加入' : '觀察'}
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
