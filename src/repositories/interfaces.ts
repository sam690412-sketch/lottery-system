// ============================================================
// V18.2.5 AUDIT B: Repository Interfaces
// 統一資料存取層，為 V19.0 Supabase 遷移預留接口
// 不修改既有功能，僅建立抽象層
// ============================================================

import type { UserAccount, AdminAccount, UserRole } from '@/utils/auth';
import type { SessionData } from '@/utils/authSession';
import type { PaymentRecord, SubscriptionRecord, PlanType } from '@/utils/paymentModel';
import type { AnalyticsEvent } from '@/utils/analytics';
import type { BehaviorStore } from '@/utils/behaviorTracker';
import type { FunnelSnapshot } from '@/utils/funnelAnalytics';
import type { IntentScore } from '@/utils/intentScore';

// ---- Storage Adapter Interface (AUDIT C) ----

export interface StorageAdapter {
  /** 取得資料 */
  get<T>(key: string): T | null;
  /** 儲存資料 */
  set<T>(key: string, value: T): void;
  /** 刪除資料 */
  remove(key: string): void;
  /** 清空所有資料 */
  clear(): void;
  /** 列出所有 keys */
  keys(): string[];
}

// ---- User Repository ----

export interface IUserRepository {
  // CRUD
  findByEmail(email: string): Promise<UserAccount | null>;
  findById(id: string): Promise<UserAccount | null>;
  save(user: UserAccount): Promise<void>;
  delete(email: string): Promise<void>;
  listAll(): Promise<UserAccount[]>;

  // VIP 操作
  upgradeRole(email: string, plan: PlanType): Promise<void>;
  downgradeRole(email: string): Promise<void>;
  resetVipTrial(email: string): Promise<void>;
  useVipTrial(email: string): Promise<number>;

  // 每日產號
  getDailyCount(email: string): Promise<{ used: number; date: string }>;
  incrementDailyCount(email: string): Promise<{ used: number; limit: number }>;
  resetDailyCount(email: string): Promise<void>;
}

// ---- Admin Repository ----

export interface IAdminRepository {
  findByUsername(username: string): Promise<AdminAccount | null>;
  save(admin: AdminAccount): Promise<void>;
  delete(username: string): Promise<void>;
  listAll(): Promise<AdminAccount[]>;
  exists(username: string): Promise<boolean>;
}

// ---- Session Repository ----

export interface ISessionRepository {
  // 會員 session
  getUserSession(): Promise<SessionData | null>;
  setUserSession(session: SessionData): Promise<void>;
  clearUserSession(): Promise<void>;

  // 管理員 session (legacy dual-track)
  getAdminSession(): Promise<SessionData | null>;
  setAdminSession(session: SessionData): Promise<void>;
  clearAdminSession(): Promise<void>;

  // 統一接口
  getActiveSession(): Promise<SessionData | null>;
  clearAllSessions(): Promise<void>;
}

// ---- Subscription Repository ----

export interface ISubscriptionRepository {
  // CRUD
  findActiveByUserId(userId: string): Promise<SubscriptionRecord | null>;
  findAllByUserId(userId: string): Promise<SubscriptionRecord[]>;
  save(sub: SubscriptionRecord): Promise<void>;
  updateStatus(subId: string, status: SubscriptionRecord['status']): Promise<void>;

  // 狀態查詢
  isActive(userId: string): Promise<boolean>;
  getDaysRemaining(userId: string): Promise<number>;
  getExpirationDate(userId: string): Promise<string | null>;

  // 續約/取消
  setAutoRenew(subId: string, autoRenew: boolean): Promise<void>;
  cancelAtPeriodEnd(subId: string): Promise<void>;
  cancelImmediately(subId: string): Promise<void>;
}

// ---- Payment Repository ----

export interface IPaymentRepository {
  // CRUD
  findById(paymentId: string): Promise<PaymentRecord | null>;
  findAllByUserId(userId: string): Promise<PaymentRecord[]>;
  save(payment: PaymentRecord): Promise<void>;
  updateStatus(paymentId: string, status: PaymentRecord['status']): Promise<void>;

  // 退款
  canRefund(paymentId: string): Promise<boolean>;
  requestRefund(paymentId: string, reason: string): Promise<void>;

  // 統計
  getTotalPaid(userId: string): Promise<number>;
  getRefundHistory(userId: string): Promise<PaymentRecord[]>;
}

// ---- Analytics Repository ----

export interface IAnalyticsRepository {
  // 事件
  addEvent(event: AnalyticsEvent): Promise<void>;
  listEvents(filter?: { type?: string; action?: string; since?: string }): Promise<AnalyticsEvent[]>;
  clearOldEvents(keepCount: number): Promise<void>;

  // 漏斗
  getFunnel(): Promise<FunnelSnapshot | null>;
  saveFunnel(funnel: FunnelSnapshot): Promise<void>;

  // 行為
  getBehavior(): Promise<BehaviorStore | null>;
  saveBehavior(behavior: BehaviorStore): Promise<void>;

  // Intent
  getIntent(): Promise<IntentScore | null>;
  saveIntent(intent: IntentScore): Promise<void>;

  // 統計
  getStats(): Promise<{
    totalEvents: number;
    paymentEvents: number;
    intentScore: number;
  }>;
}

// ---- Membership State (AUDIT D: 單一來源) ----

/** 會員完整狀態 - 所有權限相關資訊的單一來源 */
export interface MembershipState {
  // 身份
  userId: string;
  email: string;
  role: UserRole;
  nickname: string;

  // 權限
  permissions: {
    maxDailyGenerations: number;
    maxAIGenerations: number;
    maxObservationPool: number;
    canUseDream: boolean;
    canUseMetaphysics: boolean;
    canUseAllMode: boolean;
    canExportCsv: boolean;
    canViewBacktest: boolean;
  };

  // 試用
  trial: {
    remaining: number;
    used: boolean;
  };

  // 訂閱 (與 role='vip' 同步)
  subscription: {
    plan: PlanType | null;
    status: SubscriptionRecord['status'] | null;
    startedAt: string | null;
    expiresAt: string | null;
    daysRemaining: number;
    autoRenew: boolean;
  } | null;

  // 每日產號
  daily: {
    used: number;
    limit: number;
    date: string;
  };

  // 計算屬性
  isVip: boolean;
  isAdmin: boolean;
  isGuest: boolean;
  isTester: boolean;
  canRefund: boolean;
}

// ---- VIP 判定接口 (AUDIT E) ----

export interface IVipChecker {
  /** 統一 VIP 判定 - 依據 subscription 狀態而非僅 role */
  isVip(userId: string): Promise<boolean>;

  /** 依據 role 快速判定 (無需查詢 subscription) */
  isVipByRole(role: UserRole): boolean;

  /** 檢查特定功能是否可用 */
  canUseFeature(userId: string, feature: keyof MembershipState['permissions']): Promise<boolean>;

  /** 取得完整會員狀態 */
  getMembershipState(userId: string): Promise<MembershipState | null>;
}

// ---- Repository Factory ----

export interface IRepositoryFactory {
  getUserRepository(): IUserRepository;
  getAdminRepository(): IAdminRepository;
  getSessionRepository(): ISessionRepository;
  getSubscriptionRepository(): ISubscriptionRepository;
  getPaymentRepository(): IPaymentRepository;
  getAnalyticsRepository(): IAnalyticsRepository;
  getVipChecker(): IVipChecker;
  getStorageAdapter(): StorageAdapter;
}
