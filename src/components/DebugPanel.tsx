// ============================================================
// V13.5 Debug Panel - 顯示 Auth Session 資訊
// 用於驗證登入狀態是否正確保存到 localStorage
// ============================================================
import { useState, useEffect } from 'react';
import { loadJson } from '@/repositories/businessDataStorage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSessionInfo, clearSession } from '@/utils/authSession';
import { Terminal, Trash2, RefreshCw } from 'lucide-react';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function DebugPanel({ visible, onClose }: Props) {
  const [info, setInfo] = useState(getSessionInfo());
  const [localStorageKeys, setLocalStorageKeys] = useState<string[]>([]);

  const refresh = () => {
    setInfo(getSessionInfo());
    setLocalStorageKeys(Object.keys(localStorage).filter(k => k.startsWith('lottery-')));
  };

  useEffect(() => {
    if (visible) refresh();
  }, [visible]);

  if (!visible) return null;

  const handleClearSession = () => {
    clearSession();
    refresh();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-gray-900 border-t border-gray-700 rounded-t-xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-gray-100">Debug Session</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={refresh} className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <RefreshCw className="w-3 h-3 mr-1" /> 刷新
            </Button>
            <Button size="sm" variant="outline" onClick={handleClearSession} className="border-red-800 text-red-400 hover:bg-red-950/30">
              <Trash2 className="w-3 h-3 mr-1" /> 清除
            </Button>
            <Button size="sm" onClick={onClose} className="bg-gray-700 hover:bg-gray-600">關閉</Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Session 狀態總覽 */}
          <Card className={`border ${info.isValid ? 'border-emerald-700 bg-emerald-950/10' : 'border-red-700 bg-red-950/10'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className={info.isValid ? 'text-emerald-400' : 'text-red-400'}>
                  {info.isValid ? '● Session 有效' : '● Session 無效'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-500">username:</div>
                <div className="text-gray-200 font-mono">{info.username || '(empty)'}</div>

                <div className="text-gray-500">role:</div>
                <div>
                  <Badge className={
                    info.role === 'admin' ? 'bg-purple-600' :
                    info.role === 'tester' ? 'bg-emerald-600' :
                    info.role === 'vip' ? 'bg-amber-600' :
                    info.role === 'free' ? 'bg-blue-600' :
                    'bg-gray-600'
                  }>
                    {info.role || 'guest'}
                  </Badge>
                </div>

                <div className="text-gray-500">userId:</div>
                <div className="text-gray-200 font-mono text-xs">{info.userId || '(empty)'}</div>

                <div className="text-gray-500">loginAt:</div>
                <div className="text-gray-200 font-mono text-xs">{info.loginAt || '(empty)'}</div>

                <div className="text-gray-500">expiresAt:</div>
                <div className="text-gray-200 font-mono text-xs">{info.expiresAt || '(empty)'}</div>

                <div className="text-gray-500">isValid:</div>
                <div className={info.isValid ? 'text-emerald-400' : 'text-red-400'}>
                  {info.isValid ? 'true' : 'false'}
                </div>

                <div className="text-gray-500">isExpired:</div>
                <div className={info.isExpired ? 'text-red-400' : 'text-emerald-400'}>
                  {info.isExpired ? 'true' : 'false'}
                </div>

                <div className="text-gray-500">storageKey:</div>
                <div className="text-gray-200 font-mono text-xs">{info.storageKey}</div>

                <div className="text-gray-500">exists:</div>
                <div className={info.exists ? 'text-emerald-400' : 'text-red-400'}>
                  {info.exists ? 'true' : 'false'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Raw JSON */}
          <Card className="border border-gray-700 bg-gray-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-gray-500">Raw JSON (lottery-auth-session)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap break-all font-mono">
                {info.raw || '(null - no session found)'}
              </pre>
            </CardContent>
          </Card>

          {/* LocalStorage Keys */}
          <Card className="border border-gray-700 bg-gray-900/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-gray-500">lottery-* Keys in localStorage</CardTitle>
            </CardHeader>
            <CardContent>
              {localStorageKeys.length === 0 ? (
                <p className="text-xs text-gray-600">無 lottery-* key</p>
              ) : (
                <div className="space-y-1">
                  {localStorageKeys.map(key => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-mono">{key}</span>
                      <Badge variant="outline" className="border-emerald-700 text-emerald-400 text-[10px]">
                        {(loadJson(key, '') as string)?.length || 0} chars
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 操作提示 */}
          <p className="text-xs text-gray-600 text-center">
            此面板僅供開發除錯使用。正式版不會顯示。
          </p>
        </div>
      </div>
    </div>
  );
}
