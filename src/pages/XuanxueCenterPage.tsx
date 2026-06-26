// ============================================================
// V18.0 MODULE A: AI玄學選號中心
// 整合：夢境解號 / 生日解號 / 手機解號 / 車牌解號 / 發票解號
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trackEvent } from '@/utils/analytics';
import { getCurrentPermissions } from '@/utils/permissions';
import { useSyncExternalStore } from 'react';
import { getBackendAuthSnapshot, subscribeBackendAuthSnapshot } from '@/utils/backendAuthSnapshot';
import { getPermGuardSource, computeBackendPermission } from '@/utils/backendPermission';
import {
  ArrowLeft, Moon, Calendar, Smartphone, Car, Receipt,
  Sparkles, Lock, Crown
} from 'lucide-react';

interface XuanxueMethod {
  id: string;
  name: string;
  desc: string;
  icon: typeof Moon;
  color: string;
  placeholder: string;
  example: string;
}

const METHODS: XuanxueMethod[] = [
  { id: 'dream', name: '夢境解號', desc: '輸入夢境內容，AI轉換為象徵號碼', icon: Moon, color: 'border-indigo-500/40 bg-indigo-950/20 text-indigo-400', placeholder: '例如：夢見大海...', example: '夢見大海' },
  { id: 'birth', name: '生日解號', desc: '輸入生日，計算生命靈數對應號碼', icon: Calendar, color: 'border-rose-500/40 bg-rose-950/20 text-rose-400', placeholder: 'YYYY-MM-DD', example: '1990-05-20' },
  { id: 'phone', name: '手機解號', desc: '輸入手機號碼，取吉利尾數組合', icon: Smartphone, color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400', placeholder: '09XXXXXXXX', example: '0912345678' },
  { id: 'car', name: '車牌解號', desc: '輸入車牌號碼，分析幸運數字', icon: Car, color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-400', placeholder: '例如：ABC-1234', example: 'ABC-1234' },
  { id: 'invoice', name: '發票解號', desc: '輸入統一發票號碼，取中獎能量', icon: Receipt, color: 'border-amber-500/40 bg-amber-950/20 text-amber-400', placeholder: '兩碼英文+八碼數字', example: 'AB-12345678' },
];

export default function XuanxueCenterPage() {
  const navigate = useNavigate();
  // Batch 3d-3b: 灰度。預設 localStorage（行為不變）；flag=backend 時改讀後端快照。
  const permSource = getPermGuardSource();
  const snapshot = useSyncExternalStore(subscribeBackendAuthSnapshot, getBackendAuthSnapshot, getBackendAuthSnapshot);
  const backendPerm = computeBackendPermission(snapshot, 'xuanxue');
  const perms = getCurrentPermissions();
  const canUse = permSource === 'backend'
    ? backendPerm.state === 'allow'
    : perms.canUseXuanxueCenter;
  const [activeMethod, setActiveMethod] = useState<string>('dream');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    if (!input.trim()) return;
    if (!canUse) return;
    setLoading(true);
    trackEvent('xuanxue', activeMethod, input.slice(0, 20));

    setTimeout(() => {
      // 簡單的數字提取邏輯
      const numbers: number[] = [];
      const digits = input.replace(/\D/g, '').split('').map(Number);
      
      // 從輸入中提取數字
      for (let i = 0; i < digits.length && numbers.length < 6; i++) {
        const n = digits[i];
        if (n >= 1 && n <= 39 && !numbers.includes(n)) {
          numbers.push(n);
        }
      }
      
      // 如果不足6個，補充
      while (numbers.length < 6) {
        const n = Math.floor(Math.random() * 39) + 1;
        if (!numbers.includes(n)) numbers.push(n);
      }
      
      setResult(numbers.sort((a, b) => a - b));
      setLoading(false);
    }, 800);
  };

  const currentMethod = METHODS.find(m => m.id === activeMethod) || METHODS[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI玄學選號中心
            </h1>
            <p className="text-xs text-gray-500">夢境 · 生日 · 手機 · 車牌 · 發票</p>
          </div>
        </div>

        {permSource === 'backend' && backendPerm.state === 'loading' ? (
          <Card className="border border-gray-700 bg-gray-800/50 p-8 text-center">
            <p className="text-gray-400 text-sm">驗證中…</p>
          </Card>
        ) : !canUse ? (
          <Card className="border border-gray-700 bg-gray-800/50 p-8 text-center">
            <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            {permSource === 'backend' && backendPerm.message ? (
              <p className="text-amber-300 text-sm mb-2">{backendPerm.message}</p>
            ) : null}
            <p className="text-gray-400 mb-2">請註冊免費會員以使用玄學選號中心</p>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-500" onClick={() => navigate('/member')}>
              <Crown className="w-4 h-4 mr-1" />前往註冊
            </Button>
          </Card>
        ) : (
          <>
            {/* 方法選擇 */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setActiveMethod(m.id); setResult(null); setInput(''); }}
                  className={`p-2 rounded-lg border text-center transition ${
                    activeMethod === m.id ? m.color : 'border-gray-800 bg-gray-800/30 text-gray-500'
                  }`}
                >
                  <m.icon className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-[10px] block">{m.name.replace('解號', '')}</span>
                </button>
              ))}
            </div>

            {/* 輸入區 */}
            <Card className={`border ${currentMethod.color}`}>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-gray-300">{currentMethod.desc}</p>
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={currentMethod.placeholder}
                  className="bg-gray-800 border-gray-700 text-gray-100"
                />
                <p className="text-xs text-gray-600">範例：{currentMethod.example}</p>
                <Button
                  onClick={handleGenerate}
                  disabled={!input.trim() || loading}
                  className="w-full bg-purple-600 hover:bg-purple-500"
                >
                  {loading ? '解號中...' : <><Sparkles className="w-4 h-4 mr-1" />開始解號</>}
                </Button>
              </CardContent>
            </Card>

            {/* 結果 */}
            {result && (
              <Card className="mt-4 border border-purple-700/50 bg-purple-950/20">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-purple-400 mb-2">{currentMethod.name}結果</p>
                  <div className="flex gap-2 justify-center">
                    {result.map((n, i) => (
                      <div key={i} className="w-12 h-12 rounded-full bg-purple-500/20 border-2 border-purple-500/50 flex items-center justify-center text-lg font-bold text-purple-300">
                        {String(n).padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">以上號碼僅供參考，請理性投注</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* 底部返回 */}
        <div className="mt-6">
          <Button onClick={() => navigate('/')} variant="outline" className="w-full border-gray-600 text-gray-400">
            🏠 返回首頁
          </Button>
        </div>
      </div>
    </div>
  );
}
