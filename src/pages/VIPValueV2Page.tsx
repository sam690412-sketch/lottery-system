// ============================================================
// V18.1.2 MODULE 2: VIP Value Page V2
// 9個區塊：痛點→案例→比較→FAQ→CTA
// ============================================================
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { upgradeToVip, getCurrentRole } from '@/utils/permissions';
import { trackEvent, trackCheckoutStart, trackCheckoutSuccess } from '@/utils/analytics';
import { trackFirst } from '@/utils/behaviorTracker';
import { createPayment, createSubscription } from '@/utils/paymentModel';
import TestModeBanner from '@/components/TestModeBanner';
import { useState } from 'react';
import {
  Crown, ArrowLeft, Lock, TrendingUp, Brain, Eye,
  Sparkles, BarChart3, Quote, Check, X, ChevronDown, ChevronUp
} from 'lucide-react';

// ── Block 2-6: 案例數據 ──
const CASES = [
  { icon: Brain, color: 'border-purple-700/40 bg-purple-950/20', tag: 'AI推薦 x5 組/日', user: '台中張小姐', quote: 'AI 推薦每天給我 5 組號碼，我選信心度最高的 2 組下注。三獎和四獎的次數明顯比亂選多。', result: '三獎+四獎次數提升' },
  { icon: Eye, color: 'border-cyan-700/40 bg-cyan-950/20', tag: '觀察池 50 碼', user: '台北李先生', quote: '追蹤了 23 個號碼三個月，發現 #07 和 #29 的出現週期約 15 天。調整下注時機後，小獎命中率高了不少。', result: '追蹤 23 碼 · 發現週期規律' },
  { icon: Sparkles, color: 'border-indigo-700/40 bg-indigo-950/20', tag: '夢境 5 學派解析', user: '高雄王先生', quote: '夢到蛇之後用夢境解號，結合統計分析選了 6 個號碼。那期中了 4 個號碼，感覺很神奇。', result: '單期命中 4 碼' },
  { icon: Sparkles, color: 'border-rose-700/40 bg-rose-950/20', tag: '八字+紫微+梅花易數', user: '台南陳小姐', quote: '用八字分析我的財運日，搭配紫微斗數選號。在財運日下注，感覺運氣真的比較好。', result: '財運日選號策略' },
  { icon: BarChart3, color: 'border-emerald-700/40 bg-emerald-950/20', tag: '100/300/500期回測', user: '新竹林先生', quote: '回測功能讓我驗證了「觀察池加權確實比純統計好」。100期回測顯示命中率差異 +6%。', result: '命中率差異 +6%' },
];

// ── Block 7: 功能比較 ──
const COMPARE = [
  { feature: '每日產號', free: '10次', vip: '無限次', freeOk: false, vipOk: true },
  { feature: 'AI推薦', free: '1組/日(前2碼)', vip: '5組/日(完整6碼)', freeOk: false, vipOk: true },
  { feature: '觀察池容量', free: '10碼', vip: '50碼', freeOk: false, vipOk: true },
  { feature: '夢境解析', free: '基礎', vip: '5大學派', freeOk: false, vipOk: true },
  { feature: '命理輔助', free: '不可', vip: '八字+紫微+梅花', freeOk: false, vipOk: true },
  { feature: '回測分析', free: '不可', vip: '100/300/500期', freeOk: false, vipOk: true },
  { feature: '玄學中心', free: '可用', vip: '可用', freeOk: true, vipOk: true },
  { feature: 'CSV匯出', free: '不可', vip: '可用', freeOk: false, vipOk: true },
];

// ── Block 8: FAQ ──
const FAQS = [
  { q: 'VIP 真的能提高中獎率嗎？', a: 'VIP 提供數據分析工具幫助您做出更科學的選號決策，但彩票本質上是隨機遊戲，我們保證工具的價值，不保證中獎。' },
  { q: '如果不滿意可以退款嗎？', a: '首次訂閱 7 天內可申請全額退款，無需理由。' },
  { q: '年費和月費有什麼區別？', a: '年費省 33%，相當於每月只要 NT$200。功能完全相同。' },
  { q: '免費會員的數據會保留嗎？', a: '會，所有觀察池和養號數據在您升級後完整保留。' },
  { q: '可以隨時取消嗎？', a: '可以，隨時在會員中心取消，取消後仍可使用到當期結束。' },
];

