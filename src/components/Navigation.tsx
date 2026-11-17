import { ChartNoAxesCombined, Heart, House, Sparkles, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router';

export type PageKey = 'home' | 'numbers' | 'dream' | 'metaphysics' | 'statistics' | 'ai-analysis' | 'records' | 'member';

const NAV_ITEMS = [
  { to: '/', label: '首頁', shortLabel: '首頁', icon: House },
  { to: '/builder', label: '打造號碼', shortLabel: '打造', icon: Sparkles },
  { to: '/analysis-center', label: 'AI 分析', shortLabel: '分析', icon: ChartNoAxesCombined },
  { to: '/my-numbers', label: '我的收藏', shortLabel: '收藏', icon: Heart },
  { to: '/member', label: '會員中心', shortLabel: '會員', icon: UserRound },
];

const ANALYSIS_ROUTES = ['/selection-analysis', '/analysis', '/ai-analysis', '/combine-analysis', '/trend'];

interface NavigationProps {
  placement: 'desktop' | 'mobile';
  home: boolean;
  onHome: () => void;
}

export default function Navigation({ placement, home, onHome }: NavigationProps) {
  const { pathname } = useLocation();
  const desktop = placement === 'desktop';
  const analysisRoute = ANALYSIS_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));

  return (
    <nav className={desktop ? 'v33-navigation-desktop hidden md:block' : 'v33-navigation-mobile md:hidden'} aria-label="主要導覽">
      <div className="v33-nav-inner">
        {NAV_ITEMS.map(({ to, label, shortLabel, icon: Icon }) => {
          const active = to === '/' ? home : pathname === to || (to === '/analysis-center' && analysisRoute);
          return (
            <Link key={to} to={to} aria-current={active ? 'page' : undefined} aria-label={label}
              onClick={to === '/' ? onHome : undefined}>
              <span className="v33-nav-icon"><Icon size={20} aria-hidden="true" /></span>
              <span>{desktop ? label : shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
