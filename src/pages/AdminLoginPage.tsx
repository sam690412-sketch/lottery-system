// ============================================================
// V13.5 管理員 / 測試員 登入頁面
// 首次登入可改管理員帳號+密碼
// 不顯示任何預設帳號密碼
// 不會自動清除 session - 由 App 統一管理
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { saveSession } from '@/utils/authSession';
import { verifyAdmin, changeAdminUsername } from '@/utils/adminStorage';
import { verifyTester } from '@/utils/testerStorage';
import { Shield, Bug, ChevronLeft, AlertTriangle } from 'lucide-react';

interface Props {
  onLogin: () => void;
  onBack: () => void;
}

export default function AdminLoginPage({ onLogin, onBack }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 強制改帳號+密碼模式
  const [isChanging, setIsChanging] = useState(false);
  const [oldUsername, setOldUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // V13.5: 不再在 mount 時清除 session，由 App 統一管理
  // 這確保使用者導航到其他頁面再回來時，登入狀態不會被誤清除

  // ===== 登入 =====
  const handleLogin = () => {
    setError(''); setSuccess('');
    if (!username || !password) { setError('請輸入帳號和密碼'); return; }

    // 嘗試管理員登入
    const adminResult = verifyAdmin(username, password);
    if (adminResult.success) {
      if (adminResult.needPasswordChange) {
        // 首次登入 → 強制改帳號+密碼
        setOldUsername(username);
        setIsChanging(true);
        return;
      }
      // 管理員登入成功
      saveSession({ userId: `admin-${username}`, username, nickname: '管理員', role: 'admin' });
      onLogin();
      return;
    }

    // 嘗試測試員登入
    const testerResult = verifyTester(username, password);
    if (testerResult.success) {
      saveSession({ userId: `tester-${username}`, username, nickname: username, role: 'tester' });
      onLogin();
      return;
    }

    setError(adminResult.error || testerResult.error || '帳號或密碼錯誤');
  };

  // ===== 強制改帳號+密碼 =====
  const handleChangeUsernamePassword = () => {
    setError(''); setSuccess('');

    // 驗證
    if (!newUsername.trim()) { setError('新管理員帳號不可空白'); return; }
    if (newPw.length < 6) { setError('新密碼至少6碼'); return; }
    if (newPw !== confirmPw) { setError('確認密碼與新密碼不一致'); return; }

    // 執行修改
    const result = changeAdminUsername(oldUsername, password, newUsername.trim(), newPw);
    if (result.success) {
      // V13.5: changeAdminUsername 內部已同步更新 session
      // 這裡直接載入 session 即可
      saveSession({ userId: `admin-${newUsername.trim()}`, username: newUsername.trim(), nickname: '管理員', role: 'admin' });
      setSuccess('管理員帳號與密碼已設定成功');
      onLogin();
    } else {
      setError(result.error || '修改失敗');
    }
  };

  // ===== 強制改帳號+密碼畫面 =====
  if (isChanging) {
    return (
      <div className="space-y-6 pb-24">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-300"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="text-2xl font-bold text-gray-100">設定管理員帳號與密碼</h1>
        </div>
        <Alert className="border-amber-800/40 bg-amber-950/20">
          <AlertDescription className="text-amber-300">
            首次登入必須設定新的管理員帳號與密碼。設定後舊帳號與密碼將永久失效。
          </AlertDescription>
        </Alert>
        <Card className="border border-purple-800/40 bg-gray-900/80">
          <CardContent className="p-4 space-y-3">
            {error && <p className="text-sm text-red-400 bg-red-950/30 p-2 rounded">{error}</p>}
            {success && <p className="text-sm text-emerald-400 bg-emerald-950/30 p-2 rounded">{success}</p>}

            <div>
              <Label className="text-gray-300">舊帳號</Label>
              <Input value={oldUsername} disabled className="bg-gray-800 border-gray-700 text-gray-500 mt-1" />
            </div>
            <div>
              <Label className="text-gray-300">舊密碼</Label>
              <Input value={password} disabled className="bg-gray-800 border-gray-700 text-gray-500 mt-1" />
            </div>
            <div className="border-t border-gray-700 pt-3">
              <Label className="text-gray-300">新管理員帳號 <span className="text-red-400">*</span></Label>
              <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="輸入新管理員帳號" className="bg-gray-800 border-gray-700 text-gray-100 mt-1" />
            </div>
            <div>
              <Label className="text-gray-300">新密碼 <span className="text-red-400">*</span></Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="至少6碼" className="bg-gray-800 border-gray-700 text-gray-100 mt-1" />
            </div>
            <div>
              <Label className="text-gray-300">確認新密碼 <span className="text-red-400">*</span></Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="再次輸入新密碼" className="bg-gray-800 border-gray-700 text-gray-100 mt-1" />
            </div>
            <Button onClick={handleChangeUsernamePassword} className="w-full bg-purple-600 hover:bg-purple-500">
              設定並登入
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== 登入畫面 =====
  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-gray-100">管理員 / 測試員登入</h1>
      </div>

      <Alert className="border-gray-700 bg-gray-900/40">
        <AlertTriangle className="w-4 h-4 text-gray-500 shrink-0" />
        <AlertDescription className="text-gray-500 text-xs">
          目前為前端展示版，帳號資料存於本機瀏覽器。正式版需串接後端資料庫。
        </AlertDescription>
      </Alert>

      {/* 身份說明 */}
      <div className="grid grid-cols-1 gap-3">
        <Card className="border border-purple-800/30 bg-purple-950/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <p className="font-bold text-purple-300">管理員 Admin</p>
            </div>
            <p className="text-sm text-gray-400">可管理會員、VIP、測試員、方案權限。可進入管理後台。</p>
          </CardContent>
        </Card>
        <Card className="border border-emerald-800/30 bg-emerald-950/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bug className="w-5 h-5 text-emerald-400" />
              <p className="font-bold text-emerald-300">測試員 Tester</p>
            </div>
            <p className="text-sm text-gray-400">可無限測試所有選號功能，但不可進入管理後台。</p>
          </CardContent>
        </Card>
      </div>

      {/* 登入表單 */}
      <Card className="border border-gray-800 bg-gray-900/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-gray-200 text-lg">登入</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <Alert className="border-red-800/40 bg-red-950/20"><AlertDescription className="text-red-300">{error}</AlertDescription></Alert>}
          {success && <Alert className="border-emerald-800/40 bg-emerald-950/20"><AlertDescription className="text-emerald-300">{success}</AlertDescription></Alert>}
          <div>
            <Label className="text-gray-300">帳號</Label>
            <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="輸入你的帳號" className="bg-gray-800 border-gray-700 text-gray-100 mt-1" />
          </div>
          <div>
            <Label className="text-gray-300">密碼</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="輸入你的密碼" className="bg-gray-800 border-gray-700 text-gray-100 mt-1" />
          </div>
          <Button onClick={handleLogin} className="w-full bg-purple-600 hover:bg-purple-500">
            <Shield className="w-4 h-4 mr-1" /> 登入
          </Button>
        </CardContent>
      </Card>

      {/* 提示：不顯示預設帳密 */}
      <Card className="border border-gray-800 bg-gray-900/40">
        <CardContent className="p-4">
          <p className="text-sm text-gray-500">
            管理員與測試員帳號請洽系統管理者。
          </p>
          <p className="text-xs text-gray-600 mt-2">
            管理員首次登入後，系統會要求設定新的帳號與密碼。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
