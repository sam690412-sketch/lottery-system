// ============================================================
// V13 會員中心 - 顯示身份/體驗次數/產號次數/VIP方案
// ============================================================
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  getCurrentRole, getCurrentPermissions,
  getDailyCountInfo, getVipTrialStatus,
  upgradeToVip, type UserRole,
} from '@/utils/permissions';
import {
  logout, registerUser, loginUser,
} from '@/utils/auth';
import {
  User, LogIn, LogOut, Crown, Star, AlertTriangle,
  ChevronRight, Gift, Clock, Shield
} from 'lucide-react';

interface MemberPageProps {
  onAdminLogin?: () => void;
}

export default function MemberPage({ onAdminLogin }: MemberPageProps) {
  const [role, setRole] = useState<UserRole>(getCurrentRole());
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refresh, setRefresh] = useState(0);

  const perms = getCurrentPermissions();
  const trial = getVipTrialStatus();
  const daily = getDailyCountInfo();

  useEffect(() => {
    setRole(getCurrentRole());
  }, [refresh]);

  const handleRegister = () => {
    setError(''); setSuccess('');
    if (!email || !password) { setError('請輸入 email 和密碼'); return; }
    if (password.length < 4) { setError('密碼至少4碼'); return; }
    const res = registerUser(email, password, nickname);
    if (res.success) {
      // 自動登入
      const loginRes = loginUser(email, password);
      if (loginRes.success) {
        setSuccess('註冊並登入成功！你是免費會員，享有3次VIP體驗');
        setRole('free');
      }
    } else {
      setError(res.error || '註冊失敗');
    }
  };

  const handleLogin = () => {
    setError(''); setSuccess('');
    const res = loginUser(email, password);
    if (res.success) {
      setSuccess('登入成功！');
      setRole(res.session?.role || 'free');
      setRefresh(r => r + 1);
    } else {
      setError(res.error || '登入失敗');
    }
  };

  const handleLogout = () => {
    logout();
    setRole('guest');
    setEmail(''); setPassword(''); setNickname('');
    setSuccess('已登出');
  };

  const handleUpgrade = (plan: 'monthly' | 'quarterly' | 'yearly') => {
    upgradeToVip(plan);
    setRole('vip');
    setSuccess('已升級為 VIP 會員！');
    setRefresh(r => r + 1);
  };

  // 未登入
  if (role === 'guest') {
    return (
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">會員中心</h1>
          <p className="text-sm text-gray-500">登入以使用更多功能</p>
        </div>

        {/* 風險提醒 */}
        <Alert className="border-gray-700 bg-gray-900/40">
          <AlertTriangle className="w-4 h-4 text-gray-500 shrink-0" />
          <AlertDescription className="text-gray-500 text-xs">
            目前為前端展示版，會員權限存於本機瀏覽器。正式收費版需串接後端資料庫與金流系統。
          </AlertDescription>
        </Alert>

        {/* 訪客提示 */}
        <Alert className="border-amber-800/40 bg-amber-950/20">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <AlertDescription className="text-amber-300 text-sm">
            你目前是訪客身份，僅可使用純統計模式（每日3次）。註冊免費會員即可使用夢境選牌、養號延續，並獲得3次VIP體驗！
          </AlertDescription>
        </Alert>

        {/* 登入/註冊表單 */}
        <Card className="border border-gray-800 bg-gray-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-200 text-lg">
              {mode === 'login' ? '會員登入' : '免費註冊'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <p className="text-sm text-red-400 bg-red-950/30 p-2 rounded">{error}</p>}
            {success && <p className="text-sm text-emerald-400 bg-emerald-950/30 p-2 rounded">{success}</p>}

            <div>
              <Label className="text-gray-300">Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="bg-gray-800 border-gray-700 text-gray-100 mt-1" />
            </div>
            <div>
              <Label className="text-gray-300">密碼</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少4碼" className="bg-gray-800 border-gray-700 text-gray-100 mt-1" />
            </div>
            {mode === 'register' && (
              <div>
                <Label className="text-gray-300">暱稱（選填）</Label>
                <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="暱稱" className="bg-gray-800 border-gray-700 text-gray-100 mt-1" />
              </div>
            )}

            <Button onClick={mode === 'login' ? handleLogin : handleRegister} className="w-full bg-amber-600 hover:bg-amber-500">
              <LogIn className="w-4 h-4 mr-1" />
              {mode === 'login' ? '登入' : '註冊'}
            </Button>

            <p className="text-center text-sm text-gray-500">
              {mode === 'login' ? (
                <>還沒有帳號？ <button onClick={() => { setMode('register'); setError(''); }} className="text-amber-400 hover:underline">免費註冊</button></>
              ) : (
                <>已有帳號？ <button onClick={() => { setMode('login'); setError(''); }} className="text-amber-400 hover:underline">登入</button></>
              )}
            </p>

          </CardContent>
        </Card>

        {/* 方案比較 */}
        <MembershipComparison />

        {/* 管理員 / 測試員登入入口 */}
        <Card className="border border-purple-800/30 bg-gray-900/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  管理員 / 測試員登入
                </p>
                <p className="text-xs text-gray-500">管理後台或無限測試模式</p>
              </div>
              <Button size="sm" onClick={onAdminLogin} className="bg-purple-700 hover:bg-purple-600">
                進入
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 已登入
  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">會員中心</h1>
          <p className="text-sm text-gray-500">管理你的帳號與權限</p>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {error && <Alert className="border-red-800/40 bg-red-950/20"><AlertDescription className="text-red-300">{error}</AlertDescription></Alert>}
      {success && <Alert className="border-emerald-800/40 bg-emerald-950/20"><AlertDescription className="text-emerald-300">{success}</AlertDescription></Alert>}

      {/* 身份卡片 */}
      <Card className={`border ${role === 'vip' ? 'border-amber-700/40 bg-amber-950/10' : role === 'admin' ? 'border-purple-700/40 bg-purple-950/10' : 'border-blue-700/40 bg-blue-950/10'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              role === 'vip' ? 'bg-amber-600' : role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'
            }`}>
              {role === 'vip' ? <Crown className="w-6 h-6 text-white" /> : role === 'admin' ? <Shield className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className={role === 'vip' ? 'bg-amber-600' : role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'}>
                  {perms.label}
                </Badge>
                {role === 'free' && trial.remaining > 0 && (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                    <Gift className="w-3 h-3 mr-1" /> VIP體驗 {trial.remaining}次
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-1">{perms.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 統計資訊 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border border-gray-800 bg-gray-900/60">
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 text-gray-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-200">{daily.used}/{daily.limit === 999 ? '∞' : daily.limit}</p>
            <p className="text-xs text-gray-500">今日產號</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-800 bg-gray-900/60">
          <CardContent className="p-3 text-center">
            <Gift className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-400">{trial.remaining}</p>
            <p className="text-xs text-gray-500">VIP體驗剩餘</p>
          </CardContent>
        </Card>
      </div>

      {/* VIP體驗狀態 */}
      {role === 'free' && (
        <Card className="border border-gray-800 bg-gray-900/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-amber-400" />
              <p className="font-bold text-gray-200">VIP 體驗券</p>
            </div>
            <div className="flex gap-1 mb-2">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                  i <= trial.remaining ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-600'
                }`}>
                  {i <= trial.remaining ? <Star className="w-4 h-4" /> : '✗'}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400">{trial.message}</p>
            {trial.remaining === 0 && (
              <p className="text-xs text-amber-500 mt-1">VIP體驗已使用完畢，升級VIP可繼續使用命理輔助與綜合模式。</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 我的權限 */}
      <Card className="border border-gray-800 bg-gray-900/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-gray-200 text-base">我的權限</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {Object.entries(perms).filter(([k]) => !['label', 'description'].includes(k)).map(([key, val]) => {
            const labelMap: Record<string, string> = {
              maxDailyGenerations: '每日產號上限', canSaveNumbers: '保存養號',
              canUseDream: '夢境選牌', canUseDreamAdvanced: '夢境進階版',
              canUseMetaphysics: '命理輔助', canUseAdvancedOrientation: '進階綜合型',
              canUseAllMode: '綜合模式', canExportCsv: '匯出CSV',
              canViewHistory: '查看紀錄', canViewBacktest: '回測分析',
              canViewModelCompetition: '模型競賽', canUseVipTrial: 'VIP體驗券',
            };
            const label = labelMap[key] || key;
            if (typeof val === 'boolean') {
              return (
                <div key={key} className="flex justify-between py-0.5">
                  <span className="text-gray-400">{label}</span>
                  <span className={val ? 'text-emerald-400' : 'text-gray-600'}>{val ? '✓' : '✗'}</span>
                </div>
              );
            }
            if (typeof val === 'number') {
              return (
                <div key={key} className="flex justify-between py-0.5">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-gray-200">{val === 999 ? '無限' : val}</span>
                </div>
              );
            }
            return null;
          })}
        </CardContent>
      </Card>

      {/* VIP 方案（非VIP顯示） */}
      {role !== 'vip' && role !== 'admin' && (
        <VIPPlans onUpgrade={handleUpgrade} />
      )}

      {/* 管理員入口 */}
      {role === 'admin' && (
        <Button
          onClick={() => window.dispatchEvent(new CustomEvent('v12-navigate', { detail: 'admin' }))}
          className="w-full bg-purple-600 hover:bg-purple-500"
        >
          <Shield className="w-4 h-4 mr-1" /> 進入管理後台
        </Button>
      )}
    </div>
  );
}

// ---- VIP 方案元件 ----
function VIPPlans({ onUpgrade }: { onUpgrade: (plan: 'monthly' | 'quarterly' | 'yearly') => void }) {
  const plans = [
    { key: 'monthly' as const, name: '月費方案', price: 'NT$ 299', period: '/月', desc: '按月計費，隨時可取消', color: 'border-amber-700/40 bg-amber-950/10' },
    { key: 'quarterly' as const, name: '季費方案', price: 'NT$ 799', period: '/季', desc: '平均每月 NT$ 266，省17%', color: 'border-amber-600/40 bg-amber-950/15' },
    { key: 'yearly' as const, name: '年費方案', price: 'NT$ 2,399', period: '/年', desc: '平均每月 NT$ 200，省33%', color: 'border-amber-500/40 bg-amber-950/20' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
        <Crown className="w-5 h-5 text-amber-400" /> 升級 VIP
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {plans.map(p => (
          <Card key={p.key} className={`border ${p.color}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-200">{p.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-amber-400">{p.price}</span>
                    <span className="text-xs text-gray-500">{p.period}</span>
                  </div>
                  <p className="text-xs text-gray-500">{p.desc}</p>
                </div>
                <Button size="sm" onClick={() => onUpgrade(p.key)} className="bg-amber-600 hover:bg-amber-500">
                  模擬升級 <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-gray-600 text-center">正式版將串接金流。目前點擊僅為模擬升級。</p>
    </div>
  );
}

// ---- 方案比較 ----
function MembershipComparison() {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-gray-200">方案比較</h3>
      <div className="space-y-2">
        {([
          { name: '訪客', color: 'text-gray-400', features: ['純統計', '每日3次', '✗夢境', '✗命理', '✗養號'] },
          { name: '免費會員', color: 'text-blue-400', features: ['純統計', '每日10次', '✓夢境', '✓養號', 'VIP體驗3次'] },
          { name: 'VIP會員', color: 'text-amber-400', features: ['全部功能', '無限產號', '✓命理', '✓進階版', '✓回測+CSV'] },
        ]).map(tier => (
          <Card key={tier.name} className="border border-gray-800 bg-gray-900/40">
            <CardContent className="p-3">
              <p className={`font-bold ${tier.color}`}>{tier.name}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {tier.features.map(f => (
                  <span key={f} className="text-xs text-gray-500">{f}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
