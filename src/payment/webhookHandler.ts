// ============================================================
// V19.0.1 PHASE D: Client-side Payment Callback Handler
// 核心原則：前端只能「顯示」結果，不得直接開通 VIP
// VIP 激活必須通過 server/webhookSimulator.ts 的 ReturnURL 處理
// ============================================================

import { parseCallbackFromUrl } from './checkoutForm';
import { getPaymentStatusForDisplay } from '@/server/subscriptionGuard';

/** 付款結果 */
export interface PaymentResult {
  /** 是否成功 */
  success: boolean;
  /** 交易編號 */
  tradeNo?: string;
  /** 方案 */
  plan?: string;
  /** 付款方式 */
  paymentMethod?: string;
  /** 錯誤訊息 */
  error?: string;
  /** 是否 server-verified */
  serverVerified?: boolean;
  /** 是否能激活 */
  canActivate?: boolean;
}

/** 處理付款回調（僅顯示，不激活 VIP） */
export async function handlePaymentCallback(): Promise<PaymentResult> {
  const params = parseCallbackFromUrl();

  if (!params) {
    return { success: false, error: '無付款回調參數' };
  }

  const tradeNo = params.MerchantTradeNo || params.tradeNo || params.MockTradeNo || '';
  const plan = params.CustomField2 || params.plan || '';

  // V19.0.1: 前端只查詢 server-side 驗證狀態，不直接激活
  const status = getPaymentStatusForDisplay(tradeNo);

  if (status.serverVerified && status.canActivate) {
    return {
      success: true,
      tradeNo,
      plan: status.plan || plan,
      serverVerified: true,
      canActivate: true,
      paymentMethod: params.PaymentType || 'mock',
    };
  }

  if (status.status === 'paid' && !status.serverVerified) {
    return {
      success: false,
      tradeNo,
      error: '付款正在處理中，請稍後查看會員狀態',
      serverVerified: false,
    };
  }

  // 從 URL 參數判斷
  const rtnCode = params.RtnCode;
  const isSuccess = rtnCode === '1' || rtnCode === '2' || params.mock === 'true';

  if (isSuccess) {
    return {
      success: false, // 不直接成功，等 server verification
      tradeNo,
      plan,
      error: '付款已送出，系統正在確認。請稍後刷新此頁面。',
      serverVerified: false,
    };
  }

  return {
    success: false,
    tradeNo,
    error: params.RtnMsg || '付款未完成',
  };
}

/** 模擬 server-side webhook 並激活（僅測試用） */
export async function simulateServerWebhookThenActivate(params: {
  userId: string;
  plan: 'monthly' | 'quarterly' | 'yearly';
  amount: number;
  tradeNo: string;
}): Promise<PaymentResult> {
  // V19.0.1: 模擬完整的 server-side 流程
  const {
    simulateWebhookSuccess,
  } = await import('@/server/webhookSimulator');

  const result = await simulateWebhookSuccess(params.tradeNo, params.userId, params.amount);

  if (result.verification.valid && result.activation?.success) {
    return {
      success: true,
      tradeNo: params.tradeNo,
      plan: params.plan,
      serverVerified: true,
      canActivate: true,
      paymentMethod: 'mock',
    };
  }

  return {
    success: false,
    tradeNo: params.tradeNo,
    error: result.verification.error || 'Server webhook 處理失敗',
    serverVerified: false,
  };
}

/** 手動模擬付款成功（Sandbox 測試用 - 通過完整 server webhook 流程） */
export async function simulatePaymentSuccess(params: {
  userId: string;
  plan: 'monthly' | 'quarterly' | 'yearly';
  amount: number;
}): Promise<PaymentResult> {
  const tradeNo = `MOCK-${Date.now()}`;
  return simulateServerWebhookThenActivate({ ...params, tradeNo });
}

/** 手動模擬付款失敗 */
export async function simulatePaymentFailure(): Promise<PaymentResult> {
  return {
    success: false,
    error: '付款失敗 (Sandbox 模擬)',
    serverVerified: false,
  };
}

/** 手動模擬取消付款 */
export async function simulatePaymentCancel(): Promise<PaymentResult> {
  return {
    success: false,
    error: '付款已取消',
    serverVerified: false,
  };
}
