// ============================================================
// V18.2.5 AUDIT D+E: 會員狀態單一來源 + 統一 VIP 判定
//
// 原則：
// 1. 會員狀態由 MembershipState 統一提供
// 2. VIP 判定由 isVip() 統一處理
// 3. 不再使用 role === 'vip' 散落判斷
//
// 遷移路徑：
// role === 'vip'    →    isVip(state)
// role === 'admin'  →    isAdmin(state)
// role === 'tester' →    isTester(state)
// ============================================================

import type { UserRole } from '@/utils/auth';
import type { SubscriptionRecord } from '@/utils/paymentModel';
import type { MembershipState } from './interfaces';
// Batch 3d-5b: VIP 判定後端化（flag 預設 localStorage，行為不變）
import { getMembershipGuardSource, computeMembershipFlags } from '@/utils/membershipGuard';
import { getBackendAuthSnapshot } from '@/utils/backendAuthSnapshot';

// ---- Storage Keys 集中定義 (AUDIT A) ----

export const STORAGE_KEYS = {
  // 會員核心
  USER_ACCOUNTS: 'lottery-v13-accounts',
  ADMIN_ACCOUNTS: 'lottery-v13-admin-accounts',
  SESSION: 'lottery-v13-session',
  AUTH_SESSION: 'lottery-auth-session',

  // VIP 試用
  VIP_TRIAL_LOG: 'lottery-v13-vip-trial-log',

  // 產號次數
  GUEST_COUNT: 'lottery-v13-guest-count',

  // 付款訂閱 (V18.2)
  PAYMENTS: 'lottery-v18-payments',
  SUBSCRIPTIONS: 'lottery-v18-subscriptions',

  // 分析 (V18.1+)
  ANALYTICS: 'lottery-v18-analytics',
  BEHAVIOR: 'lottery-v18-behavior',
  FUNNEL: 'lottery-v18-funnel',
  INTENT: 'lottery-v18-intent',

  // A/B 測試
  AB_TEST: 'lottery-v18-ab-test',

  // 觀察池
  OBSERVATION_POOL: 'lottery-observation-pool-v2',
} as const;

// ---- VIP 判定 (AUDIT E: 統一入口) ----

/**
 * 統一 VIP 判定 - 依據 role + subscription 雙重檢查
 * 這是未來取代所有 `role === 'vip'` 的統一函數
 */
export function isVip(role: UserRole, subscription?: SubscriptionRecord | null): boolean {
  // Batch 3d-5b: 可灰度讀後端快照；flag 預設 localStorage（行為不變）。
  if (getMembershipGuardSource() === 'backend') {
    return computeMembershipFlags({ source: 'backend', snapshot: getBackendAuthSnapshot() }).isVip;
  }
  // 管理員和測試員視為 VIP
  if (role === 'admin' || role === 'tester') return true;

  // 明確的 VIP 角色
  if (role === 'vip') return true;

  // 有有效訂閱的用戶（即使角色還沒更新）
  if (subscription) {
    const now = Date.now();
    const expires = new Date(subscription.expiresAt).getTime();
    if (subscription.status === 'active' && expires > now) return true;
  }

  return false;
}

/** 快速判定 - 僅依據 role */
export function isVipByRole(role: UserRole): boolean {
  // Batch 3d-5c: flag 預設 localStorage（行為不變）；backend 時讀快照。
  if (getMembershipGuardSource() === 'backend') {
    return computeMembershipFlags({ source: 'backend', localRole: role, snapshot: getBackendAuthSnapshot() }).isVipByRole;
  }
  return role === 'vip' || role === 'admin' || role === 'tester';
}

/** 是否為管理員 */
export function isAdmin(role: UserRole): boolean {
  if (getMembershipGuardSource() === 'backend') {
    return computeMembershipFlags({ source: 'backend', localRole: role, snapshot: getBackendAuthSnapshot() }).isAdmin;
  }
  return role === 'admin';
}

/** 是否為測試員 */
export function isTester(role: UserRole): boolean {
  if (getMembershipGuardSource() === 'backend') {
    return computeMembershipFlags({ source: 'backend', localRole: role, snapshot: getBackendAuthSnapshot() }).isTester;
  }
  return role === 'tester';
}

/** 是否為訪客 */
export function isGuest(role: UserRole): boolean {
  return role === 'guest';
}

// ---- 訂閱與角色同步檢查 (AUDIT D: 防止重複儲存) ----

/**
 * 檢查 subscription 狀態與 role 是否一致
 * 不一致時應觸發同步修正
 */
export function checkRoleSubscriptionSync(
  role: UserRole,
  subscription: SubscriptionRecord | null
): { isSync: boolean; shouldUpgrade: boolean; shouldDowngrade: boolean } {
  const hasActiveSub = subscription !== null && subscription.status === 'active';
  const isVipRole = role === 'vip';

  return {
    isSync: isVipRole === hasActiveSub || role === 'admin' || role === 'tester',
    shouldUpgrade: !isVipRole && hasActiveSub,   // 有訂閱但角色不是VIP
    shouldDowngrade: isVipRole && !hasActiveSub, // 角色是VIP但無訂閱
  };
}

// ---- 每日產號計算 ----

/**
 * 取得每日產號限制
 * 根據會員狀態返回對應限制
 */
export function getDailyGenerationLimit(state: MembershipState): number {
  if (state.isAdmin) return 9999;
  if (state.isVip) return 9999;
  if (state.isTester) return 9999;
  return 10; // free / guest
}

/**
 * 取得 AI 推薦限制
 */
export function getAILimit(state: MembershipState): number {
  if (state.isAdmin) return 10;
  if (state.isVip) return 5;
  return 1; // free / guest / tester
}

/**
 * 取得觀察池容量
 */
export function getObservationPoolLimit(state: MembershipState): number {
  if (state.isAdmin) return 100;
  if (state.isVip) return 50;
  return 10; // free
}

// ---- 權限快速查詢 ----

/**
 * 根據會員狀態生成權限配置
 * 這是 PERMISSIONS 的統一來源
 */
export function getPermissions(state: MembershipState): MembershipState['permissions'] {
  if (state.isAdmin || state.isTester) {
    return {
      maxDailyGenerations: 9999,
      maxAIGenerations: 10,
      maxObservationPool: 100,
      canUseDream: true,
      canUseMetaphysics: true,
      canUseAllMode: true,
      canExportCsv: true,
      canViewBacktest: true,
    };
  }

  if (state.isVip) {
    return {
      maxDailyGenerations: 9999,
      maxAIGenerations: 5,
      maxObservationPool: 50,
      canUseDream: true,
      canUseMetaphysics: true,
      canUseAllMode: true,
      canExportCsv: true,
      canViewBacktest: true,
    };
  }

  // free / guest
  return {
    maxDailyGenerations: 10,
    maxAIGenerations: 1,
    maxObservationPool: 10,
    canUseDream: false,
    canUseMetaphysics: false,
    canUseAllMode: false,
    canExportCsv: false,
    canViewBacktest: false,
  };
}
