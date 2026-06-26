// ============================================================
// V18.1.2 MODULE 3: IntentDistribution
// 意向分數分布 3列卡片
// ============================================================
interface Props {
  high: number;
  warm: number;
  low: number;
  avgScore: number;
}

export default function IntentDistribution({ high, warm, low, avgScore }: Props) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-red-950/20 border border-red-700/40 rounded-lg p-3 text-center">
          <p className="text-lg">🔥</p>
          <p className="text-xs text-gray-400">高意圖</p>
          <p className="text-xl font-bold text-red-400">{high}</p>
          <p className="text-[10px] text-gray-600">score &gt; 70</p>
        </div>
        <div className="bg-amber-950/20 border border-amber-700/40 rounded-lg p-3 text-center">
          <p className="text-lg">🌡️</p>
          <p className="text-xs text-gray-400">溫意圖</p>
          <p className="text-xl font-bold text-amber-400">{warm}</p>
          <p className="text-[10px] text-gray-600">31-70</p>
        </div>
        <div className="bg-blue-950/20 border border-blue-700/40 rounded-lg p-3 text-center">
          <p className="text-lg">❄️</p>
          <p className="text-xs text-gray-400">低意圖</p>
          <p className="text-xl font-bold text-blue-400">{low}</p>
          <p className="text-[10px] text-gray-600">0-30</p>
        </div>
      </div>
      <p className="text-center text-xs text-gray-500 mt-2">平均意向分數: <span className="text-gray-300 font-bold">{avgScore}</span></p>
    </div>
  );
}
