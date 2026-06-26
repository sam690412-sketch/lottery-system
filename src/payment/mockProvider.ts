// ============================================================
// V19.0 PHASE A: MockProvider
// 模擬金流閘道 - 用於開發測試
// ============================================================

import type {
  IPaymentGateway,
  CreatePaymentParams,
  RefundParams,
  PaymentRequestResult,
  PaymentVerifyResult,
  RefundResult,
  SubscriptionInfo,
} from './types';

export class MockProvider implements IPaymentGateway {
  readonly name = 'mock' as const;
  readonly isSandbox = true;

  /** 建立付款 - 直接成功 */
  async createPayment(params: CreatePaymentParams): Promise<PaymentRequestResult> {
    console.log('[MOCK] createPayment:', params.plan, params.amount);
    // 模擬延遲
    await new Promise(r => setTimeout(r, 500));

    const tradeNo = `MOCK-${Date.now()}`;

    return {
      success: true,
      tradeNo,
      paymentUrl: '#mock-payment',
      formParams: {
        MockTradeNo: tradeNo,
        MockPlan: params.plan,
        MockAmount: String(params.amount),
      },
    };
  }

  /** 驗證回調 - 直接成功 */
  async verifyCallback(callbackData: Record<string, string>): Promise<PaymentVerifyResult> {
    console.log('[MOCK] verifyCallback:', callbackData);
    await new Promise(r => setTimeout(r, 300));

    const plan = (callbackData.plan || callbackData.MockPlan || 'monthly') as 'monthly' | 'quarterly' | 'yearly';

    return {
      success: true,
      tradeNo: callbackData.tradeNo || `MOCK-${Date.now()}`,
      paymentMethod: 'mock',
      paymentDate: new Date().toISOString(),
      plan,
      isDuplicate: false,
    };
  }

  /** 申請退款 - 直接成功 */
  async requestRefund(params: RefundParams): Promise<RefundResult> {
    console.log('[MOCK] requestRefund:', params.tradeNo, params.amount);
    await new Promise(r => setTimeout(r, 300));

    return {
      success: true,
      refundTradeNo: `REF-${Date.now()}`,
    };
  }

  /** 取得訂閱資訊 */
  async getSubscription(userId: string): Promise<SubscriptionInfo> {
    const { getMemberSubscriptionState } = await import('@/utils/paymentModel');
    const state = getMemberSubscriptionState(userId);

    return {
      plan: state.subscription?.plan || null,
      expiryDate: state.subscription?.expiresAt || null,
      isActive: state.isActive,
      daysRemaining: state.daysRemaining,
      autoRenew: state.subscription?.autoRenew || false,
    };
  }

  /** 取消訂閱 */
  async cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    const { updateSubscriptionStatus } = await import('@/utils/paymentModel');
    const { getMemberSubscriptionState } = await import('@/utils/paymentModel');
    const state = getMemberSubscriptionState(userId);

    if (!state.subscription) {
      return { success: false, error: '無活躍訂閱' };
    }

    updateSubscriptionStatus(state.subscription.id, 'canceled', {
      canceledAt: new Date().toISOString(),
      cancelAtPeriodEnd: true,
    });

    return { success: true };
  }
}
