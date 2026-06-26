// ============================================================
// V18.2.6 TASK A-F: LocalStorage Repository Implementations
// 將 V18.2.5 設計的接口實作為 LocalStorage 版本
// 統一取代散落的 localStorage 直接存取
// ============================================================

import type {
  IUserRepository, IAdminRepository, ISessionRepository,
  ISubscriptionRepository, IPaymentRepository, IAnalyticsRepository,
} from './interfaces';
import type { UserAccount, AdminAccount } from '@/utils/auth';
import type { SessionData } from '@/utils/authSession';
import type { PaymentRecord, SubscriptionRecord, PlanType } from '@/utils/paymentModel';
import type { AnalyticsEvent } from '@/utils/analytics';
import type { BehaviorStore } from '@/utils/behaviorTracker';
import type { IntentScore } from '@/utils/intentScore';
import type { FunnelSnapshot } from '@/utils/funnelAnalytics';
import { STORAGE_KEYS } from './membershipState';

// ============================================================
// TASK A: LocalStorageUserRepository
// ============================================================

export class LocalStorageUserRepository implements IUserRepository {
  private get accounts(): Record<string, UserAccount> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_ACCOUNTS) || '{}');
    } catch { return {}; }
  }
  private set accounts(data: Record<string, UserAccount>) {
    localStorage.setItem(STORAGE_KEYS.USER_ACCOUNTS, JSON.stringify(data));
  }

  async findByEmail(email: string): Promise<UserAccount | null> {
    return this.accounts[email] || null;
  }

  async findById(id: string): Promise<UserAccount | null> {
    return Object.values(this.accounts).find(u => u.id === id) || null;
  }

  async save(user: UserAccount): Promise<void> {
    const acc = this.accounts;
    acc[user.email] = user;
    this.accounts = acc;
  }

  async delete(email: string): Promise<void> {
    const acc = this.accounts;
    delete acc[email];
    this.accounts = acc;
  }

  async listAll(): Promise<UserAccount[]> {
    return Object.values(this.accounts);
  }

  async upgradeRole(email: string, _plan: PlanType): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) return;
    user.role = 'vip';
    await this.save(user);
  }

  async downgradeRole(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) return;
    user.role = 'free';
    await this.save(user);
  }

  async resetVipTrial(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) return;
    user.vipTrialRemaining = 3;
    await this.save(user);
  }

  async useVipTrial(email: string): Promise<number> {
    const user = await this.findByEmail(email);
    if (!user || user.vipTrialRemaining <= 0) return 0;
    user.vipTrialRemaining--;
    await this.save(user);
    return user.vipTrialRemaining;
  }

  async getDailyCount(email: string): Promise<{ used: number; date: string }> {
    const user = await this.findByEmail(email);
    if (!user) return { used: 0, date: '' };
    return {
      used: user.dailyGenerateCount,
      date: user.dailyCountDate,
    };
  }

  async incrementDailyCount(email: string): Promise<{ used: number; limit: number }> {
    const user = await this.findByEmail(email);
    if (!user) return { used: 0, limit: 10 };
    const today = new Date().toISOString().slice(0, 10);
    if (user.dailyCountDate !== today) {
      user.dailyCountDate = today;
      user.dailyGenerateCount = 0;
    }
    user.dailyGenerateCount++;
    await this.save(user);
    const limit = user.role === 'vip' || user.role === 'admin' || user.role === 'tester' ? 9999 : 10;
    return { used: user.dailyGenerateCount, limit };
  }

  async resetDailyCount(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) return;
    user.dailyGenerateCount = 0;
    user.dailyCountDate = '';
    await this.save(user);
  }
}

// ============================================================
// TASK B: LocalStorageAdminRepository
// ============================================================

export class LocalStorageAdminRepository implements IAdminRepository {
  private get admins(): Record<string, AdminAccount> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMIN_ACCOUNTS) || '{}');
    } catch { return {}; }
  }
  private set admins(data: Record<string, AdminAccount>) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_ACCOUNTS, JSON.stringify(data));
  }

  async findByUsername(username: string): Promise<AdminAccount | null> {
    return this.admins[username] || null;
  }

  async save(admin: AdminAccount): Promise<void> {
    const acc = this.admins;
    acc[admin.username] = admin;
    this.admins = acc;
  }

  async delete(username: string): Promise<void> {
    const acc = this.admins;
    delete acc[username];
    this.admins = acc;
  }

  async listAll(): Promise<AdminAccount[]> {
    return Object.values(this.admins);
  }

  async exists(username: string): Promise<boolean> {
    return !!this.admins[username];
  }
}

