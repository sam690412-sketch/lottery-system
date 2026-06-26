// ============================================================
// V18.1.2 MODULE 3: TrendChart
// 7天趨勢柱狀圖 (純CSS)
// ============================================================
interface Props {
  data: { label: string; value: number }[];
  maxValue: number;
}

const BAR_COLORS = ['bg-gray-600', 'bg-gray-600', 'bg-gray-600', 'bg-gray-500', 'bg-gray-500', 'bg-purple-500', 'bg-purple-500'];

export default function TrendChart({ data, maxValue }: Props) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => {
        const h = max > 0 ? (d.value / max) * 100 : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-500">{d.value}</span>
            <div className={`w-full ${BAR_COLORS[i]} rounded-t transition-all`} style={{ height: `${Math.max(h, 4)}%` }} />
            <span className="text-[10px] text-gray-600">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
