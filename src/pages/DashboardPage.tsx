// ============================================================
// V18.1.2 MODULE 3: Conversion Dashboard Page
// 整合所有子組件 + 時間切換 + 匯出/重置
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getConversionDashboard, exportDashboardCSV } from '@/utils/analytics';
import { getIntentScore } from '@/utils/intentScore';
import { getFunnel } from '@/utils/funnelAnalytics';
import { getMilestoneStatus } from '@/utils/behaviorTracker';
import MetricCard from '@/components/dashboard/MetricCard';
import FunnelChart from '@/components/dashboard/FunnelChart';
import IntentDistribution from '@/components/dashboard/IntentDistribution';
import TrendChart from '@/components/dashboard/TrendChart';
import { ArrowLeft, RefreshCw, Download, TrendingUp, Snowflake, Thermometer, Flame, Activity } from 'lucide-react';
import { removeKey } from '@/repositories/businessDataStorage';
import AuthStatusCard from '@/components/AuthStatusCard';

const DAYS = ['一', '二', '三', '四', '五', '六', '日'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<'today' | '7d' | '30d'>('7d');

  const db = getConversionDashboard();
  const intent = getIntentScore();
  const funnel = getFunnel();
  const milestones = getMilestoneStatus();

  // 計算趨勢數據 (模擬7天)
  const trendData = DAYS.map((d) => {
    const base = funnel.visitors || 1;
    return { label: d, value: Math.max(0, Math.round(base * (0.5 + Math.random() * 0.8))) };
  });

  // 漏斗數據
  const funnelData = [
    { label: '訪客', value: funnel.visitors, max: funnel.visitors || 1 },
    { label: '註冊', value: funnel.registers, max: funnel.visitors || 1 },
    { label: '首次AI', value: milestones.first_ai_recommend ? 1 : 0, max: 1 },
    { label: 'VIP頁', value: funnel.vipViews, max: funnel.visitors || 1 },
    { label: '升級點', value: funnel.upgradeClicks, max: funnel.visitors || 1 },
    { label: '付費', value: funnel.payments, max: funnel.visitors || 1 },
  ];

  // 計算 KPI
  const vipCTR = funnel.visitors > 0 ? (funnel.vipViews / funnel.visitors * 100).toFixed(1) : '0';
  const upgradeRate = funnel.vipViews > 0 ? (funnel.upgradeClicks / funnel.vipViews * 100).toFixed(1) : '0';
  const paidRate = funnel.upgradeClicks > 0 ? (funnel.payments / funnel.upgradeClicks * 100).toFixed(1) : '0';

  const handleExport = () => {
    const csv = exportDashboardCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lottery-dashboard.csv';
    a.click();
  };

  const handleReset = () => {
    if (confirm('確定要重置所有分析數據嗎？')) {
      removeKey('lottery-v18-funnel');
      removeKey('lottery-v18-behavior');
      removeKey('lottery-v18-analytics');
      removeKey('lottery-v18-intent');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" /> 轉換分析面板
          </h1>
        </div>

        {/* 時間切換 */}
        <div className="flex gap-2">
          {[
            { key: 'today' as const, label: '今日' },
            { key: '7d' as const, label: '近7天' },
            { key: '30d' as const, label: '近30天' },
          ].map(t => (
            <Button key={t.key} size="sm" variant={range === t.key ? 'default' : 'outline'}
              onClick={() => setRange(t.key)}
              className={range === t.key ? 'bg-cyan-600' : 'border-gray-600 text-gray-400'}>
              {t.label}
            </Button>
          ))}
        </div>

        {/* 核心指標卡 */}
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="訪客數" value={funnel.visitors} color="text-gray-300" icon="👥" />
          <MetricCard label="首次AI" value={db.funnel.firstAI || 0} color="text-purple-400" icon="🤖" />
          <MetricCard label="VIP瀏覽" value={funnel.vipViews} color="text-cyan-400" icon="👁" />
          <MetricCard label="升級點擊" value={funnel.upgradeClicks} color="text-amber-400" icon="🖱" />
        </div>

        {/* KPI 卡 */}
        <Card className="border border-gray-700 bg-gray-800/50">
          <CardContent className="p-3">
            <h3 className="text-xs text-gray-500 mb-2 uppercase">關鍵指標</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-lg font-bold text-cyan-400">{vipCTR}%</p><p className="text-[10px] text-gray-500">VIP頁CTR</p></div>
              <div><p className="text-lg font-bold text-amber-400">{upgradeRate}%</p><p className="text-[10px] text-gray-500">升級率</p></div>
              <div><p className="text-lg font-bold text-emerald-400">{paidRate}%</p><p className="text-[10px] text-gray-500">付費轉換</p></div>
            </div>
          </CardContent>
        </Card>

        {/* 漏斗圖 */}
        <Card className="border border-gray-700 bg-gray-800/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3">轉換漏斗</h3>
            <FunnelChart data={funnelData} />
          </CardContent>
        </Card>

        {/* Intent Score */}
        <Card className="border border-gray-700 bg-gray-800/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3">意向分數分布</h3>
            <IntentDistribution
              high={intent.score > 70 ? 1 : 0}
              warm={intent.score >= 31 && intent.score <= 70 ? 1 : 0}
              low={intent.score <= 30 ? 1 : 0}
              avgScore={intent.score}
            />
            <div className="mt-3 text-center">
              <p className="text-xs text-gray-500">
                當前分數: <span className={`font-bold ${intent.score > 70 ? 'text-red-400' : intent.score >= 31 ? 'text-amber-400' : 'text-blue-400'}`}>{intent.score}/100 ({intent.levelLabel})</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* V18.1.3 PHASE C: VIP Intent 用戶分布 */}
        <Card className="border border-gray-700 bg-gray-800/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> Intent 用戶分布
            </h3>
            <div className="space-y-2">
              {db.intent.segments.map(seg => (
                <div key={seg.level} className={`flex items-center justify-between p-2 rounded ${
                  seg.level === 'hot' ? 'bg-red-950/20 border border-red-800/20' :
                  seg.level === 'warm' ? 'bg-amber-950/20 border border-amber-800/20' :
                  'bg-blue-950/20 border border-blue-800/20'
                }`}>
                  <div className="flex items-center gap-2">
                    {seg.level === 'hot' ? <Flame className="w-4 h-4 text-red-400" /> :
                     seg.level === 'warm' ? <Thermometer className="w-4 h-4 text-amber-400" /> :
                     <Snowflake className="w-4 h-4 text-blue-400" />}
                    <div>
                      <p className={`text-xs font-bold ${
                        seg.level === 'hot' ? 'text-red-400' :
                        seg.level === 'warm' ? 'text-amber-400' : 'text-blue-400'
                      }`}>
                        {seg.level === 'hot' ? 'Hot (71-100)' : seg.level === 'warm' ? 'Warm (31-70)' : 'Cold (0-30)'}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        人數: {seg.count} · 比例: {seg.percentage}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500">轉換率</p>
                    <p className={`text-sm font-bold ${
                      seg.level === 'hot' ? 'text-red-400' :
                      seg.level === 'warm' ? 'text-amber-400' : 'text-blue-400'
                    }`}>{seg.upgradeRate}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* V18.1.3 PHASE F: Intent CTR & Upgrade Rate */}
        <Card className="border border-gray-700 bg-gray-800/50">
          <CardContent className="p-3">
            <h3 className="text-xs text-gray-500 mb-2 uppercase">Intent 效能指標</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-blue-400">Cold CTR</p>
                <p className="text-lg font-bold text-blue-300">{db.intentMetrics.coldCTR}%</p>
                <p className="text-[9px] text-gray-600">升級率 {db.intentMetrics.coldUpgradeRate}%</p>
              </div>
              <div>
                <p className="text-[10px] text-amber-400">Warm CTR</p>
                <p className="text-lg font-bold text-amber-300">{db.intentMetrics.warmCTR}%</p>
                <p className="text-[9px] text-gray-600">升級率 {db.intentMetrics.warmUpgradeRate}%</p>
              </div>
              <div>
                <p className="text-[10px] text-red-400">Hot CTR</p>
                <p className="text-lg font-bold text-red-300">{db.intentMetrics.hotCTR}%</p>
                <p className="text-[9px] text-gray-600">升級率 {db.intentMetrics.hotUpgradeRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* V18.1.3 PHASE D: 最近行為 */}
        {db.intent.recentBehaviors.length > 0 && (
          <Card className="border border-gray-700 bg-gray-800/50">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold text-gray-300 mb-3">最近行為記錄</h3>
              <div className="space-y-1.5">
                {db.intent.recentBehaviors.map((b, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        b.score >= 20 ? 'bg-red-400' : b.score >= 10 ? 'bg-amber-400' : 'bg-blue-400'
                      }`} />
                      <span className="text-xs text-gray-300">{b.event}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">+{b.score}分</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 趨勢圖 */}
        <Card className="border border-gray-700 bg-gray-800/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3">7天趨勢 (訪客數)</h3>
            <TrendChart data={trendData} maxValue={Math.max(...trendData.map(d => d.value), 1)} />
          </CardContent>
        </Card>

        {/* 操作按鈕 */}
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" className="flex-1 border-gray-600 text-gray-400">
            <Download className="w-4 h-4 mr-1" /> 匯出 CSV
          </Button>
          <Button onClick={handleReset} variant="outline" className="flex-1 border-red-800 text-red-400 hover:bg-red-950/30">
            <RefreshCw className="w-4 h-4 mr-1" /> 重置
          </Button>
        </div>

        <Button onClick={() => navigate('/')} variant="outline" className="w-full border-gray-600 text-gray-400">🏠 返回首頁</Button>

        {/* T03c-1: 後端身份狀態（純顯示，不參與任何 gating） */}
        <AuthStatusCard />
      </div>
    </div>
  );
}
