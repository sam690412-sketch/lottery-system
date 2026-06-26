import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown } from 'lucide-react';

interface Props {
  data: { bigCount: number; smallCount: number; bigRate: string; smallRate: string; threshold: number; patterns: { pattern: string; count: number; rate: string }[] };
}

export default function BigSmallAnalysis({ data }: Props) {
  return (
    <Card className="border-green-800/30 bg-green-950/10">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-green-400"><ArrowUpDown className="w-4 h-4" />大小分析 (分界: {data.threshold})</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800/50 rounded p-3 text-center"><p className="text-2xl font-bold text-green-300">{data.bigCount}</p><p className="text-xs text-gray-400">大號 ({data.bigRate}%)</p></div>
          <div className="bg-gray-800/50 rounded p-3 text-center"><p className="text-2xl font-bold text-teal-300">{data.smallCount}</p><p className="text-xs text-gray-400">小號 ({data.smallRate}%)</p></div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">常見大小組合</p>
          {data.patterns.map(p => (
            <div key={p.pattern} className="flex justify-between py-0.5 text-sm"><span className="text-gray-300">{p.pattern}</span><span className="text-gray-400">{p.count}期 ({p.rate})</span></div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
