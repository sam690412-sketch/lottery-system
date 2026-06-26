import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Repeat } from 'lucide-react';

interface Props {
  data: { noRepeatCount: number; oneRepeatCount: number; multiRepeatCount: number; noRepeatRate: string; oneRepeatRate: string; multiRepeatRate: string; commonRepeats: { number: number; count: number }[] };
}

export default function RepeatNumberAnalysis({ data }: Props) {
  return (
    <Card className="border-teal-800/30 bg-teal-950/10">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-teal-400"><Repeat className="w-4 h-4" />重複號分析</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800/50 rounded p-2 text-center"><p className="text-lg font-bold text-gray-300">{data.noRepeatCount}</p><p className="text-[10px] text-gray-400">無重複 ({data.noRepeatRate}%)</p></div>
          <div className="bg-gray-800/50 rounded p-2 text-center"><p className="text-lg font-bold text-teal-300">{data.oneRepeatCount}</p><p className="text-[10px] text-gray-400">重複1碼 ({data.oneRepeatRate}%)</p></div>
          <div className="bg-gray-800/50 rounded p-2 text-center"><p className="text-lg font-bold text-amber-300">{data.multiRepeatCount}</p><p className="text-[10px] text-gray-400">重複2+碼 ({data.multiRepeatRate}%)</p></div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">常見重複號碼</p>
          <div className="flex flex-wrap gap-2">
            {data.commonRepeats.map(r => (
              <span key={r.number} className="px-2 py-1 rounded bg-teal-900/40 text-teal-300 text-xs">{r.number}: {r.count}次</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
