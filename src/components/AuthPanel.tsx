// ============================================================
// V18.2.14 PHASE A: P0 會員系統 - 已遷移到 businessDataStorage
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, LogIn, LogOut, Save, AlertTriangle } from 'lucide-react';
import { loadJson, saveJson, removeKey } from '@/repositories/businessDataStorage';
import { useAuth } from '@/providers/AuthProvider';
import { migrateMember, MigrateError } from '@/api/authClient';
import { sha256 } from '@/utils/auth'; // T04g-1: 唯讀，用於驗證 lottery-v13 舊密碼（不修改 auth.ts）

export interface UserProfile {
  email: string;
  nickname: string;
  plan: 'free' | 'vip';
  createdAt: string;
}

const AUTH_KEY = 'lottery-user-v11';

export function loadUser(): UserProfile | null {
  return loadJson<UserProfile | null>(AUTH_KEY, null);
}

export function saveUser(user: UserProfile) {
  saveJson(AUTH_KEY, user);
}

export function clearUser() {
  removeKey(AUTH_KEY);
}

interface Props {
  onAuthChange: (user: UserProfile | null) => void;
}

export default function AuthPanel({ onAuthChange }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backendError, setBackendError] = useState('');
  const auth = useAuth(); // T03d-1 bridge：後端權威身份（AuthStatusCard 來源）
  const user = loadUser();

  const handleRegister = () => {
    setError('');
    if (!email || !password) { setError('請輸入 email 和密碼'); return; }
    if (password.length < 4) { setError('密碼至少4碼'); return; }
    if (loadJson(`lottery-user-account-${email}`, null)) { setError('此 email 已註冊'); return; }

    const newUser: UserProfile = { email, nickname: nickname || email.split('@')[0], plan: 'free', createdAt: new Date().toISOString() };
    saveJson(`lottery-user-account-${email}`, { email, password });
    saveUser(newUser);
    onAuthChange(newUser);
    setSuccess('註冊成功！');
  };

  const handleLogin = async () => {
    setError(''); setBackendError('');

    // T03d-1: 先嘗試後端登入（權威身份來源）。成功 → AuthProvider 自動 refreshUser，
    // AuthStatusCard 顯示後端 role；此處短路，不再走舊 localStorage（後端帳號如 admin/tester
    // 本就不在 localStorage）。
    const backend = await auth.login(email, password);
    if (backend.success) {
      setSuccess('登入成功！');
      return;
    }
    // 後端失敗：顯示後端錯誤訊息（不得用 localStorage role 補登入到 AuthProvider）。
    setBackendError(backend.error || '後端登入失敗');

    // 舊 localStorage 流程（coexistence）——涵蓋兩套舊系統：
    //   (a) AuthPanel：lottery-user-account-${email}（明文）
    //   (b) auth.ts／lottery-v13-accounts（simpleHash，驅動 gating）— T04g-1
    const stored = loadJson(`lottery-user-account-${email}`, null);
    const authPanelAccount = stored ? JSON.parse(stored) : null;
    const authPanelOk = !!authPanelAccount && authPanelAccount.password === password;

    // T04g-1: 讀 lottery-v13-accounts，以既有 sha256() 唯讀驗證舊密碼。
    let v13Exists = false;
    let v13Ok = false;
    try {
      const v13Raw = localStorage.getItem('lottery-v13-accounts');
      if (v13Raw) {
        const v13 = JSON.parse(v13Raw);
        const v13acc = v13?.[email];
        if (v13acc) {
          v13Exists = true;
          if (v13acc.passwordHash === sha256(password)) v13Ok = true;
        }
      }
    } catch { /* 忽略解析錯誤 */ }

    const accountExists = !!authPanelAccount || v13Exists;
    const verified = authPanelOk || v13Ok;
    if (!verified) {
      setError(accountExists ? '密碼錯誤' : '找不到此帳號，請先註冊');
      return;
    }

    // 舊帳密驗證成功（AuthPanel 或 v13）→ lazy migration。
    // ⚠️ 只送 email/password，絕不送 role/vip/plan/subscription/trial/daily（即使 v13 role=vip/admin）。
    try {
      await migrateMember(email, password);
      const retry = await auth.login(email, password);
      if (retry.success) {
        setSuccess('已完成後端身份遷移');
        return;
      }
      setBackendError('遷移成功，但後端登入失敗');
    } catch (e) {
      if (e instanceof MigrateError && e.status === 429) {
        setBackendError('嘗試過於頻繁，請稍後再試');
        return;
      }
      setBackendError('身份遷移失敗，將以舊方式登入');
    }

    // 過渡：保留舊 AuthPanel UserProfile（一律 free，不搬任何 vip）。
    const profile: UserProfile = { email, nickname: (authPanelAccount?.nickname) || email.split('@')[0], plan: 'free', createdAt: (authPanelAccount?.createdAt) || new Date().toISOString() };
    saveUser(profile);
    onAuthChange(profile);
    setSuccess('登入成功！');
  };

  const handleLogout = async () => {
    await auth.logout(); // T03d-1: 清後端 token → AuthStatusCard 回 guest
    clearUser();
    onAuthChange(null);
    setEmail(''); setPassword(''); setNickname('');
    setBackendError('');
  };

  if (user) {
    return (
      <Card className="border border-green-900/30 bg-gray-900/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-green-400 text-xl">
            <User className="w-6 h-6" />
            會員中心
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded bg-gray-800/40 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">暱稱</span>
              <span className="text-gray-200 font-semibold">{user.nickname}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Email</span>
              <span className="text-gray-200">{user.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">方案</span>
              <Badge className={user.plan === 'vip' ? 'bg-amber-900/30 text-amber-400' : 'bg-gray-700 text-gray-300'}>
                {user.plan === 'vip' ? 'VIP' : '免費'}
              </Badge>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="w-full border-red-700 text-red-400 text-lg min-h-[48px]">
            <LogOut className="w-5 h-5 mr-2" /> 登出
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-blue-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-blue-400 text-xl">
          <LogIn className="w-6 h-6" />
          {mode === 'login' ? '會員登入' : '會員註冊'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-2 rounded bg-blue-950/20 border border-blue-900/20">
          <p className="text-sm text-blue-300/70">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            會員資料僅存於本機 localStorage，不會上傳伺服器。請勿使用真實密碼。
          </p>
        </div>

        <div>
          <Label className="text-base text-gray-300">Email</Label>
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="bg-gray-800 border-gray-700 text-gray-100 text-lg mt-1 min-h-[48px]" />
        </div>

        <div>
          <Label className="text-base text-gray-300">密碼</Label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少4碼" className="bg-gray-800 border-gray-700 text-gray-100 text-lg mt-1 min-h-[48px]" />
        </div>

        {mode === 'register' && (
          <div>
            <Label className="text-base text-gray-300">暱稱（選填）</Label>
            <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="暱稱" className="bg-gray-800 border-gray-700 text-gray-100 text-lg mt-1 min-h-[48px]" />
          </div>
        )}

        {error && <p className="text-red-400 text-base">{error}</p>}
        {backendError && <p className="text-amber-400 text-sm">後端身份驗證：{backendError}</p>}
        {success && <p className="text-green-400 text-base">{success}</p>}

        <Button onClick={mode === 'login' ? handleLogin : handleRegister} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-lg min-h-[48px]">
          <Save className="w-5 h-5 mr-2" /> {mode === 'login' ? '登入' : '註冊'}
        </Button>

        <div className="text-center">
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }} className="text-base text-blue-400 hover:underline">
            {mode === 'login' ? '沒有帳號？點此註冊' : '已有帳號？點此登入'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
