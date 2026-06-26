// ============================================================
// V18.0 MODULE E: VIP頁面
// 展示VIP可解鎖功能、產號次數、觀察池容量、AI推薦數量
// ============================================================
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentPermissions, getCurrentRole, upgradeToVip } from '@/utils/permissions';
import { trackEvent, trackCheckoutStart, trackCheckoutSuccess } from '@/utils/analytics';
import { trackFirst } from '@/utils/behaviorTracker';
import { createPayment, createSubscription } from '@/utils/paymentModel';
import TestModeBanner from '@/components/TestModeBanner';
import { useState } from 'react';
import {
  Crown, ArrowLeft, Sparkles, BarChart3, Brain, Eye,
  Check, Zap
} from 'lucide-react';

const FEATURES = [
  { icon: Zap, name: '無限產號', free: '每日10次', vip: '無限次', desc: '不再受限每日產號次數' },
  { icon: Brain, name: 'AI推薦 x5', free: '每日1組', vip: '每日5組', desc: '更多AI智能推薦組合' },
  { icon: Eye, name: '觀察池 50碼', free: '10碼容量', vip: '50碼容量', desc: '追蹤更多號碼的冷熱變化' },
  { icon: BarChart3, name: '歷史回測', free: false, vip: true, desc: '100/300/500期回測驗證' },
  { icon: Sparkles, name: '命理輔助', free: false, vip: true, desc: '八字+紫微+梅花易數' },
  { icon: Brain, name: '綜合模式', free: false, vip: true, desc: '統計+夢境+命理全開' },
  { icon: BarChart3, name: '匯出CSV', free: false, vip: true, desc: '下載選號紀錄與分析' },
  { icon: Sparkles, name: '進階夢境', free: false, vip: true, desc: '5大學派夢境解析' },
];

const PLANS = [
  { key: 'monthly' as const, name: '月費', price: 'NT$ 299', period: '/月', save: '', popular: false },
  { key: 'quarterly' as const, name: '季費', price: 'NT$ 799', period: '/季', save: '省17%', popular: true },
  { key: 'yearly' as const, name: '年費', price: 'NT$ 2,399', period: '/年', save: '省33%', popular: false },
];

