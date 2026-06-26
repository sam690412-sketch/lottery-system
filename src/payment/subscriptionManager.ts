// ============================================================
// V19.0 PHASE E: Subscription Activation Manager
// 付款成功後訂閱激活流程
// ============================================================

import type { PlanType } from '@/utils/paymentModel';
import {
  createPayment,
  updatePaymentStatus,
  createSubscription,
} from '@/utils/paymentModel';
import { trackCheckoutSuccess, trackSubscriptionActivated } from '@/utils/analytics';
import { saveUserAccounts, loadUserAccounts } from '@/repositories/authStorage';
import { loadSubscriptions, saveSubscriptions } from '@/repositories/businessDataStorage';

/** 付款成功後的完整激活流程 */
export async function activateSubscription(params: {
  userId: string;
  plan: PlanType;
  tradeNo: string;
  amount: number;
  paymentMethod?: string;
}): Promise<{ success: boolean; error?: string; subscriptionId?: string }> {
  try {
    console.log('[Subscription] Activating:', params);

    // 1. 更新付款記錄為已完成
    const paymentRecord = createPayment(params.userId, params.plan);
    updatePaymentStatus(paymentRecord.id, 'completed', {
      providerRef: params.tradeNo,
      completedAt: new Date().toISOString(),
    });

    // 2. 建立訂閱記錄
    const subscription = createSubscription(params.userId, params.plan);

    // 3. 更新用戶角色為 VIP
    upgradeUserRole(params.userId);

    // 4. 記錄 Analytics
    trackCheckoutSuccess(params.plan, paymentRecord.id);
    trackSubscriptionActivated(params.plan, subscription.id);

    return {
      success: true,
      subscriptionId: subscription.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '訂閱激活失敗',
    };
  }
}

/** 升級用戶角色為 VIP */
export function upgradeUserRole(userId: string): void {
  try {
    const accounts = loadUserAccounts();
    if (accounts[userId]) {
      accounts[userId].role = 'vip';
      saveUserAccounts(accounts);
      console.log('[Subscription] User upgraded to VIP:', userId);
    }
  } catch (err) {
    console.error('[Subscription] Failed to upgrade role:', err);
  }
}

/** 降級用戶角色為 Free */
export function downgradeUserRole(userId: string): void {
  try {
    const accounts = loadUserAccounts();
    if (accounts[userId]) {
      accounts[userId].role = 'free';
      saveUserAccounts(accounts);
      console.log('[Subscription] User downgraded to Free:', userId);
    }
  } catch (err) {
    console.error('[Subscription] Failed to downgrade role:', err);
  }
}

/** 檢查並處理到期訂閱 */
export function checkExpiredSubscriptions(): string[] {
  try {
    const subsRaw = loadSubscriptions();
    const subs = JSON.parse(subsRaw || '[]');
    const now = Date.now();
    const expired: string[] = [];

    subs.forEach((sub: { userId: string; expiresAt: string; status: string; id: string }) => {
      if (sub.status === 'active' && new Date(sub.expiresAt).getTime() < now) {
        sub.status = 'unpaid';
        expired.push(sub.userId);
      }
    });

    saveSubscriptions(subs);
    return expired;
  } catch {
    return [];
  }
}
