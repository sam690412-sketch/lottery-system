// ============================================================
// V19.3.6 Official Data Pipeline Dashboard
// Real-time sync monitoring using backend API
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import {
  Database, ChevronLeft, CheckCircle2, AlertCircle, Shield,
  Clock, RefreshCw, Zap, Hash, Star, TrendingUp, Bug
} from 'lucide-react';

interface SyncStats {
  totalRecords: number;
  byType: Array<{ type: string; count: number; latest: number; earliest: number }>;
  syncSummary: { totalSyncs: string; successSyncs: string; failedSyncs: string };
  recentErrors: Array<Record<string, unknown>>;
}

export default function DataQualityPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/stats');
      const data = await res.json();
      if (data.success) setStats(data);
    } catch { setError('無法載入統計資料'); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const triggerSync = async () => {
    setSyncing(true);
    setResult('');
    try {
      const res = await fetch('/api/sync/draws?forceSeed=true', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setResult(`同步完成：新增 ${data.totalAdded} 筆`);
        fetchStats();
      } else {
        setResult('同步失敗');
      }
    } catch { setResult('同步失敗'); }
    setSyncing(false);
  };

  const totalRecords = stats?.totalRecords || 0;
  const totalSyncs = parseInt(stats?.syncSummary?.totalSyncs || '0', 10);
  const failedSyncs = parseInt(stats?.syncSummary?.failedSyncs || '0', 10);
  const successRate = totalSyncs > 0 ? Math.round((totalSyncs - failedSyncs) / totalSyncs * 100) : 0;

  const typeConfig: Record<string, { label: string; icon: typeof Zap; color: string }> = {
    power:    { label: '威力彩', icon: Zap,   color: 'text-red-400' },
    lotto649: { label: '大樂透', icon: Star,  color: 'text-blue-400' },
    daily539: { label: '今彩539', icon: Hash,  color: 'text-emerald-400' },
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-800/50 transition"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
        <div>
          <h1 className="text-lg font-bold text-gray-100 flex items-center gap-2"><Database className="w-5 h-5 text-cyan-400" />資料同步中心</h1>
          <p className="text-[10px] text-gray-500">官方開獎資料管線監控</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-cyan-800/30 bg-gradient-to-b from-cyan-950/10 to-transparent"><CardContent className="p-3 text-center">
          <div className="text-2xl font-black text-cyan-400">{totalRecords}</div><div className="text-[10px] text-gray-500">總筆數</div>
        </CardContent></Card>
        <Card className="border-emerald-800/30"><CardContent className="p-3 text-center">
          <div className="text-2xl font-black text-emerald-400">{successRate}%</div><div className="text-[10px] text-gray-500">成功率</div>
        </CardContent></Card>
        <Card className="border-gray-800/30"><CardContent className="p-3 text-center">
          <div className="text-2xl font-black text-gray-200">{totalSyncs}</div><div className="text-[10px] text-gray-500">同步次數</div>
        </CardContent></Card>
        <Card className="border-gray-800/30"><CardContent className="p-3 text-center">
          <div className="text-2xl font-black text-gray-200">{failedSyncs}</div><div className="text-[10px] text-gray-500">失敗</div>
        </CardContent></Card>
      </div>

      {/* Sync Button */}
      <button onClick={triggerSync} disabled={syncing}
        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 rounded-xl text-sm font-bold text-white hover:from-cyan-500 hover:to-cyan-400 transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />{syncing ? '同步中...' : '立即同步'}
      </button>
      {result && <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-2 text-center"><p className="text-xs text-emerald-400">{result}</p></div>}
      {error && <div className="bg-red-950/20 border border-red-800/30 rounded-lg p-2 text-center"><p className="text-xs text-red-400">{error}</p></div>}

      {/* Per-lottery Cards */}
      {stats?.byType.map((t) => {
        const cfg = typeConfig[t.type] || { label: t.type, icon: Zap, color: 'text-gray-400' };
        const Icon = cfg.icon;
        return (
          <Card key={t.type} className="border-gray-800/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-4 h-4 ${cfg.color}`} />
                <h3 className="text-sm font-bold text-gray-200">{cfg.label}</h3>
                <Shield className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-gray-900/50 rounded-lg p-2"><div className="text-gray-500">筆數</div><div className="text-lg font-bold text-gray-200">{t.count}</div></div>
                <div className="bg-gray-900/50 rounded-lg p-2"><div className="text-gray-500">最新期</div><div className="text-lg font-bold text-gray-200">{t.latest}</div></div>
              </div>
            </CardContent>
          </Card>
        );
      }) || (
        <div className="text-center py-8 text-gray-500 text-sm">載入中...</div>
      )}

      {/* Sync Log */}
      {stats?.syncSummary && (
        <Card className="border-gray-800/30"><CardContent className="p-4">
          <h3 className="text-sm font-bold text-gray-200 mb-2 flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" />同步摘要</h3>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between"><span className="text-gray-500">總同步</span><span className="text-gray-300">{stats.syncSummary.totalSyncs} 次</span></div>
            <div className="flex justify-between"><span className="text-gray-500">成功</span><span className="text-emerald-400">{stats.syncSummary.successSyncs} 次</span></div>
            <div className="flex justify-between"><span className="text-gray-500">失敗</span><span className="text-red-400">{stats.syncSummary.failedSyncs} 次</span></div>
          </div>
        </CardContent></Card>
      )}

      {/* Recent Errors */}
      {stats?.recentErrors && stats.recentErrors.length > 0 && (
        <Card className="border-red-800/30"><CardContent className="p-4">
          <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-1.5"><Bug className="w-4 h-4" />最近驗證錯誤</h3>
          <div className="space-y-1">
            {stats.recentErrors.slice(0, 5).map((err: any, i) => (
              <div key={i} className="text-[10px] text-red-400 bg-red-950/20 rounded p-1.5">{err.errorType}: {err.message}</div>
            ))}
          </div>
        </CardContent></Card>
      )}

      <button onClick={fetchStats} className="w-full py-2 bg-gray-900 border border-gray-800/50 rounded-xl text-xs text-gray-500 hover:text-gray-300 transition flex items-center justify-center gap-1.5">
        <RefreshCw className="w-3.5 h-3.5" />刷新
      </button>
    </div>
  );
}