export default function VIPPage() {
  const navigate = useNavigate();
  const perms = getCurrentPermissions();
  const role = getCurrentRole();
  const isVIP = role === 'vip' || role === 'tester' || role === 'admin';
  const [upgraded, setUpgraded] = useState(false);

  // V18.1.1: VIP頁面瀏覽追蹤
  useState(() => { trackFirst('first_vip_page_view'); });

  // V18.2: 整合付款模型的升級流程
  const handleUpgrade = (plan: 'monthly' | 'quarterly' | 'yearly') => {
    trackEvent('vip_upgrade_click', 'vip_page', plan);
    trackFirst('first_upgrade_click');
    trackCheckoutStart(plan, plan === 'monthly' ? 299 : plan === 'quarterly' ? 799 : 2399);

    // 1. 建立付款記錄
    const payment = createPayment('mock-user', plan);

    // 2. 執行升級
    upgradeToVip(plan);

    // 3. 建立訂閱
    const sub = createSubscription('mock-user', plan);

    // 4. 更新付款狀態
    trackCheckoutSuccess(plan, payment.id);
    trackCheckoutStart(plan, 0); // mark as processed
    trackEvent('payment', 'checkout_success_mock', JSON.stringify({ paymentId: payment.id, subId: sub.id, plan }));

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
            <Crown className="w-5 h-5 text-amber-400" /> VIP 會員
          </h1>
        </div>

        {/* V18.2 AUDIT F: 測試版風險提示 */}
        <TestModeBanner />

        {/* VIP 狀態 */}
        {isVIP ? (
          <Card className="border border-amber-700/40 bg-amber-950/10 mb-4">
            <CardContent className="p-4 text-center">
              <Crown className="w-12 h-12 text-amber-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-amber-400">你已是 VIP 會員</p>
              <p className="text-sm text-gray-400">享有全部功能，無限制使用</p>
            </CardContent>
          </Card>
        ) : upgraded ? (
          <Card className="border border-emerald-700/40 bg-emerald-950/10 mb-4">
            <CardContent className="p-4 text-center">
              <Check className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-emerald-400">模擬升級成功！</p>
              <p className="text-sm text-gray-400">你已成為VIP會員（前端模擬）</p>
              <Button size="sm" className="mt-2 bg-emerald-600" onClick={() => navigate('/')}>
                返回首頁體驗VIP功能
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-amber-700/40 bg-gradient-to-br from-amber-950/20 to-gray-900/80 mb-4">
            <CardContent className="p-4">
              <p className="text-center text-amber-400 font-bold mb-3">升級 VIP 解鎖全部功能</p>
              <div className="grid grid-cols-3 gap-2">
                {PLANS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => handleUpgrade(p.key)}
                    className={`p-3 rounded-lg border text-center transition hover:scale-105 ${
                      p.popular ? 'border-amber-500 bg-amber-950/30' : 'border-gray-700 bg-gray-800/30'
                    }`}
                  >
                    {p.popular && <span className="text-[10px] text-amber-400 block">最熱門</span>}
                    <span className="text-sm font-bold text-gray-200">{p.name}</span>
                    <span className="text-lg font-bold text-amber-400 block">{p.price.replace('NT$ ', '')}</span>
                    <span className="text-[10px] text-gray-500">{p.period}</span>
                    {p.save && <span className="text-[10px] text-emerald-400 block">{p.save}</span>}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 text-center mt-2">點擊方案即模擬升級（正式版將串接金流）</p>
            </CardContent>
          </Card>
        )}

        {/* 功能對比 */}
        <Card className="border border-gray-700 bg-gray-800/50 mb-4">
          <CardContent className="p-4">
            <h2 className="text-base font-bold text-gray-200 mb-3">VIP 功能一覽</h2>
            <div className="space-y-2">
              {FEATURES.map(f => (
                <div key={f.name} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                  <f.icon className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{f.name}</p>
                    <p className="text-xs text-gray-600">{f.desc}</p>
                  </div>
                  <div className="text-right">
                    {typeof f.free === 'boolean' ? (
                      <>
                        <span className="text-xs text-gray-600 mr-2">{f.free ? '✓' : '✗'}</span>
                        <span className="text-xs text-amber-400">✓</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-500 mr-2">{f.free}</span>
                        <span className="text-xs text-amber-400 font-bold">{f.vip}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 當前權限 */}
        {!isVIP && (
          <Card className="border border-gray-700 bg-gray-800/50">
            <CardContent className="p-4">
              <h2 className="text-base font-bold text-gray-200 mb-2">你的當前權限</h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-900/50 p-2 rounded text-center">
                  <p className="text-gray-500">每日產號</p>
                  <p className="text-lg font-bold text-gray-300">{perms.maxDailyGenerations === 999 ? '∞' : perms.maxDailyGenerations}</p>
                </div>
                <div className="bg-gray-900/50 p-2 rounded text-center">
                  <p className="text-gray-500">AI推薦</p>
                  <p className="text-lg font-bold text-gray-300">{perms.maxAIGenerations}組/日</p>
                </div>
                <div className="bg-gray-900/50 p-2 rounded text-center">
                  <p className="text-gray-500">觀察池</p>
                  <p className="text-lg font-bold text-gray-300">{perms.maxObservationPool}碼</p>
                </div>
                <div className="bg-gray-900/50 p-2 rounded text-center">
                  <p className="text-gray-500">玄學中心</p>
                  <p className="text-lg font-bold text-gray-300">{perms.canUseXuanxueCenter ? '✓' : '✗'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6">
          <Button onClick={() => navigate('/')} variant="outline" className="w-full border-gray-600 text-gray-400">
            🏠 返回首頁
          </Button>
        </div>
      </div>
    </div>
  );
}
