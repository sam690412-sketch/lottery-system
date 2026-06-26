// ============================================================
// V19.0.1 PHASE D: Payment Result Page
// 核心原則：僅顯示結果，不得直接開通 VIP
// VIP 激活由 server/webhookSimulator.ts 的 ReturnURL 處理
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { handlePaymentCallback, simulatePaymentSuccess, simulatePaymentFailure, simulatePaymentCancel } from '@/payment/webhookHandler';
import { getPaymentStatusForDisplay } from '@/server/subscriptionGuard';
import { trackCheckoutCancel } from '@/utils/analytics';
import {
  CheckCircle2, XCircle, AlertTriangle, ArrowLeft,
  Home, RotateCcw, Loader2, Shield
} from 'lucide-react';

type ResultState = 'loading' | 'success' | 'failed' | 'cancelled' | 'pending_verification';

export default function PaymentResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<ResultState>('loading');
  const [message, setMessage] = useState('處理付款結果...');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [serverVerified, setServerVerified] = useState(false);
  const [sandboxMode, setSandboxMode] = useState(false);

  useEffect(() => {
    processResult();
  }, []);

  const processResult = async () => {
    try {
      // 檢查是否為 Sandbox 測試操作
      const action = searchParams.get('action');
      if (action) {
        setSandboxMode(true);
        const plan = (searchParams.get('plan') || 'monthly') as 'monthly' | 'quarterly' | 'yearly';
        const amount = parseInt(searchParams.get('amount') || '299');

        switch (action) {
          case 'success': {
            setMessage('模擬付款處理中（經由 server webhook）...');
            // V19.0.1: 通過完整的 server webhook 流程
            const result = await simulatePaymentSuccess({
              userId: searchParams.get('userId') || 'test-user',
              plan,
              amount,
            });
            if (result.success && result.serverVerified) {
              setState('success');
              setMessage('付款成功！VIP 訂閱已激活');
              setServerVerified(true);
              setDetails({
                tradeNo: result.tradeNo || '',
                plan: result.plan || plan,
                amount: String(amount),
                method: result.paymentMethod || 'mock',
              });
            } else {
              setState('pending_verification');
              setMessage(result.error || '等待 server 驗證...');
              setServerVerified(false);
            }
            return;
          }
          case 'fail': {
            await simulatePaymentFailure();
            setState('failed');
            setMessage('付款失敗 (Sandbox 模擬)');
            setServerVerified(false);
            return;
          }
          case 'cancel': {
            trackCheckoutCancel(plan, 'user_cancel');
            await simulatePaymentCancel();
            setState('cancelled');
            setMessage('付款已取消');
            return;
          }
        }
      }

      // 正常回調處理（僅顯示，不激活）
      const mock = searchParams.get('mock');
      if (mock === 'true') {
        const tradeNo = searchParams.get('tradeNo') || '';
        const plan = searchParams.get('plan') || 'monthly';
        const amount = parseInt(searchParams.get('amount') || '299');

        // V19.0.1: 先查詢 server-side 驗證狀態
        const status = getPaymentStatusForDisplay(tradeNo);

        if (status.serverVerified && status.canActivate) {
          setState('success');
          setMessage('付款成功！VIP 訂閱已激活');
          setServerVerified(true);
          setDetails({ tradeNo, plan, amount: String(amount), method: 'mock' });
        } else if (status.status === 'paid' && !status.serverVerified) {
          setState('pending_verification');
          setMessage('付款已確認，等待 server 驗證完成...');
          setServerVerified(false);
        } else {
          // 還沒有 server 處理，顯示等待
          setState('pending_verification');
          setMessage('付款已送出，系統正在確認。請稍後刷新此頁面。');
          setServerVerified(false);
        }
        return;
      }

      // ECPay 回調（僅顯示）
      const result = await handlePaymentCallback();

      if (result.success && result.serverVerified) {
        setState('success');
        setMessage('付款成功！VIP 訂閱已激活');
        setServerVerified(true);
        setDetails({
          tradeNo: result.tradeNo || '',
          plan: result.plan || '',
          method: result.paymentMethod || '',
        });
      } else if (!result.success && result.serverVerified === false) {
        setState('pending_verification');
        setMessage(result.error || '等待 server 驗證...');
        setServerVerified(false);
      } else {
        setState('failed');
        setMessage(result.error || '付款處理失敗');
      }
    } catch (err) {
      setState('failed');
      setMessage(err instanceof Error ? err.message : '處理失敗');
    }
  };

  const handleRetry = () => { navigate('/payment'); };
  const handleGoHome = () => { navigate('/'); };
  const handleRefresh = () => { window.location.reload(); };

  const renderIcon = () => {
    switch (state) {
      case 'loading': return <Loader2 className="w-16 h-16 text-amber-500 animate-spin" />;
      case 'success': return <CheckCircle2 className="w-16 h-16 text-emerald-500" />;
      case 'failed': return <XCircle className="w-16 h-16 text-red-500" />;
      case 'cancelled': return <AlertTriangle className="w-16 h-16 text-amber-500" />;
      case 'pending_verification': return <Shield className="w-16 h-16 text-blue-500 animate-pulse" />;
    }
  };

  const renderTitle = () => {
    switch (state) {
      case 'loading': return '處理中';
      case 'success': return '付款成功';
      case 'failed': return '付款失敗';
      case 'cancelled': return '付款取消';
      case 'pending_verification': return '安全驗證中';
    }
  };

  const renderColor = () => {
    switch (state) {
      case 'loading': return 'text-amber-400';
      case 'success': return 'text-emerald-400';
      case 'failed': return 'text-red-400';
      case 'cancelled': return 'text-amber-400';
      case 'pending_verification': return 'text-blue-400';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-24">
      <Card className="w-full max-w-md border-gray-800/50 bg-gray-900/80">
        <CardContent className="p-8 text-center space-y-6">
          {/* 圖示 */}
          <div className="flex justify-center">{renderIcon()}</div>

          {/* 標題 */}
          <div>
            <h1 className={`text-2xl font-bold ${renderColor()}`}>{renderTitle()}</h1>
            <p className="text-sm text-gray-400 mt-2">{message}</p>
          </div>

          {/* Server Verified 標記 */}
          {serverVerified && (
            <div className="flex items-center justify-center gap-1.5 bg-emerald-950/20 border border-emerald-800/30 rounded-lg py-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400">Server 驗證通過</span>
            </div>
          )}
          {state === 'pending_verification' && (
            <div className="flex items-center justify-center gap-1.5 bg-blue-950/20 border border-blue-800/30 rounded-lg py-2">
              <Shield className="w-4 h-4 text-blue-400 animate-pulse" />
              <span className="text-xs text-blue-400">等待 Server-side 安全驗證</span>
            </div>
          )}

          {/* 詳情 */}
          {Object.keys(details).length > 0 && (
            <div className="text-left bg-gray-800/50 rounded-lg p-4 space-y-2">
              {details.tradeNo && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">交易編號</span>
                  <span className="text-gray-300 font-mono">{details.tradeNo}</span>
                </div>
              )}
              {details.plan && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">方案</span>
                  <Badge variant="outline" className="text-[10px] border-amber-700/40 text-amber-400">
                    {details.plan === 'monthly' ? '月費' : details.plan === 'quarterly' ? '季費' : '年費'}
                  </Badge>
                </div>
              )}
              {details.amount && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">金額</span>
                  <span className="text-amber-400 font-bold">NT${details.amount}</span>
                </div>
              )}
            </div>
          )}

          {/* VIP 權益提示 (server-verified 成功時) */}
          {state === 'success' && serverVerified && (
            <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-4 text-left space-y-2">
              <p className="text-xs font-bold text-emerald-400">VIP 權益已激活</p>
              <div className="text-[11px] text-gray-400 space-y-1">
                <p>無限次產號</p>
                <p>AI 推薦 5 組/日</p>
                <p>觀察池 50 碼</p>
                <p>回測 100/300/500 期</p>
              </div>
            </div>
          )}

          {/* Sandbox 測試提示 */}
          {sandboxMode && (
            <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-3">
              <p className="text-[10px] text-purple-400">Sandbox 測試模式 - 經由 server webhook 模擬</p>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="space-y-3 pt-2">
            {state === 'success' ? (
              <Button
                onClick={handleGoHome}
                className="w-full h-12 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl"
              >
                <Home className="w-4 h-4 mr-2" />
                返回首頁
              </Button>
            ) : state === 'pending_verification' ? (
              <>
                <Button
                  onClick={handleRefresh}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  刷新查看結果
                </Button>
                <Button
                  onClick={handleGoHome}
                  variant="outline"
                  className="w-full h-12 border-gray-700 text-gray-400 hover:bg-gray-800"
                >
                  <Home className="w-4 h-4 mr-2" />
                  返回首頁
                </Button>
              </>
            ) : state === 'loading' ? (
              <div className="h-12 flex items-center justify-center">
                <span className="text-xs text-gray-500">請稍候...</span>
              </div>
            ) : (
              <>
                <Button
                  onClick={handleRetry}
                  className="w-full h-12 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重新付款
                </Button>
                <Button
                  onClick={handleGoHome}
                  variant="outline"
                  className="w-full h-12 border-gray-700 text-gray-400 hover:bg-gray-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回首頁
                </Button>
              </>
            )}
          </div>

          {/* V19.0.1 安全說明 */}
          <p className="text-[9px] text-gray-600 leading-relaxed">
            V19.0.1 安全架構：前端僅顯示結果，VIP 激活由 server-side webhook 驗證後自動處理。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