// ============================================================
// TASK C: LocalStorageSessionRepository
// ============================================================

export class LocalStorageSessionRepository implements ISessionRepository {
  private readonly USER_SESSION_KEY = STORAGE_KEYS.SESSION;
  private readonly ADMIN_SESSION_KEY = STORAGE_KEYS.AUTH_SESSION;

  async getUserSession(): Promise<SessionData | null> {
    try {
      const raw = localStorage.getItem(this.USER_SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as SessionData;
      if (new Date(s.expiresAt).getTime() < Date.now()) {
        await this.clearUserSession();
        return null;
      }
      return s;
    } catch { return null; }
  }

  async setUserSession(session: SessionData): Promise<void> {
    localStorage.setItem(this.USER_SESSION_KEY, JSON.stringify(session));
  }

  async clearUserSession(): Promise<void> {
    localStorage.removeItem(this.USER_SESSION_KEY);
  }

  async getAdminSession(): Promise<SessionData | null> {
    try {
      const raw = localStorage.getItem(this.ADMIN_SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as SessionData;
      if (new Date(s.expiresAt).getTime() < Date.now()) {
        await this.clearAdminSession();
        return null;
      }
      return s;
    } catch { return null; }
  }

  async setAdminSession(session: SessionData): Promise<void> {
    localStorage.setItem(this.ADMIN_SESSION_KEY, JSON.stringify(session));
  }

  async clearAdminSession(): Promise<void> {
    localStorage.removeItem(this.ADMIN_SESSION_KEY);
  }

  async getActiveSession(): Promise<SessionData | null> {
    return (await this.getUserSession()) || (await this.getAdminSession()) || null;
  }

  async clearAllSessions(): Promise<void> {
    await this.clearUserSession();
    await this.clearAdminSession();
  }
}

// ============================================================
// TASK D: LocalStorageSubscriptionRepository
// ============================================================

export class LocalStorageSubscriptionRepository implements ISubscriptionRepository {
  private get subs(): SubscriptionRecord[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS) || '[]');
    } catch { return []; }
  }
  private set subs(data: SubscriptionRecord[]) {
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(data));
  }

  async findActiveByUserId(userId: string): Promise<SubscriptionRecord | null> {
    return this.subs.find(s => s.userId === userId && (s.status === 'active' || s.status === 'trial')) || null;
  }

  async findAllByUserId(userId: string): Promise<SubscriptionRecord[]> {
    return this.subs.filter(s => s.userId === userId);
  }

  async save(sub: SubscriptionRecord): Promise<void> {
    const all = this.subs;
    const idx = all.findIndex(s => s.id === sub.id);
    if (idx >= 0) all[idx] = sub;
    else all.push(sub);
    this.subs = all;
  }

  async updateStatus(subId: string, status: SubscriptionRecord['status']): Promise<void> {
    const all = this.subs;
    const idx = all.findIndex(s => s.id === subId);
    if (idx >= 0) {
      all[idx].status = status;
      this.subs = all;
    }
  }

  async isActive(userId: string): Promise<boolean> {
    const sub = await this.findActiveByUserId(userId);
    if (!sub) return false;
    return new Date(sub.expiresAt).getTime() > Date.now();
  }

  async getDaysRemaining(userId: string): Promise<number> {
    const sub = await this.findActiveByUserId(userId);
    if (!sub) return 0;
    return Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  }

  async getExpirationDate(userId: string): Promise<string | null> {
    const sub = await this.findActiveByUserId(userId);
    return sub?.expiresAt || null;
  }

  async setAutoRenew(subId: string, autoRenew: boolean): Promise<void> {
    const all = this.subs;
    const idx = all.findIndex(s => s.id === subId);
    if (idx >= 0) {
      all[idx].autoRenew = autoRenew;
      this.subs = all;
    }
  }

  async cancelAtPeriodEnd(subId: string): Promise<void> {
    const all = this.subs;
    const idx = all.findIndex(s => s.id === subId);
    if (idx >= 0) {
      all[idx].cancelAtPeriodEnd = true;
      all[idx].autoRenew = false;
      this.subs = all;
    }
  }

  async cancelImmediately(subId: string): Promise<void> {
    await this.updateStatus(subId, 'canceled');
    const all = this.subs;
    const idx = all.findIndex(s => s.id === subId);
    if (idx >= 0) {
      all[idx].canceledAt = new Date().toISOString();
      all[idx].autoRenew = false;
      this.subs = all;
    }
  }
}

// ============================================================
// TASK E: LocalStoragePaymentRepository
// ============================================================

