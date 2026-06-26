// ============================================================
// V18.1.2 MODULE 3: MetricCard
// 核心指標卡片
// ============================================================
interface Props {
  label: string;
  value: number;
  color: string;
  icon: string;
}

export default function MetricCard({ label, value, color, icon }: Props) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}
