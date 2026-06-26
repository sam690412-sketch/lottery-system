// ============================================================
// V18.1.2 MODULE 3: FunnelChart
// CSS 漏斗圖
// ============================================================
interface Props {
  data: { label: string; value: number; max: number }[];
}

const COLORS = ['bg-emerald-500/60', 'bg-cyan-500/60', 'bg-blue-500/60', 'bg-purple-500/60', 'bg-amber-500/60', 'bg-rose-500/60'];

export default function FunnelChart({ data }: Props) {
  return (
    <div className="space-y-2">
      {data.map((item, i) => {
        const pct = item.max > 0 ? (item.value / item.max) * 100 : 0;
        const width = Math.max(15, pct);
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-20 text-right shrink-0">{item.label}</span>
            <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden relative">
              <div className={`h-full ${COLORS[i % COLORS.length]} rounded-full transition-all`} style={{ width: `${width}%` }} />
              <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-200 font-bold">
                {item.value} ({pct.toFixed(1)}%)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
