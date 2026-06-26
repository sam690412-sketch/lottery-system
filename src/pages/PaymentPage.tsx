// ============================================================
// V19.0 PHASE B: Payment Page
// 方案選擇 + 付款入口
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TestModeBanner from '@/components/TestModeBanner';
import { getPaymentGateway, setActiveGateway, getAvailableGateways } from '@/payment/providerFactory';
import { submitECPayForm } from '@/payment/checkoutForm';
import { getReturnUrl, getClientBackUrl } from '@/payment/ecpayConfig';
import { trackCheckoutStart } from '@/utils/analytics';
import { trackFirst } from '@/utils/behaviorTracker';

import { getSession } from '@/utils/auth';
import {
  ArrowLeft, CreditCard, Zap, Crown, Calendar,
  Check, AlertTriangle, ChevronRight
} from 'lucide-react';

const PLANS = [
  {
    id: 'monthly' as const,
    name: '月費方案',
    price: 299,
    period: '/月',
    save: '',
    icon: Calendar,
    color: 'border-purple-700/40 bg-purple-950/20',
    btnColor: 'bg-purple-600 hover:bg-purple-500',
    features: [
      '無限次產號',
      'AI 推薦 5 組/日',
      '觀察池 50 碼',
      '夢境 5 大學派',
      '命理八字+紫微',
      '回測 100/300/500 期',
      'CSV 匯出',
    ],
  },
  {
    id: 'quarterly' as const,
    name: '季費方案',
    price: 799,
    period: '/季',
    save: '省 17%',
    icon: Zap,
    color: 'border-amber-700/40 bg-amber-950/20',
    btnColor: 'bg-amber-600 hover:bg-amber-500',
    highlighted: true,
    features: [
      '月費全部功能',
      '平均每月 NT$266',
      '省 NT$98/季',
    ],
  },
  {
    id: 'yearly' as const,
    name: '年費方案',
    price: 2399,
    period: '/年',
    save: '省 33%',
    icon: Crown,
    color: 'border-emerald-700/40 bg-emerald-950/20',
    btnColor: 'bg-emerald-600 hover:bg-emerald-500',
    features: [
      '月費全部功能',
      '平均每月 NT$200',
      '省 NT$189/年',
      '最划算選擇',
    ],
  },
];

export default function PaymentPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[number]['id']>('quarterly');
  const [processing, setProcessing] = useState(false);
  const [gateway, setGateway] = useState<string>('mock');
  const [error, setError] = useState('');

  const handlePayment = async () => {
    setError('');
    setProcessing(true);
    trackFirst('first_upgrade_click');

    try {
      const plan = PLANS.find(p => p.id === selectedPlan);
      if (!plan) throw new Error('請選擇方案');

      const session = getSession();
      const userEmail = session?.email || 'guest@lottery.app';
      const userId = userEmail;

      trackCheckoutStart(selectedPlan, plan.price);

      // 設定閘道
      setActiveGateway(gateway as 'mock' | 'ecpay');
      const paymentGateway = getPaymentGateway();

      // 建立付款
      const result = await paymentGateway.createPayment({
        userId,
        userEmail,
        plan: selectedPlan,
        planName: plan.name,
        amount: plan.price,
        itemName: `威力彩選號系統 - ${plan.name}`,
        returnUrl: getReturnUrl(),
        clientBackUrl: getClientBackUrl(),
      });

      if (!result.success) {
        throw new Error(result.error || '付款建立失敗');
      }

      // ECPay: 自動提交表單
      if (gateway === 'ecpay' && result.paymentUrl && result.formParams) {
        submitECPayForm(result.paymentUrl, result.formParams);
        return; // 頁面會跳轉
      }

      // Mock: 直接處理成功
      if (gateway === 'mock') {
        // 帶參數跳轉到結果頁
        const params = new URLSearchParams({
          tradeNo: result.tradeNo || '',
          plan: selectedPlan,
          amount: String(plan.price),
          mock: 'true',
          userId,
        });
        navigate(`/payment/result?${params.toString()}`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '付款處理失敗');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 標題 */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-800/50 transition">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-100">升級 VIP</h1>
          <p className="text-xs text-gray-500">選擇適合你的方案</p>
        </div>
      </div>

      {/* 測試模式提示 */}
      <TestModeBanner />

      {/* 方案選擇 */}
      <div className="space-y-3">
        {PLANS.map(plan => {
          const Icon = plan.icon;
          const isSelected = selectedPlan === plan.id;
          return (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all duration-200 border-2 ${
                isSelected ? `${plan.color} ring-1 ring-opacity-50` : 'border-gray-800/50 bg-gray-900/50'
              } ${plan.highlighted ? 'relative' : ''}`}
              onClick={() => { setSelectedPlan(plan.id); setError(''); }}
            >
              {plan.highlighted && (
                <div className="absolute -top-2 left-4">
                  <Badge className="bg-amber-500 text-white text-[10px]">推薦</Badge>
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${plan.color}`}>
                      <Icon className="w-4 h-4 text-gray-300" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-100">{plan.name}</span>
                      {plan.save && (
                        <Badge variant="outline" className="ml-2 text-[10px] border-emerald-700/40 text-emerald-400">
                          {plan.save}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-600'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-2xl font-bold text-amber-400">NT${plan.price}</span>
                  <span className="text-xs text-gray-500">{plan.period}</span>
                </div>

                <div className="space-y-1">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 閘道選擇 */}
      <Card className="border-gray-800/50 bg-gray-900/50">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-bold text-gray-300">付款閘道</p>
          <div className="flex gap-2">
            {getAvailableGateways().map(g => (
              <button
                key={g.id}
                onClick={() => setGateway(g.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                  gateway === g.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {g.name}
                {g.isSandbox && <span className="ml-1 text-[9px] opacity-60">(測試)</span>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 退款政策 */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-900/30 border border-gray-800/30">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-gray-500 leading-relaxed">
          首次訂閱 7 天內可申請全額退款。退款將退回原付款方式，預計 7-14 個工作日。
        </p>
      </div>

      {/* 錯誤提示 */}
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-950/30 border border-red-800/40">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* 付款按鈕 */}
      <div className="pt-2">
        <Button
          onClick={handlePayment}
          disabled={processing}
          className="w-full h-14 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-base rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {processing ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              處理中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              立即付款 NT${PLANS.find(p => p.id === selectedPlan)?.price || 0}
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
