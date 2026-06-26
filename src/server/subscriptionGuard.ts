// ============================================================
// V19.0.1 PHASE D: Subscription Activation Security
// 核心原則：只有 server webhook 驗證成功後才能開通 VIP
// 前端 result page 只能顯示結果，不得直接開通
// ============================================================

import { isServerVerifiedPaid, getPaymentState } from './paymentStateMachine';
import { activateSubscription as rawActivate } from '@/payment/subscriptionManager';
import { downgradeUserRole } from '@/payment/subscriptionManager';

/** 激活結果 */
export interface GuardedActivationResult {
  success: boolean;
  /** 是否 server-verified */
  serverVerified: boolean;
  error?: string;
  subscriptionId?: string;
}

/**
 * 受保護的訂閱激活
 * 只有當 server-side webhook 驗證標記為 paid 時才能開通 VIP
 *
 * SECURITY: 此函數是 VIP 開通的唯一入口
 * 前端無法繞過此函數直接開通 VIP
 */
export async function guardedActivateSubscription(params: {
  userId: string;
  plan: 'monthly' | 'quarterly' | 'yearly';
  tradeNo: string;
  amount: number;
  paymentMethod?: string;
}): Promise<GuardedActivationResult> {
  // 1. 檢查 server-side 驗證狀態
  const isVerified = isServerVerifiedPaid(params.tradeNo);

  if (!isVerified) {
    console.error('[SubscriptionGuard] BLOCKED: tradeNo not server-verified:', params.tradeNo);
    return {
      success: false,
      serverVerified: false,
      error: '付款尚未完成 server-side 驗證，無法開通 VIP',
    };
  }

  // 2. 驗證訂單資訊
  const state = getPaymentState(params.tradeNo);
  if (!state) {
    return {
      success: false,
      serverVerified: true,
      error: '找不到對應的付款記錄',
    };
  }

  // 3. 比對用戶（防止竄改）
  if (state.userId !== params.userId) {
    console.error('[SubscriptionGuard] BLOCKED: userId mismatch', state.userId, 'vs', params.userId);
    return {
      success: false,
      serverVerified: true,
      error: '用戶驗證失敗',
    };
  }

  // 4. 比對金額（防止竄改）
  if (state.amount !== params.amount) {
    console.error('[SubscriptionGuard] BLOCKED: amount mismatch', state.amount, 'vs', params.amount);
    return {
      success: false,
      serverVerified: true,
      error: '金額驗證失敗',
    };
  }

  // 5. 檢查是否已激活（防止重複激活）
  if (state.status === 'refunded') {
    return {
      success: false,
      serverVerified: true,
      error: '此訂單已退款',
    };
  }

  // 6. 執行激活
  try {
    const result = await rawActivate(params);
    if (result.success) {
      console.log('[SubscriptionGuard] VIP activated for', params.userId, 'via trade', params.tradeNo);
      return {
        success: true,
        serverVerified: true,
        subscriptionId: result.subscriptionId,
      };
    }
    return {
      success: false,
      serverVerified: true,
      error: result.error || '激活失敗',
    };
  } catch (err) {
    return {
      success: false,
      serverVerified: true,
      error: err instanceof Error ? err.message : '激活異常',
    };
  }
}

/**
 * 前端查詢訂單狀態（僅顯示，不激活）
 * 供 PaymentResultPage 使用
 */
export function getPaymentStatusForDisplay(tradeNo: string): {
  status: string;
  serverVerified: boolean;
  canActivate: boolean;
  plan?: string;
  amount?: number;
} {
  const state = getPaymentState(tradeNo);
  if (!state) {
    return { status: 'unknown', serverVerified: false, canActivate: false };
  }

  const verified = isServerVerifiedPaid(tradeNo);
  return {
    status: state.status,
    serverVerified: verified,
    canActivate: verified && state.status === 'paid',
    plan: state.plan,
    amount: state.amount,
  };
}

/**
 * 手動降級（管理員/退款時使用）
 */
export function guardedDowngrade(userId: string): void {
  downgradeUserRole(userId);
  console.log('[SubscriptionGuard] User downgraded:', userId);
}