export class LocalStoragePaymentRepository implements IPaymentRepository {
  private get payments(): PaymentRecord[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) || '[]');
    } catch { return []; }
  }
  private set payments(data: PaymentRecord[]) {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(data));
  }

  async findById(paymentId: string): Promise<PaymentRecord | null> {
    return this.payments.find(p => p.id === paymentId) || null;
  }

  async findAllByUserId(userId: string): Promise<PaymentRecord[]> {
    return this.payments.filter(p => p.userId === userId);
  }

  async save(payment: PaymentRecord): Promise<void> {
    const all = this.payments;
    const idx = all.findIndex(p => p.id === payment.id);
    if (idx >= 0) all[idx] = payment;
    else all.push(payment);
    this.payments = all;
  }

  async updateStatus(paymentId: string, status: PaymentRecord['status']): Promise<void> {
    const all = this.payments;
    const idx = all.findIndex(p => p.id === paymentId);
    if (idx >= 0) {
      all[idx].status = status;
      this.payments = all;
    }
  }

  async canRefund(paymentId: string): Promise<boolean> {
    const p = await this.findById(paymentId);
    if (!p || p.status !== 'completed') return false;
    const daysSince = (Date.now() - new Date(p.completedAt || p.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    return daysSince <= 7;
  }

  async requestRefund(paymentId: string, reason: string): Promise<void> {
    if (!(await this.canRefund(paymentId))) return;
    await this.updateStatus(paymentId, 'refunded');
    const all = this.payments;
    const idx = all.findIndex(p => p.id === paymentId);
    if (idx >= 0) {
      all[idx].refundedAt = new Date().toISOString();
      all[idx].refundReason = reason;
      this.payments = all;
    }
  }

  async getTotalPaid(userId: string): Promise<number> {
    return this.payments
      .filter(p => p.userId === userId && p.status === 'completed')
      .reduce((s, p) => s + p.amount, 0);
  }

  async getRefundHistory(userId: string): Promise<PaymentRecord[]> {
    return this.payments.filter(p => p.userId === userId && p.status === 'refunded');
  }
}

// ============================================================
// TASK F: LocalStorageAnalyticsRepository
// ============================================================

const ANALYTICS_KEY = STORAGE_KEYS.ANALYTICS;
const BEHAVIOR_KEY = STORAGE_KEYS.BEHAVIOR;
const FUNNEL_KEY = STORAGE_KEYS.FUNNEL;
const INTENT_KEY = STORAGE_KEYS.INTENT;

export class LocalStorageAnalyticsRepository implements IAnalyticsRepository {
  async addEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const events: AnalyticsEvent[] = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
      events.push(event);
      // 只保留最近 500 條
      if (events.length > 500) events.splice(0, events.length - 500);
      localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events));
    } catch { /* ignore */ }
  }

  async listEvents(filter?: { type?: string; action?: string; since?: string }): Promise<AnalyticsEvent[]> {
    try {
      const events: AnalyticsEvent[] = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
      return events.filter(e => {
        if (filter?.type && e.type !== filter.type) return false;
        if (filter?.action && e.action !== filter.action) return false;
        if (filter?.since && e.timestamp < filter.since) return false;
        return true;
      });
    } catch { return []; }
  }

  async clearOldEvents(keepCount: number): Promise<void> {
    try {
      const events: AnalyticsEvent[] = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
      if (events.length > keepCount) {
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events.slice(-keepCount)));
      }
    } catch { /* ignore */ }
  }

  async getFunnel(): Promise<FunnelSnapshot | null> {
    try {
      const raw = localStorage.getItem(FUNNEL_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  async saveFunnel(funnel: FunnelSnapshot): Promise<void> {
    localStorage.setItem(FUNNEL_KEY, JSON.stringify(funnel));
  }

  async getBehavior(): Promise<BehaviorStore | null> {
    try {
      const raw = localStorage.getItem(BEHAVIOR_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  async saveBehavior(behavior: BehaviorStore): Promise<void> {
    localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(behavior));
  }

  async getIntent(): Promise<IntentScore | null> {
    try {
      const raw = localStorage.getItem(INTENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  async saveIntent(intent: IntentScore): Promise<void> {
    localStorage.setItem(INTENT_KEY, JSON.stringify(intent));
  }

  async getStats(): Promise<{ totalEvents: number; paymentEvents: number; intentScore: number }> {
    try {
      const events: AnalyticsEvent[] = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
      const intent: IntentScore | null = await this.getIntent();
      return {
        totalEvents: events.length,
        paymentEvents: events.filter(e => e.type === 'payment').length,
        intentScore: intent?.score || 0,
      };
    } catch {
      return { totalEvents: 0, paymentEvents: 0, intentScore: 0 };
    }
  }
}
