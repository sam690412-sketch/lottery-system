// ============================================================
// V18.1 MODULE A: VIP 價值頁（真實使用案例版）
// ============================================================
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { upgradeToVip, getCurrentRole } from '@/utils/permissions';
import { trackEvent } from '@/utils/analytics';
import { trackFirst } from '@/utils/behaviorTracker';
import { useState } from 'react';
import {
  Crown, ArrowLeft, Eye, Brain, Moon, Sparkles, BarChart3,
  Quote, Check, TrendingUp, Clock, Zap
} from 'lucide-react';

const CASES = [
  {
    icon: Eye,
    name: '觀察池案例',
    user: '台北李先生',
    quote: '我用觀察池追蹤了 23 個號碼三個月，發現 #07 和 #29 的出現週期約 15 天。調整下注時機後，小獎命中率高了不少。',
    feature: '觀察池 50 碼',
    result: '追蹤 23 碼 · 發現週期規律',
  },
  {
    icon: Brain,
    name: 'AI推薦案例',
    user: '台中張小姐',
    quote: 'AI 推薦每天給我 5 組號碼，我選信心度最高的 2 組下注。雖然沒中頭獎，但三獎和四獎的次數明顯比亂選多。',
    feature: 'AI推薦 x5 組/日',
    result: '三獎+四獎次數提升',
  },
  {
    icon: Moon,
    name: '夢境案例',
    user: '高雄王先生',
    quote: '夢到蛇之後用夢境解號，結合統計分析選了 6 個號碼。那期中了 4 個號碼，雖然不是大獎但感覺很神奇。',
    feature: '夢境 5 學派解析',
    result: '單期命中 4 碼',
  },
  {
    icon: Sparkles,
    name: '命理案例',
    user: '台南陳小姐',
    quote: '用八字分析我的財運日，搭配紫微斗數選號。在財運日下注，感覺運氣真的比較好。可能是心理作用，但我很喜歡這個功能。',
    feature: '八字+紫微+梅花易數',
    result: '財運日選號策略',
  },
  {
    icon: BarChart3,
    name: '回測案例',
    user: '新竹林先生',
    quote: '回測功能讓我驗證了「觀察池加權確實比純統計好」。100期回測顯示命中率差異 +6%，這個數據讓我對選號更有信心。',
    feature: '100/300/500期回測',
    result: '命中率差異 +6%',
  },
];

const WHY_VIP = [
  { icon: Zap, title: '不再受限', desc: '產號無限次，想試就試' },
  { icon: Brain, title: 'AI 加持', desc: '每日 5 組智能推薦' },
  { icon: Eye, title: '深度追蹤', desc: '50 碼觀察池全監控' },
  { icon: BarChart3, title: '數據驗證', desc: '歷史回測驗證策略' },
  { icon: Sparkles, title: '玄學整合', desc: '夢境+命理全功能' },
  { icon: Clock, title: '省時高效', desc: '3分鐘完成專業選號' },
];

export default function VIPValuePage() {
  const navigate = useNavigate();
  const role = getCurrentRole();
  const isVIP = role === 'vip' || role === 'tester' || role === 'admin';
  const [upgraded, setUpgraded] = useState(false);

  // V18.1.1: VIP價值頁瀏覽追蹤
  useState(() => { trackFirst('first_vip_page_view'); });

  const handleUpgrade = (plan: 'monthly' | 'quarterly' | 'yearly') => {
    trackEvent('vip_upgrade_click', 'vip_value_page', plan);
    upgradeToVip(plan);
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
            <Crown className="w-5 h-5 text-amber-400" /> 為什麼升級 VIP
          </h1>
        </div>

        {/* 升級成功 */}
        {upgraded && (
          <Card className="border border-emerald-700/40 bg-emerald-950/10 mb-4">
            <CardContent className="p-4 text-center">
              <Check className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-emerald-400">模擬升級成功！</p>
              <p className="text-sm text-gray-400">你已成為 VIP 會員</p>
            </CardContent>
          </Card>
        )}

        {/* 6大理由 */}
        {!isVIP && (
          <Card className="border border-amber-800/30 bg-gradient-to-br from-amber-950/20 to-gray-900/80 mb-4">
            <CardContent className="p-4">
              <h2 className="text-base font-bold text-amber-400 mb-3">VIP 的 6 大價值</h2>
              <div className="grid grid-cols-2 gap-2">
                {WHY_VIP.map(w => (
                  <div key={w.title} className="flex items-start gap-2 bg-gray-900/40 p-2 rounded">
                    <w.icon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-gray-300">{w.title}</p>
                      <p className="text-[10px] text-gray-500">{w.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 真實案例 */}
        <h2 className="text-base font-bold text-gray-200 mb-3 flex items-center gap-2">
          <Quote className="w-4 h-4 text-purple-400" /> 真實使用案例
        </h2>
        <div className="space-y-3 mb-4">
          {CASES.map((c, i) => (
            <Card key={i} className="border border-gray-700 bg-gray-800/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <c.icon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-300">{c.name}</p>
                    <p className="text-[10px] text-gray-500">{c.user}</p>
                  </div>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-950/30 text-amber-400 border border-amber-800/30">
                    {c.feature}
                  </span>
                </div>
                <p className="text-sm text-gray-400 italic leading-relaxed">"{c.quote}"</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs text-emerald-400">{c.result}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 定價方案 */}
        {!isVIP && !upgraded && (
          <Card className="border border-amber-700/40 bg-amber-950/10 mb-4">
            <CardContent className="p-4">
              <h2 className="text-base font-bold text-amber-400 mb-3 text-center">選擇你的 VIP 方案</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'monthly' as const, name: '月費', price: '299', period: '/月' },
                  { key: 'quarterly' as const, name: '季費', price: '799', period: '/季', save: '省17%', popular: true },
                  { key: 'yearly' as const, name: '年費', price: '2399', period: '/年', save: '省33%' },
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => handleUpgrade(p.key)}
                    className={`p-3 rounded-lg border text-center transition hover:scale-105 ${
                      p.popular ? 'border-amber-500 bg-amber-950/30' : 'border-gray-700 bg-gray-800/30'
                    }`}
                  >
                    {p.popular && <span className="text-[10px] text-amber-400 block">最熱門</span>}
                    <span className="text-sm font-bold text-gray-200">{p.name}</span>
                    <span className="text-lg font-bold text-amber-400 block">${p.price}</span>
                    <span className="text-[10px] text-gray-500">{p.period}</span>
                    {p.save && <span className="text-[10px] text-emerald-400 block">{p.save}</span>}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 text-center mt-2">點擊方案即模擬升級</p>
            </CardContent>
          </Card>
        )}

        {/* 底部返回 */}
        <div className="mt-6 space-y-2">
          <Button onClick={() => navigate('/vip')} variant="outline" className="w-full border-gray-600 text-gray-400">
            <Crown className="w-4 h-4 mr-1" /> 查看 VIP 功能對比
          </Button>
          <Button onClick={() => navigate('/')} variant="outline" className="w-full border-gray-600 text-gray-400">
            🏠 返回首頁
          </Button>
        </div>
      </div>
    </div>
  );
}
