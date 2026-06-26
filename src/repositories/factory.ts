// ============================================================
// V18.2.6 TASK G: Repository Factory
// 統一創建 Repository 實例
// 支援: localStorage / memory
// 不啟用 Supabase
// ============================================================

import type { IRepositoryFactory, IVipChecker } from './interfaces';
import { LocalStorageAdapter } from './adapters';
import {
  LocalStorageUserRepository,
  LocalStorageAdminRepository,
  LocalStorageSessionRepository,
  LocalStorageSubscriptionRepository,
  LocalStoragePaymentRepository,
  LocalStorageAnalyticsRepository,
} from './localStorageRepositories';
import { isVipByRole } from './membershipState';

/** VipChecker 簡易實作 */
const vipChecker: IVipChecker = {
  isVip: async (_userId: string) => { return false; }, // 簡化：未來整合 subscription
  isVipByRole: (role) => isVipByRole(role),
  canUseFeature: async () => false,
  getMembershipState: async () => null,
};

/** 建立 Repository Factory */
export function createRepositoryFactory(_type: 'localStorage' | 'memory'): IRepositoryFactory {
  return new LocalStorageFactory();
}

/** LocalStorage Factory 實作 */
class LocalStorageFactory implements IRepositoryFactory {
  private userRepo = new LocalStorageUserRepository();
  private adminRepo = new LocalStorageAdminRepository();
  private sessionRepo = new LocalStorageSessionRepository();
  private subRepo = new LocalStorageSubscriptionRepository();
  private paymentRepo = new LocalStoragePaymentRepository();
  private analyticsRepo = new LocalStorageAnalyticsRepository();

  getUserRepository() { return this.userRepo; }
  getAdminRepository() { return this.adminRepo; }
  getSessionRepository() { return this.sessionRepo; }
  getSubscriptionRepository() { return this.subRepo; }
  getPaymentRepository() { return this.paymentRepo; }
  getAnalyticsRepository() { return this.analyticsRepo; }
  getVipChecker() { return vipChecker; }
  getStorageAdapter() { return new LocalStorageAdapter(); }
}

/** 預設 Factory 實例 (localStorage) */
export const defaultFactory = createRepositoryFactory('localStorage');
