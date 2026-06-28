// ============================================================
// V26-B — 404 找不到頁面
// 未知路徑改顯示此頁,不再靜默回首頁。
// 純呈現 + 用 react-router navigate 導向;不改任何既有邏輯。
// ============================================================
import { useNavigate } from 'react-router';
import { Compass, Home, BarChart3, Sparkles } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  const actions: { label: string; to: string; icon: typeof Home; primary?: boolean }[] = [
    { label: '回首頁', to: '/', icon: Home, primary: true },
    { label: '前往分析中心', to: '/analysis-center', icon: BarChart3 },
    { label: '前往選號分析', to: '/selection-analysis', icon: Sparkles },
  ];

  return (
    <div className="space-y-6 pb-24 text-center py-12">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/60">
          <Compass className="h-8 w-8 text-amber-400" />
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-100">找不到頁面</h1>
        <p className="mt-2 text-sm text-gray-500">你要找的頁面不存在,或連結已失效。</p>
      </div>

      <div className="mx-auto flex max-w-xs flex-col gap-2">
        {actions.map(({ label, to, icon: Icon, primary }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              primary
                ? 'border-amber-500/50 bg-amber-600/20 text-amber-200 hover:bg-amber-600/30'
                : 'border-gray-700 bg-gray-900/50 text-gray-300 hover:border-amber-600/50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
