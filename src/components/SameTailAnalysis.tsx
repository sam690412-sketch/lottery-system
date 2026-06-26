import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy } from 'lucide-react';

interface Props {
  data: { sameTailDraws: number; sameTailRate: string; commonTails: { tail: number; count: number }[]; commonSameTail: { numbers: string; count: number }[] };
}

export default function SameTailAnalysis({ data }: Props) {
  return (
    <Card className="border-indigo-800/30 bg-indigo-950/10">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-indigo-400"><Copy className="w-4 h-4" />同尾分析</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-300">同尾出現期數: <span className="text-indigo-300 font-bold">{data.sameTailDraws}</span> ({data.sameTailRate}%)</p>
        <div>
          <p className="text-xs text-gray-400 mb-1">常見同尾尾數</p>
          <div className="flex flex-wrap gap-2">
            {data.commonTails.map(t => (
              <span key={t.tail} className="px-2 py-1 rounded bg-indigo-900/40 text-indigo-300 text-xs">尾{t.tail}: {t.count}次</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">常見同尾組合</p>
          {data.commonSameTail.map(c => (
            <div key={c.numbers} className="flex justify-between py-0.5 text-sm"><span className="text-indigo-300">{c.numbers}</span><span className="text-gray-400">{c.count}次</span></div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
