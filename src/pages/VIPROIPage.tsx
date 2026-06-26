// ============================================================
// V18.1.2 MODULE 4: VIP ROI 頁面 (Enhanced)
// 展示 VIP 一年的成本效益分析 + Free vs VIP 對比 + 退款保證
// 事件追蹤: trackFirst + trackEvent + Intent Score
// ============================================================
import { useNavigate } from 'react-router';
import { loadJson } from '@/repositories/businessDataStorage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { upgradeToVip, getCurrentRole } from '@/utils/permissions';
import { trackEvent, trackCheckoutStart, trackCheckoutSuccess } from '@/utils/analytics';
import { trackFirst } from '@/utils/behaviorTracker';
import { createPayment, createSubscription } from '@/utils/paymentModel';
import TestModeBanner from '@/components/TestModeBanner';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Calculator, Clock,
  PiggyBank, Target, Check, Shield, Zap, Crown, Gift
} from 'lucide-react';

const ROI_DATA = {
  yearlyCost: 2399,
  monthlyCost: 299,
  weeklyUsage: {
    generations: 15,
    aiRecommendations: 5,
    observationChecks: 10,
    backtestRuns: 2,
  },
  valueEstimate: [
    { feature: '無限產號', freeLimit: '10次/日', vipValue: '無限', monthlyValue: 200 },
    { feature: 'AI推薦x5', freeLimit: '1組/日', vipValue: '5組/日', monthlyValue: 150 },
    { feature: '觀察池50碼', freeLimit: '10碼', vipValue: '50碼', monthlyValue: 100 },
    { feature: '回測分析', freeLimit: '不可用', vipValue: '500期', monthlyValue: 100 },
    { feature: '命理輔助', freeLimit: '3次體驗', vipValue: '無限', monthlyValue: 80 },
    { feature: 'CSV匯出', freeLimit: '不可用', vipValue: '無限', monthlyValue: 50 },
  ],
  timeSaved: {
    perSession: 15,
    sessionsPerWeek: 5,
    yearlyHours: 65,
  },
};

// Free vs VIP 完整對比數據
const FREE_VS_VIP = [
  { feature: '每日產號次數', free: '10次', vip: '無限次', icon: Zap, highlight: true },
  { feature: 'AI推薦組數', free: '1組/日', vip: '5組/日', icon: Zap, highlight: true },
  { feature: '觀察池追蹤碼數', free: '10碼', vip: '50碼', icon: Target, highlight: false },
  { feature: '回測分析期數', free: '0（鎖定）', vip: '500期', icon: Calculator, highlight: true },
  { feature: '命理輔助次數', free: '3次體驗', vip: '無限次', icon: Crown, highlight: false },
  { feature: 'CSV匯出功能', free: '❌ 不可用', vip: '✅ 無限制', icon: Gift, highlight: false },
  { feature: '冷熱號碼分析', free: '基礎版', vip: '進階版+趨勢圖', icon: Target, highlight: false },
  { feature: '廣告顯示', free: '有廣告', vip: '無廣告', icon: Shield, highlight: false },
  { feature: '客服支援', free: '社群支援', vip: '優先客服', icon: Crown, highlight: false },
];

