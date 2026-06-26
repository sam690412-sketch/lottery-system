// ============================================================
// V14.0 組合分析 - 熱門/冷門/連號/同尾組合TOP20
// ============================================================
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingDown, Link, Copy } from 'lucide-react';

interface ComboItem {
  rank: number;
  combo: string;
  count: number;
  rate: string;
}

interface Props {
  hotCombos: ComboItem[];
  coldCombos: ComboItem[];
  consecCombos: ComboItem[];
  sameTailCombos: ComboItem[];
}

function ComboCard({ title, icon: Icon, color, items, borderColor }: {
  title: string; icon: typeof Trophy; color: string; borderColor: string; items: ComboItem[];
}) {
  return (
    <Card className={`${borderColor}`}>
      <CardHeader className="pb-2"><CardTitle className={`text-sm flex items-center gap-2 ${color}`}><Icon className="w-4 h-4" />{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {items.slice(0, 10).map(item => (
          <div key={item.rank} className="flex items-center justify-between py-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-6">#{item.rank}</span>
              <span className="text-gray-300 font-mono">{item.combo}</span>
            </div>
            <span className="text-gray-400 text-xs">{item.count}次 ({item.rate})</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function ComboAnalysis({ hotCombos, coldCombos, consecCombos, sameTailCombos }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-200">組合分析 TOP20</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ComboCard title="熱門組合 TOP20" icon={Trophy} color="text-red-400" borderColor="border-red-800/30 bg-red-950/10" items={hotCombos} />
        <ComboCard title="冷門組合 TOP20" icon={TrendingDown} color="text-blue-400" borderColor="border-blue-800/30 bg-blue-950/10" items={coldCombos} />
        <ComboCard title="連號組合 TOP20" icon={Link} color="text-pink-400" borderColor="border-pink-800/30 bg-pink-950/10" items={consecCombos} />
        <ComboCard title="同尾組合 TOP20" icon={Copy} color="text-indigo-400" borderColor="border-indigo-800/30 bg-indigo-950/10" items={sameTailCombos} />
      </div>
    </div>
  );
}
