// ============================================================
// V18.2 AUDIT C: 付款狀態模型 (Payment Status Model)
// 設計但不串接金流 - 為未來金流整合預留數據結構
// ============================================================

import type { UserRole } from './auth';
import { defaultFactory } from '@/repositories/factory';
import * as bizStorage from '@/repositories/businessDataStorage';

// ---- 核心型別 ----

/** 付款方案 */
export type PlanType = 'monthly' | 'quarterly' | 'yearly';

/** 付款狀態 */
export type PaymentStatus =
  | 'pending'      // 待付款
  | 'processing'   // 處理中
  | 'completed'    // 已完成
  | 'failed'       // 失敗
  | 'refunded'     // 已退款
  | 'disputed';    // 爭議中

/** 訂閱狀態 */
export type SubscriptionStatus =
  | 'trial'        // 試用期
  | 'active'       // 生效中
  | 'past_due'     // 逾期
  | 'canceled'     // 已取消（到期前）
  | 'unpaid'       // 未付款
  | 'paused';      // 暫停

/** 付款記錄 */
export interface PaymentRecord {
  id: string;                    // 付款編號
  userId: string;                // 用戶ID
  plan: PlanType;                // 方案
  amount: number;                // 金額 (TWD)
  status: PaymentStatus;         // 付款狀態
  provider: PaymentProvider;     // 付款服務商
  providerRef: string;           // 服務商交易編號
  createdAt: string;             // 建立時間
  completedAt?: string;          // 完成時間
  refundedAt?: string;           // 退款時間
  refundReason?: string;         // 退款原因
}

/** 訂閱記錄 */
export interface SubscriptionRecord {
  id: string;                    // 訂閱編號
  userId: string;                // 用戶ID
  plan: PlanType;                // 方案
  status: SubscriptionStatus;    // 訂閱狀態
  startedAt: string;             // 開始時間
  expiresAt: string;             // 到期時間
  canceledAt?: string;           // 取消時間
  cancelAtPeriodEnd: boolean;    // 是否到期後取消
  trialUsed: boolean;            // 是否已使用試用
  trialEndsAt?: string;          // 試用到期時間
  autoRenew: boolean;            // 自動續約
  paymentMethod?: string;        // 付款方式 (末四碼)
  nextBillingAt?: string;        // 下次扣款時間
}

/** 付款服務商 */
export type PaymentProvider = 'ecpay' | 'newebpay' | 'stripe' | 'paypal' | 'mock';

/** 會員訂閱狀態 (整合视图) */
export interface MemberSubscriptionState {
  userId: string;
  role: UserRole;
  subscription: SubscriptionRecord | null;
  payments: PaymentRecord[];
  // 計算屬性
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  canRefund: boolean;            // 7天內可退款
}

// ---- 方案定價 ----

export const PLAN_PRICING: Record<PlanType, { price: number; period: string; save: string }> = {
  monthly:  { price: 299, period: '/月', save: '' },
  quarterly: { price: 799, period: '/季', save: '省17%' },
  yearly:   { price: 2399, period: '/年', save: '省33%' },
};

// ---- Storage Keys (managed by businessDataStorage.ts) ----

// ---- CRUD 操作 ----

/** 建立付款記錄 (checkout_start) */
export function createPayment(userId: string, plan: PlanType): PaymentRecord {
  const pricing = PLAN_PRICING[plan];
  const record: PaymentRecord = {
    id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    userId,
    plan,
    amount: pricing.price,
    status: 'pending',
    provider: 'mock',
    providerRef: '',
    createdAt: new Date().toISOString(),
  };
  const payments = loadPayments();
  payments.push(record);
  savePayments(payments);
  return record;
}

/** 更新付款狀態 */
export function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  opts?: { providerRef?: string; completedAt?: string; refundedAt?: string; refundReason?: string }
): PaymentRecord | null {
  const payments = loadPayments();
  const idx = payments.findIndex(p => p.id === paymentId);
  if (idx === -1) return null;
  payments[idx].status = status;
  if (opts?.providerRef) payments[idx].providerRef = opts.providerRef;
  if (opts?.completedAt) payments[idx].completedAt = opts.completedAt;
  if (opts?.refundedAt) payments[idx].refundedAt = opts.refundedAt;
  if (opts?.refundReason) payments[idx].refundReason = opts.refundReason;
  savePayments(payments);
  return payments[idx];
}

