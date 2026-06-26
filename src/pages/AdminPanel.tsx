// ============================================================
// V13.3 管理員後台 - 測試員管理 + localStorage 持久化
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loadAdminAuthSession, saveAdminAuthSession, loadAdminAccountsRaw, saveAdminAccountsRaw } from '@/repositories/businessDataStorage';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { clearSession } from '@/utils/authSession';
import {
  getAllAdmins, changeAdminPassword, addAdmin, deleteAdmin,
  setAdminActive, changeAdminUsername, type AdminAccount,
} from '@/utils/adminStorage';
import {
  getAllTesters, addTester, changeTesterPassword, updateTester,
  setTesterActive, deleteTester, type TesterAccount,
} from '@/utils/testerStorage';
import {
  Shield, Users, Key, Trash2, RefreshCw, Ban, Check, ChevronLeft,
  UserCog, Plus, Bug, AlertTriangle, CreditCard,
} from 'lucide-react';

type AdminTab = 'members' | 'testers' | 'admins' | 'payments';

interface Member {
  id: string; email: string; nickname: string; role: string;
  vipTrialRemaining: number; dailyGenerateCount: number;
  isActive: boolean; createdAt: string;
}

interface Props {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: Props) {
  const [tab, setTab] = useState<AdminTab>('testers');
  const navigate = useNavigate();
  const [testers, setTesters] = useState<TesterAccount[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [members] = useState<Member[]>([
    { id: '1', email: 'user1@test.com', nickname: 'User1', role: 'free', vipTrialRemaining: 3, dailyGenerateCount: 2, isActive: true, createdAt: '2026-06-09' },
    { id: '2', email: 'user2@test.com', nickname: 'User2', role: 'vip', vipTrialRemaining: 0, dailyGenerateCount: 5, isActive: true, createdAt: '2026-06-08' },
    { id: '3', email: 'user3@test.com', nickname: 'User3', role: 'free', vipTrialRemaining: 0, dailyGenerateCount: 0, isActive: false, createdAt: '2026-06-07' },
  ]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 修改密碼
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');

  // 新增測試員
  const [newName, setNewName] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [newNick, setNewNick] = useState('');
  const [newNote, setNewNote] = useState('');

  // 從 localStorage 載入資料
  const loadData = () => {
    setTesters(getAllTesters());
    setAdmins(getAllAdmins());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChangePassword = () => {
    setError(''); setSuccess('');
    const result = changeAdminPassword('admin', oldPw, newPw);
    if (result.success) {
      setSuccess('管理員密碼已修改');
      setOldPw(''); setNewPw('');
      loadData();
    } else {
      setError(result.error || '修改失敗');
    }
  };

  const handleAddTester = () => {
    setError(''); setSuccess('');
    if (!newName || !newPw2) { setError('請輸入帳號和密碼'); return; }
    if (newPw2.length < 4) { setError('密碼至少4碼'); return; }
    if (addTester(newName, newPw2, newNick, newNote)) {
      setSuccess(`已新增測試員 ${newName}`);
      setNewName(''); setNewPw2(''); setNewNick(''); setNewNote('');
      loadData();
    } else {
      setError('帳號已存在');
    }
  };

  const handleResetTesterPw = (username: string) => {
    const pw = window.prompt(`輸入 ${username} 的新密碼（至少4碼）：`);
    if (!pw || pw.length < 4) { setError('密碼至少4碼'); return; }
    changeTesterPassword(username, pw);
    setSuccess(`已重設 ${username} 的密碼`);
    loadData();
  };

  const handleToggleTester = (username: string) => {
    const t = getAllTesters().find(x => x.username === username);
    if (t) {
      setTesterActive(username, !t.isActive);
      setSuccess(`已${!t.isActive ? '啟用' : '停用'} ${username}`);
      loadData();
    }
  };

  const handleDeleteTester = (username: string) => {
    if (!window.confirm(`確定刪除測試員 ${username}？`)) return;
    deleteTester(username);
    setSuccess(`已刪除測試員 ${username}`);
    loadData();
  };

  const handleEditTester = (username: string) => {
    const t = getAllTesters().find(x => x.username === username);
    if (!t) return;
    const nick = window.prompt('修改暱稱：', t.nickname);
    const note = window.prompt('修改備註：', t.note);
    updateTester(username, { nickname: nick || undefined, note: note || undefined });
    setSuccess(`已更新 ${username}`);
    loadData();
  };

  const handleLogout = () => {
    clearSession();
    onLogout();
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => window.dispatchEvent(new CustomEvent('v12-navigate', { detail: 'member' }))} className="text-gray-500 hover:text-gray-300">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-100">管理後台</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-600">admin</Badge>
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400 underline">登出</button>
        </div>
      </div>

      <Alert className="border-amber-800/40 bg-amber-950/20">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <AlertDescription className="text-amber-300 text-sm">
          目前為前端展示版，帳號資料存於本機瀏覽器（lottery-admin-accounts, lottery-tester-accounts）。正式版需串接後端資料庫。
        </AlertDescription>
      </Alert>

      {error && <Alert className="border-red-800/40 bg-red-950/20"><AlertDescription className="text-red-300">{error}</AlertDescription></Alert>}
      {success && <Alert className="border-emerald-800/40 bg-emerald-950/20"><AlertDescription className="text-emerald-300">{success}</AlertDescription></Alert>}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={tab === 'members' ? 'default' : 'outline'} onClick={() => setTab('members')} className={tab === 'members' ? 'bg-purple-600' : 'border-gray-700 text-gray-400'}>
          <Users className="w-4 h-4 mr-1" /> 會員管理
        </Button>
        <Button size="sm" variant={tab === 'testers' ? 'default' : 'outline'} onClick={() => setTab('testers')} className={tab === 'testers' ? 'bg-emerald-600' : 'border-gray-700 text-gray-400'}>
          <Bug className="w-4 h-4 mr-1" /> 測試員管理
        </Button>
        <Button size="sm" variant={tab === 'admins' ? 'default' : 'outline'} onClick={() => setTab('admins')} className={tab === 'admins' ? 'bg-purple-600' : 'border-gray-700 text-gray-400'}>
          <UserCog className="w-4 h-4 mr-1" /> 管理員帳號
        </Button>
        <Button size="sm" variant={tab === 'payments' ? 'default' : 'outline'} onClick={() => setTab('payments')} className={tab === 'payments' ? 'bg-amber-600' : 'border-gray-700 text-gray-400'}>
          <CreditCard className="w-4 h-4 mr-1" /> 付款中心
        </Button>
      </div>

      {/* 會員管理 */}
      {tab === 'members' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">共 {members.length} 位會員</p>
          {members.map(m => (
            <Card key={m.id} className={`border ${!m.isActive ? 'border-red-800/30 bg-red-950/5' : 'border-gray-800 bg-gray-900/60'}`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-200 text-sm">{m.nickname}</span>
                      <Badge className={m.role === 'vip' ? 'bg-amber-600' : 'bg-blue-600'}>{m.role}</Badge>
                      {!m.isActive && <Badge variant="outline" className="border-red-500/40 text-red-400">已停用</Badge>}
                    </div>
                    <p className="text-xs text-gray-500">{m.email}</p>
                    <p className="text-xs text-gray-600 mt-1">VIP體驗剩餘：{m.vipTrialRemaining} | 今日產號：{m.dailyGenerateCount}/10 | 註冊：{m.createdAt}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <button onClick={() => setSuccess('已切換等級')} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-amber-400 transition">{m.role === 'vip' ? '降級Free' : '升級VIP'}</button>
                  <button onClick={() => setSuccess('已重設')} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-amber-400 transition"><RefreshCw className="w-3 h-3 inline mr-1" />重設體驗</button>
                  <button onClick={() => setSuccess('已重設')} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-blue-400 transition"><RefreshCw className="w-3 h-3 inline mr-1" />重設次數</button>
                  <button onClick={() => setSuccess('已切換狀態')} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-red-400 transition"><Ban className="w-3 h-3 inline mr-1" />停用</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 測試員管理 */}
      {tab === 'testers' && (
        <div className="space-y-4">
          {/* 新增測試員 */}
          <Card className="border border-emerald-800/30 bg-gray-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-emerald-400 text-base flex items-center gap-2"><Plus className="w-4 h-4" /> 新增測試員</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="帳號" className="bg-gray-800 border-gray-700 text-gray-100" />
                <Input type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} placeholder="密碼（至少4碼）" className="bg-gray-800 border-gray-700 text-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input value={newNick} onChange={e => setNewNick(e.target.value)} placeholder="暱稱（選填）" className="bg-gray-800 border-gray-700 text-gray-100" />
                <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="備註（選填）" className="bg-gray-800 border-gray-700 text-gray-100" />
              </div>
              <Button size="sm" onClick={handleAddTester} className="bg-emerald-600 hover:bg-emerald-500">新增測試員</Button>
            </CardContent>
          </Card>

          {/* 測試員列表 */}
          <p className="text-sm text-gray-500">共 {testers.length} 位測試員（存於 lottery-tester-accounts）</p>
          {testers.map(t => (
            <Card key={t.username} className={`border ${!t.isActive ? 'border-red-800/30 bg-red-950/5' : 'border-gray-800 bg-gray-900/60'}`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Bug className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-gray-200 text-sm">{t.nickname || t.username}</span>
                      <Badge className="bg-emerald-600">tester</Badge>
                      {!t.isActive && <Badge variant="outline" className="border-red-500/40 text-red-400">已停用</Badge>}
                    </div>
                    <p className="text-xs text-gray-500">帳號：{t.username}</p>
                    {t.note && <p className="text-xs text-gray-600">備註：{t.note}</p>}
                    <p className="text-xs text-gray-600">建立：{t.createdAt.split('T')[0]}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <button onClick={() => handleEditTester(t.username)} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-blue-400 transition">編輯</button>
                  <button onClick={() => handleResetTesterPw(t.username)} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-amber-400 transition"><Key className="w-3 h-3 inline mr-1" />改密碼</button>
                  <button onClick={() => handleToggleTester(t.username)} className={`text-xs px-2 py-1 rounded bg-gray-800 transition ${t.isActive ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-emerald-400'}`}>{t.isActive ? <Ban className="w-3 h-3 inline mr-1" /> : <Check className="w-3 h-3 inline mr-1" />}{t.isActive ? '停用' : '啟用'}</button>
                  <button onClick={() => handleDeleteTester(t.username)} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-red-400 transition"><Trash2 className="w-3 h-3 inline mr-1" />刪除</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 管理員帳號 */}
      {tab === 'admins' && (
        <div className="space-y-4">
          {/* 新增管理員 */}
          <Card className="border border-purple-800/30 bg-gray-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-400 text-base flex items-center gap-2"><Plus className="w-4 h-4" /> 新增管理員</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <AdminAddForm onSuccess={() => { setSuccess('已新增管理員'); loadData(); }} onError={setError} />
            </CardContent>
          </Card>

          {/* 修改自己密碼 */}
          <Card className="border border-purple-800/30 bg-gray-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-400 text-base flex items-center gap-2"><Key className="w-4 h-4" /> 修改我的密碼</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="舊密碼" className="bg-gray-800 border-gray-700 text-gray-100" />
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="新密碼（至少6碼）" className="bg-gray-800 border-gray-700 text-gray-100" />
              <Button size="sm" onClick={handleChangePassword} className="bg-purple-600 hover:bg-purple-500">修改密碼</Button>
            </CardContent>
          </Card>

          {/* 管理員列表 */}
          <div className="space-y-2">
            <p className="text-sm text-gray-500">管理員列表（存於 lottery-admin-accounts）</p>
            {admins.map(a => (
              <AdminItem
                key={a.username}
                admin={a}
                onUpdate={() => { setSuccess('已更新'); loadData(); }}
                onError={setError}
              />
            ))}
          </div>
        </div>
      )}

      {/* 付款中心 */}
      {tab === 'payments' && (
        <div className="space-y-4">
          <Card className="border border-amber-800/30 bg-gray-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-400 text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> 付款管理中心
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">查看付款紀錄、訂閱狀態、退款申請與付款統計。</p>
              <Button
                size="sm"
                onClick={() => navigate('/admin/payments')}
                className="bg-amber-600 hover:bg-amber-500"
              >
                <CreditCard className="w-4 h-4 mr-1" />
                進入付款管理中心
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ===== 新增管理員表單 =====
function AdminAddForm({ onSuccess, onError }: { onSuccess: () => void; onError: (msg: string) => void }) {
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [nick, setNick] = useState('');

  const handleAdd = () => {
    if (!name || !pw) { onError('請輸入帳號和密碼'); return; }
    if (pw.length < 6) { onError('密碼至少6碼'); return; }
    if (addAdmin(name, pw, nick)) {
      setName(''); setPw(''); setNick('');
      onSuccess();
    } else {
      onError('帳號已存在');
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="帳號" className="bg-gray-800 border-gray-700 text-gray-100" />
        <Input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="密碼（至少6碼）" className="bg-gray-800 border-gray-700 text-gray-100" />
      </div>
      <Input value={nick} onChange={e => setNick(e.target.value)} placeholder="暱稱（選填）" className="bg-gray-800 border-gray-700 text-gray-100" />
      <Button size="sm" onClick={handleAdd} className="bg-purple-600 hover:bg-purple-500">新增管理員</Button>
    </div>
  );
}

// ===== 管理員項目 =====
function AdminItem({
  admin,
  onUpdate,
  onError,
}: {
  admin: AdminAccount;
  onUpdate: () => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(admin.username);
  const [oldPw, setOldPw] = useState('');

  const isSelf = (() => {
    try {
      const s = JSON.parse(loadAdminAuthSession() || '{}');
      return s.username === admin.username;
    } catch { return false; }
  })();

  const handleChangeUsername = () => {
    if (!newUsername.trim()) { onError('帳號不可空白'); return; }
    if (newUsername === admin.username) { setEditing(false); return; }
    if (!oldPw) { onError('請輸入目前密碼確認'); return; }

    const result = changeAdminUsername(admin.username, oldPw, newUsername.trim(), oldPw);
    if (result.success) {
      // 如果改的是自己，同步更新 session
      if (isSelf) {
        const s = JSON.parse(loadAdminAuthSession() || '{}');
        s.username = newUsername.trim();
        s.userId = `admin-${newUsername.trim()}`;
        saveAdminAuthSession(s);
      }
      setEditing(false);
      setOldPw('');
      onUpdate();
    } else {
      onError(result.error || '修改失敗');
    }
  };

  const handleChangePw = () => {
    const pw = window.prompt(`輸入 ${admin.username} 的新密碼（至少6碼）：`);
    if (!pw || pw.length < 6) { onError('密碼至少6碼'); return; }

    const accounts = JSON.parse(loadAdminAccountsRaw() || '{}');
    if (accounts[admin.username]) {
      accounts[admin.username].passwordHash = 'hash-placeholder'; // 實際會由 changeAdminPassword 處理
      saveAdminAccountsRaw(accounts);
    }
    // 使用正確的函數
    import('@/utils/auth').then(({ sha256 }) => {
      const acc = JSON.parse(loadAdminAccountsRaw() || '{}');
      if (acc[admin.username]) {
        acc[admin.username].passwordHash = sha256(pw);
        saveAdminAccountsRaw(acc);
        onUpdate();
      }
    });
  };

  const handleToggle = () => {
    if (isSelf) { onError('不能停用自己'); return; }
    if (setAdminActive(admin.username, !admin.isActive)) {
      onUpdate();
    } else {
      onError('至少需要保留一個啟用中的管理員');
    }
  };

  const handleDelete = () => {
    if (isSelf) { onError('不能刪除自己'); return; }
    if (!window.confirm(`確定刪除管理員 ${admin.username}？`)) return;
    if (deleteAdmin(admin.username)) {
      onUpdate();
    } else {
      onError('至少需要保留一名管理員');
    }
  };

  return (
    <div className="p-3 rounded-lg bg-gray-900/40 border border-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Shield className="w-4 h-4 text-purple-400" />
          {editing ? (
            <>
              <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-32 bg-gray-800 border-gray-700 text-gray-100 h-8 text-sm" />
              <Input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="目前密碼確認" className="w-40 bg-gray-800 border-gray-700 text-gray-100 h-8 text-sm" />
              <Button size="sm" onClick={handleChangeUsername} className="h-7 text-xs bg-emerald-600">儲存</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-7 text-xs border-gray-700">取消</Button>
            </>
          ) : (
            <>
              <span className="font-bold text-gray-200 text-sm">{admin.nickname || admin.username}</span>
              <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-400">admin</Badge>
              {admin.mustChangePassword && <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">需改密碼</Badge>}
              {!admin.isActive && <Badge variant="outline" className="text-xs border-red-500/40 text-red-400">已停用</Badge>}
              {isSelf && <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400">目前</Badge>}
            </>
          )}
        </div>
        {!editing && (
          <div className="flex gap-1">
            <button onClick={() => setEditing(true)} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-blue-400 transition">改帳號</button>
            <button onClick={handleChangePw} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-amber-400 transition">改密碼</button>
            <button onClick={handleToggle} className={`text-xs px-2 py-1 rounded bg-gray-800 transition ${admin.isActive ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-emerald-400'}`}>{admin.isActive ? '停用' : '啟用'}</button>
            <button onClick={handleDelete} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-red-400 transition"><Trash2 className="w-3 h-3" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