export default function VIPValueV2Page() {
  const navigate = useNavigate();
  const role = getCurrentRole();
  const isVIP = role === 'vip' || role === 'tester' || role === 'admin';
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [upgraded, setUpgraded] = useState(false);

  // V18.2: 整合付款模型的升級流程
  const handleUpgrade = (plan: 'monthly' | 'quarterly' | 'yearly') => {
    trackEvent('vip_upgrade_click', 'vip_value_v2', plan);
    trackFirst('first_upgrade_click');
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
      <div className="max-w-lg mx-auto space-y-6">
        {/* V18.2 AUDIT F: 測試版風險提示 */}
        <TestModeBanner />

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" /> 為什麼升級 VIP
          </h1>
        </div>

        {/* Block 1: 痛點 */}
        {!isVIP && (
          <Card className="border border-amber-800/30 bg-gradient-to-br from-amber-950/20 to-gray-900/80">
            <CardContent className="p-4">
              <p className="text-base font-bold text-amber-400 mb-3">你的選號體驗正在被限制</p>
              <div className="space-y-2">
                {[
                  { icon: Lock, text: '每天只能看 2 個 AI 推薦號碼', sub: 'VIP 可看完整 6 碼 + 每日 5 組' },
                  { icon: Eye, text: '觀察池僅能追蹤 10 個號碼', sub: 'VIP 可追蹤 50 個號碼' },
                  { icon: X, text: '每日產號 10 次就停', sub: 'VIP 無限產號' },
                  { icon: Lock, text: '夢境/命理/回測無法使用', sub: 'VIP 全部解鎖' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <item.icon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-300">{item.text}</p>
                      <p className="text-[10px] text-emerald-400">→ {item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Block 2-6: 案例 */}
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Quote className="w-4 h-4 text-purple-400" /> 真實使用案例
          </h2>
          <div className="space-y-3">
            {CASES.map((c, i) => (
              <Card key={i} className={`border ${c.color}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <c.icon className="w-4 h-4 text-gray-400" />
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">{c.tag}</span>
                  </div>
                  <p className="text-sm text-gray-400 italic">"{c.quote}"</p>
                  <p className="text-xs text-gray-600 mt-1">— {c.user}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400">{c.result}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Block 7: 功能比較 */}
        <Card className="border border-gray-700 bg-gray-800/50">
          <CardContent className="p-4">
            <h2 className="text-base font-bold text-gray-200 mb-3">功能比較</h2>
            <div className="space-y-2">
              {COMPARE.map((row, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                  <span className="text-sm text-gray-300">{row.feature}</span>
                  <div className="flex gap-3 text-right">
                    <span className={`text-xs ${row.freeOk ? 'text-gray-500' : 'text-red-400/60'}`}>{row.free}</span>
                    <span className="text-xs text-emerald-400 font-bold">{row.vip}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Block 8: FAQ */}
        <Card className="border border-gray-700 bg-gray-800/50">
          <CardContent className="p-4">
            <h2 className="text-base font-bold text-gray-200 mb-3">常見問題</h2>
            <div className="space-y-1">
              {FAQS.map((faq, i) => (
                <div key={i} className="border-b border-gray-800 last:border-0">
                  <button
                    className="w-full flex items-center justify-between py-2 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="text-sm text-gray-300">{faq.q}</span>
                    {openFaq === i ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {openFaq === i && (
                    <p className="text-xs text-gray-500 pb-2">{faq.a}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Block 9: CTA */}
        {upgraded ? (
          <Card className="border border-emerald-700/40 bg-emerald-950/10">
            <CardContent className="p-6 text-center">
              <Check className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-emerald-400">模擬升級成功！</p>
              <p className="text-sm text-gray-400">你已成為 VIP 會員</p>
              <Button size="sm" className="mt-3 bg-emerald-600" onClick={() => navigate('/')}>返回首頁</Button>
            </CardContent>
          </Card>
        ) : !isVIP && (
          <Card className="border border-amber-700/40 bg-gradient-to-br from-amber-950/20 to-gray-900/80">
            <CardContent className="p-4 text-center">
              <p className="text-base font-bold text-amber-400 mb-1">立即升級，解鎖全部功能</p>
              <p className="text-xs text-gray-500 mb-4">超過 80% 的活躍用戶選擇 VIP</p>
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
              <p className="text-[10px] text-gray-600 mt-3">7天退款保障 · 隨時可取消</p>
            </CardContent>
          </Card>
        )}

        <Button onClick={() => navigate('/')} variant="outline" className="w-full border-gray-600 text-gray-400">🏠 返回首頁</Button>
      </div>
    </div>
  );
}
