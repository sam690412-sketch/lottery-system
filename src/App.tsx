// ============================================================
// 威力彩13層選號漏斗 V16 - 七彩種最終商業版
// ============================================================
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router';
import type { PageKey } from '@/components/Navigation';
import Navigation from '@/components/Navigation';
import { loadSession, clearSession, validateSessionUser } from '@/utils/authSession';
import { useAuth } from '@/providers/AuthProvider';
import { computeBackendIsAdmin } from '@/utils/adminGuard';
import { getRoleLabel } from '@/utils/permissions';
import type { UserRole } from '@/utils/permissions';
import { AlertTriangle, Shield, Bug, Terminal } from 'lucide-react';
import PwaControls, { useOnline } from '@/pwa/PwaControls';
import V33HomePage from '@/pages/V33HomePage';

const DebugPanel = lazy(() => import('@/components/DebugPanel'));
const HomePage = lazy(() => import('@/pages/HomePage'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const BuilderPage = lazy(() => import('@/pages/BuilderPage'));
const AnalysisCenterPage = lazy(() => import('@/pages/AnalysisCenterPage'));
const PrizeCheckPage = lazy(() => import('@/pages/PrizeCheckPage'));
const MyNumbersPage = lazy(() => import('@/pages/MyNumbersPage'));
const DreamPage = lazy(() => import('@/pages/DreamPage'));
const MetaphysicsPage = lazy(() => import('@/pages/MetaphysicsPage'));
const StatisticsPage = lazy(() => import('@/pages/StatisticsPage'));
const RecordsPage = lazy(() => import('@/pages/RecordsPage'));
const MemberPage = lazy(() => import('@/pages/MemberPage'));
const AdminPanel = lazy(() => import('@/pages/AdminPanel'));
const AdminLoginPage = lazy(() => import('@/pages/AdminLoginPage'));
const CombineLotteryPage = lazy(() => import('@/pages/CombineLotteryPage'));
const CombineAnalysisPage = lazy(() => import('@/pages/CombineAnalysisPage'));
const DigitAnalysisPage = lazy(() => import('@/pages/DigitAnalysisPage'));
const StrategyRankingPage = lazy(() => import('@/pages/StrategyRankingPage'));
const VerificationCenterPage = lazy(() => import('@/pages/VerificationCenterPage'));
const XuanxueCenterPage = lazy(() => import('@/pages/XuanxueCenterPage'));
const VIPPage = lazy(() => import('@/pages/VIPPage'));
const VIPValuePage = lazy(() => import('@/pages/VIPValuePage'));
const VIPValueV2Page = lazy(() => import('@/pages/VIPValueV2Page'));
const VIPROIPage = lazy(() => import('@/pages/VIPROIPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const PaymentPage = lazy(() => import('@/pages/PaymentPage'));
const PaymentResultPage = lazy(() => import('@/pages/PaymentResultPage'));
const AdminPaymentCenterPage = lazy(() => import('@/pages/AdminPaymentCenterPage'));
const AIAnalysisPage = lazy(() => import('@/pages/AIAnalysisPage'));
const LiveDrawPage = lazy(() => import('@/pages/LiveDrawPage'));
const TrendPage = lazy(() => import('@/pages/TrendPage'));
const AIRecommendPage = lazy(() => import('@/pages/AIRecommendPage'));
const PremiumAIPage = lazy(() => import('@/pages/PremiumAIPage'));
const DataQualityPage = lazy(() => import('@/pages/DataQualityPage'));
const SelectionAnalysisPage = lazy(() => import('@/pages/SelectionAnalysisPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

type AppPageKey = PageKey | 'admin' | 'adminlogin' | 'ranking';

function App() {
  const [page, setPage] = useState<AppPageKey>('home');
  const [role, setRole] = useState<UserRole>('guest');
  const [username, setUsername] = useState('');
  const [memberRoleLabel, setMemberRoleLabel] = useState(getRoleLabel);
  const [debugVisible, setDebugVisible] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // ===== V13.5: 掛載時強制從 localStorage 恢復登入狀態 =====
  useEffect(() => {
    const session = loadSession();
    if (session && validateSessionUser(session)) {
      // Session 有效 → 恢復角色和使用者名
      setRole(session.role);
      setUsername(session.username);
    } else {
      // Session 無效或不存在 → 確保清除並保持訪客
      clearSession();
      setRole('guest');
      setUsername('');
    }
    setInitialized(true);

    // V19.3: Initialize historical draw data
    if (!navigator.onLine) return;
    const start = window.setTimeout(() => {
      void import('@/utils/drawSync').then(({ initializeDrawData }) => initializeDrawData()).catch(() => {});
      void import('@/utils/drawSyncScheduler').then(({ autoSyncOnStartup }) => autoSyncOnStartup()).catch(() => {});
    }, window.location.pathname === '/' ? 1800 : 0);
    return () => window.clearTimeout(start);
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const online = useOnline();

  const openLegacyPage = useCallback((target: AppPageKey) => {
    const routes: Partial<Record<AppPageKey, string>> = {
      numbers: '/my-numbers', member: '/member', records: '/records',
    };
    const route = routes[target];
    if (route) {
      navigate(route);
    } else {
      setPage(target);
      if (location.pathname !== '/') navigate('/');
    }
  }, [location.pathname, navigate]);

  // 監聽舊有頁面導航事件
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'numbers') openLegacyPage('numbers');
      if (detail === 'dream') openLegacyPage('dream');
      if (detail === 'metaphysics') openLegacyPage('metaphysics');
      if (detail === 'statistics') openLegacyPage('statistics');
      if (detail === 'records') openLegacyPage('records');
      if (detail === 'ranking') openLegacyPage('ranking');
      if (detail === 'admin') openLegacyPage('admin');
      if (detail === 'member') openLegacyPage('member');
    };
    window.addEventListener('v12-navigate', handler);
    return () => window.removeEventListener('v12-navigate', handler);
  }, [openLegacyPage]);

  // 登入成功回調（從 AdminLoginPage 呼叫）
  const handleLogin = useCallback(() => {
    const session = loadSession();
    if (session && validateSessionUser(session)) {
      setRole(session.role);
      setUsername(session.username);
      if (session.role === 'admin') {
        setPage('admin');
      } else {
        setPage('home');
      }
    }
  }, []);

  // 登出
  const handleLogout = useCallback(() => {
    clearSession();
    setRole('guest');
    setUsername('');
    setPage('home');
  }, []);

  // V13.5: isAdmin / isTester 必須從 role state 計算
  // 不可在每次 render 呼叫 isAdminSession()，否則可能與 state 不同步
  const isTester = role === 'tester';
  useEffect(() => {
    setMemberRoleLabel(getRoleLabel());
  }, [role]);

  // Batch 3b: Admin 外層守衛改用「後端權威」(/api/auth/me)，不再用 localStorage role。
  // backendIsAdmin 僅用於 /admin* 路由准入與 admin 入口顯隱；localStorage isAdmin 僅供其他既有顯示。
  const { role: backendRole, authenticated: backendAuthenticated, loading: authLoading } = useAuth();
  const backendIsAdmin = computeBackendIsAdmin(backendAuthenticated, backendRole);

  const isV16Route = location.pathname.startsWith('/builder') || location.pathname.startsWith('/combine') || location.pathname.startsWith('/analysis') || location.pathname.startsWith('/combine-analysis') || location.pathname.startsWith('/verify') || location.pathname.startsWith('/backtest') || location.pathname.startsWith('/xuanxue') || location.pathname.startsWith('/vip') || location.pathname.startsWith('/vip-value') || location.pathname.startsWith('/vip-roi') || location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/ai-analysis') || location.pathname.startsWith('/live') || location.pathname.startsWith('/trend') || location.pathname.startsWith('/ai-recommend') || location.pathname.startsWith('/premium-ai') || location.pathname.startsWith('/data-quality') || location.pathname.startsWith('/prize-check') || location.pathname.startsWith('/analysis-center') || location.pathname.startsWith('/selection-analysis');

  const renderPage = () => {
    if (location.pathname === '/my-numbers') return <MyNumbersPage />;
    if (location.pathname === '/member') return <MemberPage onRoleLabelChange={setMemberRoleLabel} onAdminLogin={() => openLegacyPage('adminlogin')} />;
    if (location.pathname === '/records') return <RecordsPage />;
    if (location.pathname === '/guided') return <HomePage />;
    if (!online && location.pathname === '/live') {
      return <section className="v33-online-required"><h1>開獎資訊需要網路連線</h1><p>重新連線後即可查看開獎資料。</p><Link to="/">回首頁</Link></section>;
    }

    // PHASE 24: 娛樂版 Landing（/lp 隔離路由，不依賴登入/權限/quota）
    if (location.pathname.startsWith('/lp')) {
      return <LandingPage />;
    }
    // V16 路由頁面（直接返回 Routes，不走狀態切換）
    if (isV16Route) {
      return (
        <Routes>
          <Route path="/builder" element={<BuilderPage />} />
          <Route path="/analysis-center" element={<AnalysisCenterPage />} />
          <Route path="/selection-analysis" element={<SelectionAnalysisPage key={location.search} />} />
          <Route path="/prize-check" element={<PrizeCheckPage />} />
          <Route path="/combine/:lotteryType" element={<CombineLotteryPage />} />
          <Route path="/combine/49" element={<CombineLotteryPage forcedType="lotto49c" />} />
          <Route path="/combine/39" element={<CombineLotteryPage forcedType="daily39c" />} />
          <Route path="/analysis/:lotteryType" element={<DigitAnalysisPage />} />
          <Route path="/combine-analysis/:type" element={<CombineAnalysisPage />} />
          <Route path="/ranking" element={<StrategyRankingPage />} />
          <Route path="/verify" element={<VerificationCenterPage />} />
          <Route path="/backtest" element={<VerificationCenterPage />} />
          <Route path="/xuanxue" element={<XuanxueCenterPage />} />
          <Route path="/vip" element={<VIPPage />} />
          <Route path="/vip-value" element={<VIPValuePage />} />
          <Route path="/vip-value-v2" element={<VIPValueV2Page />} />
          <Route path="/vip-roi" element={<VIPROIPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/payment/result" element={<PaymentResultPage />} />
          <Route path="/admin/payments" element={backendIsAdmin ? <AdminPaymentCenterPage /> : (authLoading ? <div className="text-center py-12 text-gray-400 text-sm">驗證身份中…</div> : <div className="text-center py-12"><p className="text-red-400 text-lg font-bold">你沒有管理員權限</p></div>)} />
          <Route path="/ai-analysis" element={<AIAnalysisPage />} />
          <Route path="/live" element={<LiveDrawPage />} />
          <Route path="/trend" element={<TrendPage />} />
          <Route path="/ai-recommend" element={<AIRecommendPage />} />
          <Route path="/premium-ai" element={<PremiumAIPage />} />
          <Route path="/data-quality" element={<DataQualityPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      );
    }
    // V26-B: 未知 URL 路徑 → 顯示 404,不再靜默回首頁。
    // 狀態式導航(home/numbers/member/admin 等)一律使用根路徑 '/',不受此守衛影響;
    // '/lp' 已在前面處理;V16 路由已在上方 return。
    if (location.pathname !== '/' && !location.pathname.startsWith('/lp')) {
      return <NotFoundPage />;
    }
    // 管理員後台（Batch 3b: 後端權威 admin；loading 時暫停判斷避免閃爍）
    if (page === 'admin' && authLoading) {
      return (
        <div className="space-y-6 pb-24 text-center py-12">
          <p className="text-gray-400 text-sm">驗證身份中…</p>
        </div>
      );
    }
    if (page === 'admin' && backendIsAdmin) {
      return <AdminPanel onLogout={handleLogout} />;
    }
    // 管理員後台權限保護（後端非 admin）
    if (page === 'admin' && !backendIsAdmin) {
      return (
        <div className="space-y-6 pb-24 text-center py-12">
          <p className="text-red-400 text-lg font-bold">你沒有管理員權限</p>
          <p className="text-gray-500 text-sm">
            {isTester ? '測試員只能使用前台功能，不可進入管理後台。' : '請先登入管理員帳號。'}
          </p>
          <button
            onClick={() => setPage('adminlogin')}
            className="text-purple-400 hover:underline block mx-auto mb-2"
          >
            前往管理員登入
          </button>
          <button onClick={() => setPage('home')} className="text-amber-400 hover:underline">
            返回首頁
          </button>
        </div>
      );
    }
    // 管理員/測試員登入頁
    if (page === 'adminlogin') {
      return <AdminLoginPage onLogin={handleLogin} onBack={() => setPage('member')} />;
    }
    // 一般頁面
    switch (page) {
      case 'home': return <V33HomePage />;
      case 'numbers': return <MyNumbersPage />;
      case 'dream': return <DreamPage />;
      case 'metaphysics': return <MetaphysicsPage />;
      case 'statistics': return <StatisticsPage />;
      case 'ai-analysis': return <AIAnalysisPage />;
      case 'records': return <RecordsPage />;
      case 'member': return <MemberPage onRoleLabelChange={setMemberRoleLabel} onAdminLogin={() => setPage('adminlogin')} />;
      case 'ranking': return <StrategyRankingPage />;
      default: return <V33HomePage />;
    }
  };

  // 未初始化時顯示載入中
  if (!initialized) {
    return (
      <div className="v33-shell flex items-center justify-center">
        <p className="text-gray-500 text-sm">載入中...</p>
      </div>
    );
  }

  const home = location.pathname === '/' && page === 'home';

  return (
    <div className="v33-shell">
      <a className="v33-skip" href="#main-content">跳到主要內容</a>
      <header className="v33-topbar">
        <div className="v33-topbar-inner">
          <Link className="v33-brand" to="/" onClick={() => setPage('home')}>
            <img src="/pwa/brand.svg" alt="" width="38" height="38" />
            <span>選號漏斗</span>
          </Link>
          <Navigation placement="desktop" home={home} onHome={() => setPage('home')} />
          <div className="v33-topbar-actions">
            {backendIsAdmin && (
              <button type="button" onClick={() => openLegacyPage('admin')} className="v33-header-control" aria-label="管理後台">
                <Shield size={17} aria-hidden="true" />
              </button>
            )}
            {(backendIsAdmin || isTester || import.meta.env.DEV) && (
              <button type="button" onClick={() => setDebugVisible(true)} className="v33-header-control" aria-label="工作階段診斷">
                <Terminal size={17} aria-hidden="true" />
              </button>
            )}
            <Link className="v33-user-status" to="/member">{isTester && username ? username : memberRoleLabel}</Link>
          </div>
          <PwaControls />
        </div>
      </header>

      {isTester && (
        <div className="v33-tester">
          <Bug size={17} aria-hidden="true" /> 測試員模式，可測試前台功能。
        </div>
      )}

      <main id="main-content" tabIndex={-1} className={home ? 'v33-main v33-main-home' : 'v33-main v33-main-page'}>
        <Suspense fallback={<p className="v33-loading" role="status">載入中…</p>}>
          {renderPage()}
        </Suspense>
      </main>

      <footer className="v33-footer">
        <AlertTriangle size={15} aria-hidden="true" />
        <p>僅供統計與娛樂參考。請理性投注，量力而行。</p>
        <Link to="/records">使用紀錄</Link>
      </footer>

      <Navigation placement="mobile" home={home} onHome={() => setPage('home')} />
      {debugVisible && <Suspense fallback={null}><DebugPanel visible onClose={() => setDebugVisible(false)} /></Suspense>}
    </div>
  );
}

export default App;