/** 建立訂閱 */
export function createSubscription(userId: string, plan: PlanType): SubscriptionRecord {
  const now = new Date();
  const periodDays = plan === 'monthly' ? 30 : plan === 'quarterly' ? 90 : 365;
  const record: SubscriptionRecord = {
    id: `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    userId,
    plan,
    status: 'active',
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000).toISOString(),
    canceledAt: undefined,
    cancelAtPeriodEnd: false,
    trialUsed: false,
    autoRenew: true,
    nextBillingAt: new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000).toISOString(),
  };
  const subs = loadSubscriptions();
  subs.push(record);
  saveSubscriptions(subs);
  return record;
}

/** 更新訂閱狀態 */
export function updateSubscriptionStatus(
  subId: string,
  status: SubscriptionStatus,
  opts?: { canceledAt?: string; cancelAtPeriodEnd?: boolean; autoRenew?: boolean }
): SubscriptionRecord | null {
  const subs = loadSubscriptions();
  const idx = subs.findIndex(s => s.id === subId);
  if (idx === -1) return null;
  subs[idx].status = status;
  if (opts?.canceledAt) subs[idx].canceledAt = opts.canceledAt;
  if (opts?.cancelAtPeriodEnd !== undefined) subs[idx].cancelAtPeriodEnd = opts.cancelAtPeriodEnd;
  if (opts?.autoRenew !== undefined) subs[idx].autoRenew = opts.autoRenew;
  saveSubscriptions(subs);
  return subs[idx];
}

/** 取得會員訂閱狀態 */
export function getMemberSubscriptionState(userId: string): MemberSubscriptionState {
  const payments = loadPayments().filter(p => p.userId === userId);
  const subs = loadSubscriptions().filter(s => s.userId === userId);
  const activeSub = subs.find(s => s.status === 'active' || s.status === 'trial') || null;

  const now = Date.now();
  const isActive = activeSub ? new Date(activeSub.expiresAt).getTime() > now : false;
  const daysRemaining = activeSub
    ? Math.max(0, Math.ceil((new Date(activeSub.expiresAt).getTime() - now) / (24 * 60 * 60 * 1000)))
    : 0;
  const canRefund = payments.some(p => {
    if (p.status !== 'completed') return false;
    const daysSince = (now - new Date(p.completedAt || p.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    return daysSince <= 7;
  });

  return {
    userId,
    role: 'free' as UserRole,
    subscription: activeSub,
    payments,
    isActive,
    isExpired: !isActive && !!activeSub,
    daysRemaining,
    canRefund,
  };
}

/** 檢查是否可退款 */
export function canRefund(paymentId: string): boolean {
  const payments = loadPayments();
  const p = payments.find(x => x.id === paymentId);
  if (!p || p.status !== 'completed') return false;
  const daysSince = (Date.now() - new Date(p.completedAt || p.createdAt).getTime()) / (24 * 60 * 60 * 1000);
  return daysSince <= 7;
}

/** 申請退款 */
export function requestRefund(paymentId: string, reason: string): { success: boolean; error?: string } {
  if (!canRefund(paymentId)) {
    return { success: false, error: '超過7天退款期限或付款未完成' };
  }
  updatePaymentStatus(paymentId, 'refunded', {
    refundedAt: new Date().toISOString(),
    refundReason: reason,
  });
  return { success: true };
}

// ---- 輔助函數 ----

function loadPayments(): PaymentRecord[] {
  try {
    return JSON.parse(bizStorage.loadPayments() || '[]');
  } catch { return []; }
}

function savePayments(payments: PaymentRecord[]): void {
  try {
    bizStorage.savePayments(payments);
    // V18.2.8: 業務數據已遷移到 businessDataStorage.ts
    // V18.2.6: 逐筆同步到 Repository
    const repo = defaultFactory.getPaymentRepository();
    payments.forEach(p => repo.save(p).catch(() => {}));
  } catch { /* ignore */ }
}

function loadSubscriptions(): SubscriptionRecord[] {
  try {
    return JSON.parse(bizStorage.loadSubscriptions() || '[]');
  } catch { return []; }
}

function saveSubscriptions(subs: SubscriptionRecord[]): void {
  try {
    bizStorage.saveSubscriptions(subs);
    // V18.2.8: 業務數據已遷移到 businessDataStorage.ts
    // V18.2.6: 逐筆同步到 Repository
    const repo = defaultFactory.getSubscriptionRepository();
    subs.forEach(s => repo.save(s).catch(() => {}));
  } catch { /* ignore */ }
}

/** 匯出付款記錄 CSV */
export function exportPaymentCSV(userId: string): string {
  const state = getMemberSubscriptionState(userId);
  const lines = [
    '付款編號,方案,金額,狀態,服務商,建立時間,完成時間',
    ...state.payments.map(p =>
      `${p.id},${p.plan},${p.amount},${p.status},${p.provider},${p.createdAt},${p.completedAt || '-'}`
    ),
    '',
    '訂閱編號,方案,狀態,開始時間,到期時間,自動續約',
    state.subscription
      ? `${state.subscription.id},${state.subscription.plan},${state.subscription.status},${state.subscription.startedAt},${state.subscription.expiresAt},${state.subscription.autoRenew}`
      : '無活躍訂閱',
    '',
    `可退款: ${state.canRefund ? '是' : '否'}`,
    `剩餘天數: ${state.daysRemaining}`,
  ];
  return lines.join('\n');
}
