import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Split } from 'lucide-react';

interface Props {
  data: { oddCount: number; evenCount: number; oddRate: string; evenRate: string; patterns: { pattern: string; count: number; rate: string }[] };
}

export default function OddEvenAnalysis({ data }: Props) {
  return (
    <Card className="border-purple-800/30 bg-purple-950/10">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-purple-400"><Split className="w-4 h-4" />奇偶分析</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800/50 rounded p-3 text-center"><p className="text-2xl font-bold text-purple-300">{data.oddCount}</p><p className="text-xs text-gray-400">奇數 ({data.oddRate}%)</p></div>
          <div className="bg-gray-800/50 rounded p-3 text-center"><p className="text-2xl font-bold text-emerald-300">{data.evenCount}</p><p className="text-xs text-gray-400">偶數 ({data.evenRate}%)</p></div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">常見奇偶組合</p>
          {data.patterns.map(p => (
            <div key={p.pattern} className="flex justify-between py-0.5 text-sm"><span className="text-gray-300">{p.pattern}</span><span className="text-gray-400">{p.count}期 ({p.rate})</span></div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
