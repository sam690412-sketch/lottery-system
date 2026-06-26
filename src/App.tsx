// ============================================================
// 威力彩13層選號漏斗 V16 - 七彩種最終商業版
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router';
import type { PageKey } from '@/components/Navigation';
import Navigation from '@/components/Navigation';
import HomePage from '@/pages/HomePage';
import LandingPage from '@/pages/LandingPage';
import BuilderPage from '@/pages/BuilderPage';
import MyNumbersPage from '@/pages/MyNumbersPage';
import DreamPage from '@/pages/DreamPage';
import MetaphysicsPage from '@/pages/MetaphysicsPage';
import StatisticsPage from '@/pages/StatisticsPage';
import RecordsPage from '@/pages/RecordsPage';
import MemberPage from '@/pages/MemberPage';
import AdminPanel from '@/pages/AdminPanel';
import AdminLoginPage from '@/pages/AdminLoginPage';
import CombineLotteryPage from '@/pages/CombineLotteryPage';
import CombineAnalysisPage from '@/pages/CombineAnalysisPage';
import DigitAnalysisPage from '@/pages/DigitAnalysisPage';
import StrategyRankingPage from '@/pages/StrategyRankingPage';
import VerificationCenterPage from '@/pages/VerificationCenterPage';
import XuanxueCenterPage from '@/pages/XuanxueCenterPage';
import VIPPage from '@/pages/VIPPage';
import VIPValuePage from '@/pages/VIPValuePage';
import VIPValueV2Page from '@/pages/VIPValueV2Page';
import VIPROIPage from '@/pages/VIPROIPage';
import DashboardPage from '@/pages/DashboardPage';
import PaymentPage from '@/pages/PaymentPage';
import PaymentResultPage from '@/pages/PaymentResultPage';
import AdminPaymentCenterPage from '@/pages/AdminPaymentCenterPage';
import AIAnalysisPage from '@/pages/AIAnalysisPage';
import LiveDrawPage from '@/pages/LiveDrawPage';
import TrendPage from '@/pages/TrendPage';
import AIRecommendPage from '@/pages/AIRecommendPage';
import PremiumAIPage from '@/pages/PremiumAIPage';
import DataQualityPage from '@/pages/DataQualityPage';
import DebugPanel from '@/components/DebugPanel';
import { initializeDrawData } from '@/utils/drawSync';
import { autoSyncOnStartup } from '@/utils/drawSyncScheduler';
import { loadSession, clearSession, validateSessionUser } from '@/utils/authSession';
import { useAuth } from '@/providers/AuthProvider';
import { computeBackendIsAdmin } from '@/utils/adminGuard';
import { getRoleLabel } from '@/utils/permissions';
import type { UserRole } from '@/utils/permissions';
import { AlertTriangle, Shield, Bug, Terminal } from 'lucide-react';

type AppPageKey = PageKey | 'admin' | 'adminlogin' | 'ranking';