export default function VIPROIPage() {
  const navigate = useNavigate();
  const role = getCurrentRole();
  const isVIP = role === 'vip' || role === 'tester' || role === 'admin';
  const [upgraded, setUpgraded] = useState(false);
  const [intentScore, setIntentScore] = useState<number>(0);

  // 首次訪問追蹤 + Intent Score 讀取
  useEffect(() => {
    trackFirst('first_vip_page_view');
    trackEvent('page_view', 'vip_roi_page', 'view');
    // 讀取當前 Intent Score
    try {
            const saved = loadJson('lottery-v18-intent', null);
      if (saved) {
        const parsed = JSON.parse(saved);
        setIntentScore(parsed.score || 0);
      }
    } catch { /* ignore */ }
  }, []);

  const totalMonthlyValue = ROI_DATA.valueEstimate.reduce((s, v) => s + v.monthlyValue, 0);
  const yearlyValue = totalMonthlyValue * 12;
  const netBenefit = yearlyValue - ROI_DATA.yearlyCost;
  const hourlyValue = Math.round(netBenefit / ROI_DATA.timeSaved.yearlyHours);

  // V18.2: 整合付款模型的升級流程
  const handleUpgrade = (plan: 'monthly' | 'quarterly' | 'yearly') => {
    trackFirst('first_upgrade_click');
    trackEvent('vip_upgrade_click', 'vip_roi_page', plan);
    trackCheckoutStart(plan, plan === 'monthly' ? 299 : plan === 'quarterly' ? 799 : 2399);

    const payment = createPayment('mock-user', plan);
    upgradeToVip(plan);
    const sub = createSubscription('mock-user', plan);
    trackCheckoutSuccess(plan, payment.id);
    trackEvent('payment', 'subscription_activated', JSON.stringify({ paymentId: payment.id, subId: sub.id, plan }));

    setUpgraded(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" /> VIP 成本效益分析
          </h1>
        </div>

        {/* V18.2 AUDIT F: 測試版風險提示 */}
        <TestModeBanner />

        {/* Intent Score 指示器（僅開發模式顯示） */}
        {intentScore > 0 && (
          <div className="mb-3 px-3 py-2 rounded bg-gray-800/30 border border-gray-700/30 flex items-center justify-between">
            <span className="text-[10px] text-gray-500">VIP 意向指數</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    intentScore >= 71 ? 'bg-red-400 w-full' : intentScore >= 31 ? 'bg-amber-400 w-1/2' : 'bg-cyan-400 w-1/4'
                  }`}
                  style={{ width: `${intentScore}%` }}
                />
              </div>
              <span className={`text-[10px] font-bold ${
                intentScore >= 71 ? 'text-red-400' : intentScore >= 31 ? 'text-amber-400' : 'text-cyan-400'
              }`}>{intentScore}</span>
            </div>
          </div>
        )}

        {/* 總結卡片 */}
        <Card className="border border-emerald-700/40 bg-emerald-950/10 mb-4">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-400">年費方案一年淨收益</p>
              <p className="text-3xl font-bold text-emerald-400">NT$ {netBenefit.toLocaleString()}</p>
              <p className="text-xs text-gray-500">投入 NT$ {ROI_DATA.yearlyCost.toLocaleString()}，獲得價值 NT$ {yearlyValue.toLocaleString()}</p>
              <p className="text-[10px] text-cyan-400 mt-1">相當於每年節省 {ROI_DATA.timeSaved.yearlyHours} 小時，每小時價值 NT${hourlyValue}</p>
            </div>
          </CardContent>
        </Card>

        {/* Free vs VIP 完整對比表 */}
        <Card className="border border-gray-700 bg-gray-800/50 mb-4">
          <CardContent className="p-4">
            <h2 className="text-base font-bold text-gray-200 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> 免費 vs VIP 功能對比
            </h2>
            <div className="space-y-0">
              {/* 表頭 */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 py-2 border-b border-gray-700 text-[10px] text-gray-500">
                <span>功能項目</span>
                <span className="w-16 text-center">免費版</span>
                <span className="w-16 text-center text-amber-400">VIP</span>
              </div>
              {FREE_VS_VIP.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.feature}
                    className={`grid grid-cols-[1fr_auto_auto] gap-2 py-2.5 items-center ${
                      idx < FREE_VS_VIP.length - 1 ? 'border-b border-gray-800/50' : ''
                    } ${item.highlight ? 'bg-amber-950/10 -mx-4 px-4' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className={`text-xs ${item.highlight ? 'text-amber-200 font-medium' : 'text-gray-300'}`}>
                        {item.feature}
                      </span>
                    </div>
                    <span className="w-16 text-center text-[10px] text-gray-500 truncate">{item.free}</span>
                    <span className="w-16 text-center text-[10px] text-emerald-400 font-bold truncate">{item.vip}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 功能價值明細 */}
        <Card className="border border-gray-700 bg-gray-800/50 mb-4">
          <CardContent className="p-4">
            <h2 className="text-base font-bold text-gray-200 mb-3 flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-amber-400" /> 功能價值估算
            </h2>
            <div className="space-y-2">
              {ROI_DATA.valueEstimate.map(v => (
                <div key={v.feature} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-sm text-gray-300">{v.feature}</p>
                    <p className="text-[10px] text-gray-600">免費: {v.freeLimit} → VIP: {v.vipValue}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">${v.monthlyValue}/月</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-amber-800/30">
                <span className="text-sm font-bold text-amber-400">每月總價值</span>
                <span className="text-sm font-bold text-amber-400">${totalMonthlyValue}/月</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 時間節省 */}
        <Card className="border border-gray-700 bg-gray-800/50 mb-4">
          <CardContent className="p-4">
            <h2 className="text-base font-bold text-gray-200 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" /> 時間節省
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-900/50 p-2 rounded">
                <p className="text-lg font-bold text-cyan-400">{ROI_DATA.timeSaved.perSession}分</p>
                <p className="text-[10px] text-gray-500">每次產號節省</p>
              </div>
              <div className="bg-gray-900/50 p-2 rounded">
                <p className="text-lg font-bold text-cyan-400">{ROI_DATA.timeSaved.sessionsPerWeek}次</p>
                <p className="text-[10px] text-gray-500">每週產號</p>
              </div>
              <div className="bg-gray-900/50 p-2 rounded">
                <p className="text-lg font-bold text-cyan-400">{ROI_DATA.timeSaved.yearlyHours}小時</p>
                <p className="text-[10px] text-gray-500">每年節省</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 每週使用建議 */}
        <Card className="border border-gray-700 bg-gray-800/50 mb-4">
          <CardContent className="p-4">
            <h2 className="text-base font-bold text-gray-200 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" /> 建議每週使用頻率
            </h2>
            <div className="space-y-2">
              {[
                { label: '產號選號', count: `${ROI_DATA.weeklyUsage.generations}次`, desc: '每次約3分鐘' },
                { label: 'AI推薦查看', count: `${ROI_DATA.weeklyUsage.aiRecommendations}次`, desc: '每日1組' },
                { label: '觀察池檢查', count: `${ROI_DATA.weeklyUsage.observationChecks}次`, desc: '追蹤冷熱變化' },
                { label: '回測驗證', count: `${ROI_DATA.weeklyUsage.backtestRuns}次`, desc: '調整策略' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-400">{item.label}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-300">{item.count}</span>
                    <span className="text-[10px] text-gray-600 ml-1">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 定價方案 */}
        {!isVIP && !upgraded && (
          <Card className="border border-amber-700/40 bg-amber-950/10 mb-4">
            <CardContent className="p-4">
              <h2 className="text-base font-bold text-amber-400 mb-3 text-center">選擇方案</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'monthly' as const, name: '月費', price: '299', period: '/月' },
                  { key: 'quarterly' as const, name: '季費', price: '799', period: '/季', save: '省17%', popular: true },
                  { key: 'yearly' as const, name: '年費', price: '2399', period: '/年', save: '省33%' },
                ].map(p => (
                  <button key={p.key} onClick={() => handleUpgrade(p.key)}
                    className={`p-3 rounded-lg border text-center transition hover:scale-105 ${p.popular ? 'border-amber-500 bg-amber-950/30' : 'border-gray-700 bg-gray-800/30'}`}>
                    {p.popular && <span className="text-[10px] text-amber-400 block">最熱門</span>}
                    <span className="text-sm font-bold text-gray-200">{p.name}</span>
                    <span className="text-lg font-bold text-amber-400 block">${p.price}</span>
                    <span className="text-[10px] text-gray-500">{p.period}</span>
                    {p.save && <span className="text-[10px] text-emerald-400 block">{p.save}</span>}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 7天退款保證 */}
        {!isVIP && !upgraded && (
          <Card className="border border-emerald-700/30 bg-emerald-950/10 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-400">7 天無條件退款保證</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    升級後 7 天內若不滿意，全額退款無需理由。零風險體驗全部 VIP 功能。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {upgraded && (
          <Card className="border border-emerald-700/40 bg-emerald-950/10 mb-4">
            <CardContent className="p-4 text-center">
              <Check className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-emerald-400">模擬升級成功</p>
              <p className="text-xs text-gray-500 mt-1">實際環境將導向金流付款頁面</p>
            </CardContent>
          </Card>
        )}

        {/* 底部導航 */}
        <div className="mt-6 space-y-2">
          <Button
            onClick={() => { trackEvent('nav_click', 'vip_roi_page', 'vip_value_v2'); navigate('/vip-value-v2'); }}
            variant="outline"
            className="w-full border-amber-700/40 text-amber-400 hover:bg-amber-950/20"
          >
            <Crown className="w-4 h-4 mr-2" /> 查看 VIP 完整價值案例
          </Button>
          <Button onClick={() => navigate('/')} variant="outline" className="w-full border-gray-600 text-gray-400">
            🏠 返回首頁
          </Button>
        </div>
      </div>
    </div>
  );
}
