import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

interface Props {
  data: { avgSum: number; maxSum: number; minSum: number; commonRange: string; distribution: { range: string; count: number }[] };
}

export default function SumAnalysis({ data }: Props) {
  return (
    <Card className="border-yellow-800/30 bg-yellow-950/10">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-yellow-400"><Calculator className="w-4 h-4" />和值分析</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800/50 rounded p-2 text-center"><p className="text-lg font-bold text-yellow-300">{data.avgSum}</p><p className="text-[10px] text-gray-400">平均值</p></div>
          <div className="bg-gray-800/50 rounded p-2 text-center"><p className="text-lg font-bold text-red-400">{data.maxSum}</p><p className="text-[10px] text-gray-400">最高</p></div>
          <div className="bg-gray-800/50 rounded p-2 text-center"><p className="text-lg font-bold text-blue-400">{data.minSum}</p><p className="text-[10px] text-gray-400">最低</p></div>
        </div>
        <p className="text-xs text-gray-400">最常見區間: <span className="text-yellow-300">{data.commonRange}</span></p>
        <div>
          <p className="text-xs text-gray-400 mb-1">和值分布</p>
          {data.distribution.map(d => (
            <div key={d.range} className="flex justify-between py-0.5 text-sm"><span className="text-gray-300">{d.range}</span><span className="text-gray-400">{d.count}期</span></div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