function App() {
  const [page, setPage] = useState<AppPageKey>('home');
  const [role, setRole] = useState<UserRole>('guest');
  const [username, setUsername] = useState('');
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
    initializeDrawData().catch(() => {});
    // V19.3.5: Auto-sync on startup if due
    autoSyncOnStartup().catch(() => {});
  }, []);

  // 監聽導航事件
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'numbers') setPage('numbers');
      if (detail === 'dream') setPage('dream');
      if (detail === 'metaphysics') setPage('metaphysics');
      if (detail === 'statistics') setPage('statistics');
      if (detail === 'records') setPage('records');
      if (detail === 'ranking') setPage('ranking');
      if (detail === 'admin') setPage('admin');
      if (detail === 'member') setPage('member');
    };
    window.addEventListener('v12-navigate', handler);
    return () => window.removeEventListener('v12-navigate', handler);
  }, []);

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
  const isAdmin = role === 'admin';
  const isTester = role === 'tester';

  // Batch 3b: Admin 外層守衛改用「後端權威」(/api/auth/me)，不再用 localStorage role。
  // backendIsAdmin 僅用於 /admin* 路由准入與 admin 入口顯隱；localStorage isAdmin 僅供其他既有顯示。
  const { role: backendRole, authenticated: backendAuthenticated, loading: authLoading } = useAuth();
  const backendIsAdmin = computeBackendIsAdmin(backendAuthenticated, backendRole);

  const location = useLocation();
  const navigate = useNavigate();
  const isV16Route = location.pathname.startsWith('/combine') || location.pathname.startsWith('/analysis') || location.pathname.startsWith('/combine-analysis') || location.pathname.startsWith('/verify') || location.pathname.startsWith('/backtest') || location.pathname.startsWith('/xuanxue') || location.pathname.startsWith('/vip') || location.pathname.startsWith('/vip-value') || location.pathname.startsWith('/vip-roi') || location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/ai-analysis') || location.pathname.startsWith('/live') || location.pathname.startsWith('/trend') || location.pathname.startsWith('/ai-recommend') || location.pathname.startsWith('/premium-ai') || location.pathname.startsWith('/data-quality');

  const renderPage = () => {
    // PHASE 24: 娛樂版 Landing（/lp 隔離路由，不依賴登入/權限/quota）
    if (location.pathname.startsWith('/lp')) {
      return <LandingPage />;
    }
    // V16 路由頁面（直接返回 Routes，不走狀態切換）
    if (isV16Route) {
      return (
        <Routes>
          <Route path="/builder" element={<BuilderPage />} />
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
        </Routes>
      );
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
      case 'home': return <HomePage />;
      case 'numbers': return <MyNumbersPage />;
      case 'dream': return <DreamPage />;
      case 'metaphysics': return <MetaphysicsPage />;
      case 'statistics': return <StatisticsPage />;
      case 'ai-analysis': return <AIAnalysisPage />;
      case 'records': return <RecordsPage />;
      case 'member': return <MemberPage onAdminLogin={() => setPage('adminlogin')} />;
      case 'ranking': return <StrategyRankingPage />;
      default: return <HomePage />;
    }
  };

  // 未初始化時顯示載入中
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">載入中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-gray-100">
      {/* 頂部標題列 */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">13</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-100 leading-tight">選號漏斗</h1>
              <p className="text-[10px] text-gray-500 leading-tight">V14.1</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Debug 按鈕（小且隱蔽） */}
            <button
              onClick={() => setDebugVisible(true)}
              className="text-gray-600 hover:text-amber-400 transition"
              title="Debug Session"
            >
              <Terminal className="w-3 h-3" />
            </button>
            {backendIsAdmin && (
              <button onClick={() => setPage('admin')} className="text-purple-400 hover:text-purple-300 transition">
                <Shield className="w-4 h-4" />
              </button>
            )}
            {isTester && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Bug className="w-3 h-3" />
                <span className="text-xs">{username}</span>
              </span>
            )}
            <span className={`text-xs ${
              isAdmin ? 'text-purple-400' : isTester ? 'text-emerald-400' : role === 'vip' ? 'text-amber-400' : 'text-gray-500'
            }`}>
              {getRoleLabel()}
            </span>
          </div>
        </div>
      </header>

      {/* 免責聲明 */}
      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="flex items-start gap-1.5 px-3 py-2 rounded bg-gray-900/40 border border-gray-800/40">
          <AlertTriangle className="w-3 h-3 text-gray-600 mt-0.5 shrink-0" />
          <p className="text-[10px] text-gray-600 leading-relaxed">
            本系統僅為統計分析與娛樂輔助工具，無法預測中獎。請理性投注，量力而行。
          </p>
        </div>
      </div>

      {/* 測試員模式提示 */}
      {isTester && (
        <div className="max-w-lg mx-auto px-4 pt-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-emerald-950/20 border border-emerald-800/30">
            <Bug className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-400">
              測試員模式：你可以無限測試所有功能，但無管理權限。
            </p>
          </div>
        </div>
      )}

      {/* 主內容 */}
      <main className="max-w-lg mx-auto px-4 pt-4">
        {renderPage()}
      </main>

      {/* V16.4 驗證中心快速入口 */}
      <div className="fixed bottom-20 right-4 z-40">
        <button
          onClick={() => navigate('/verify')}
          className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/20 flex items-center justify-center text-lg hover:scale-110 transition-transform"
          title="開獎驗證中心"
        >🏆</button>
      </div>

      {/* 底部導航 */}
      <div className="h-16" />
      <Navigation active={page as PageKey} onChange={(p) => setPage(p as AppPageKey)} />

      {/* Debug Panel */}
      <DebugPanel visible={debugVisible} onClose={() => setDebugVisible(false)} />
    </div>
  );
}

export default App;
