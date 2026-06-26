import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'lucide-react';

interface Props {
  data: { noConsecCount: number; oneConsecCount: number; multiConsecCount: number; noConsecRate: string; oneConsecRate: string; multiConsecRate: string; commonPairs: { pair: string; count: number }[] };
}

export default function ConsecutiveAnalysis({ data }: Props) {
  return (
    <Card className="border-pink-800/30 bg-pink-950/10">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-pink-400"><Link className="w-4 h-4" />連號分析</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800/50 rounded p-2 text-center"><p className="text-lg font-bold text-gray-300">{data.noConsecCount}</p><p className="text-[10px] text-gray-400">無連號 ({data.noConsecRate}%)</p></div>
          <div className="bg-gray-800/50 rounded p-2 text-center"><p className="text-lg font-bold text-pink-300">{data.oneConsecCount}</p><p className="text-[10px] text-gray-400">1組連號 ({data.oneConsecRate}%)</p></div>
          <div className="bg-gray-800/50 rounded p-2 text-center"><p className="text-lg font-bold text-red-400">{data.multiConsecCount}</p><p className="text-[10px] text-gray-400">多組連號 ({data.multiConsecRate}%)</p></div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">常見連號組合</p>
          {data.commonPairs.map(p => (
            <div key={p.pair} className="flex justify-between py-0.5 text-sm"><span className="text-pink-300">{p.pair}</span><span className="text-gray-400">{p.count}次</span></div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
