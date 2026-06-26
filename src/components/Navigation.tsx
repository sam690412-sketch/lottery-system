// ============================================================
// V16-6 底部導航 - 主入口收斂為 5 項：首頁 / 打造號碼 / 我的號碼 / 紀錄 / 會員
// ⚠️ 不刪頁、不刪路由：夢境/命理/統計/AI 等頁仍可由首頁「進階功能」或路由到達。
// ⚠️ PageKey 型別保持不變（其他頁仍用），僅調整底部顯示項目。
// ============================================================
import { Play, Sparkles, Heart, ClipboardList, User } from 'lucide-react';
import { useNavigate } from 'react-router';

export type PageKey = 'home' | 'numbers' | 'dream' | 'metaphysics' | 'statistics' | 'ai-analysis' | 'records' | 'member';

interface Props {
  active: PageKey;
  onChange: (page: PageKey) => void;
  isAdmin?: boolean;
}

// 主導航項目：page-key 型（由 onChange 處理）或 route 型（直接導向，如 Builder）
type NavItem =
  | { kind: 'page'; key: PageKey; label: string; icon: typeof Play }
  | { kind: 'route'; route: string; label: string; icon: typeof Play };

const NAV_ITEMS: NavItem[] = [
  { kind: 'page', key: 'home', label: '首頁', icon: Play },
  { kind: 'route', route: '/builder', label: '打造號碼', icon: Sparkles },
  { kind: 'page', key: 'numbers', label: '我的號碼', icon: Heart },
  { kind: 'page', key: 'records', label: '紀錄', icon: ClipboardList },
  { kind: 'page', key: 'member', label: '會員', icon: User },
];

export default function Navigation({ active, onChange }: Props) {
  const navigate = useNavigate();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-md border-t border-gray-800/50">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {NAV_ITEMS.map(item => {
          const isActive = item.kind === 'page' && item.key === active;
          const Icon = item.icon;
          return (
            <button
              key={item.kind === 'page' ? item.key : item.route}
              onClick={() => (item.kind === 'page' ? onChange(item.key) : navigate(item.route))}
              className={`flex flex-col items-center gap-0.5 px-1 py-2 transition-colors min-w-[2.4rem] ${
                isActive ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
