import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hash } from 'lucide-react';

interface Props {
  items: { tail: number; count: number; rate: string }[];
}

export default function DigitTailAnalysis({ items }: Props) {
  const maxCount = Math.max(...items.map(i => i.count));
  return (
    <Card className="border-cyan-800/30 bg-cyan-950/10">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-cyan-400"><Hash className="w-4 h-4" />尾數分析</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.map(item => (
          <div key={item.tail} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-8">尾{item.tail}</span>
            <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
              <div className="h-full bg-cyan-600 rounded-full transition-all" style={{ width: `${(item.count / maxCount) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-300 w-16 text-right">{item.count}次 ({item.rate}%)</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
