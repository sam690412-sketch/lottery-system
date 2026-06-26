// ============================================================
// V18.2.7 TASK A+B: Auth Storage Unified Layer
// 統一封裝所有認證相關 localStorage 操作
// 這是 auth.ts / authSession.ts 的唯一 localStorage 入口
// 未來切換 Supabase 時只需修改此文件
// ============================================================

import type { UserAccount, AdminAccount, UserSession } from '@/utils/auth';
import type { SessionData } from '@/utils/authSession';

// ---- Storage Keys 集中定義 ----
const KEYS = {
  USER_ACCOUNTS: 'lottery-v13-accounts',
  ADMIN_ACCOUNTS: 'lottery-v13-admin-accounts',
  USER_SESSION: 'lottery-v13-session',      // 會員 session (auth.ts 使用)
  ADMIN_SESSION: 'lottery-auth-session',     // 管理員/測試員 session (authSession.ts 使用)
  ADMIN_AUTH: 'lottery-admin-auth',
  VIP_TRIAL_LOG: 'lottery-v13-vip-trial-log',
  GUEST_COUNT_PREFIX: 'lottery-v13-guest-count',
} as const;

// ---- 會員帳號 CRUD ----

export function loadUserAccounts(): Record<string, UserAccount> {
  try {
    return JSON.parse(localStorage.getItem(KEYS.USER_ACCOUNTS) || '{}');
  } catch { return {}; }
}

export function saveUserAccounts(accounts: Record<string, UserAccount>): void {
  try { localStorage.setItem(KEYS.USER_ACCOUNTS, JSON.stringify(accounts)); } catch { /* ignore */ }
}

// ---- 管理員帳號 CRUD ----

export function loadAdminAccounts(): Record<string, AdminAccount> {
  try {
    return JSON.parse(localStorage.getItem(KEYS.ADMIN_ACCOUNTS) || '{}');
  } catch { return {}; }
}

export function saveAdminAccounts(accounts: Record<string, AdminAccount>): void {
  try { localStorage.setItem(KEYS.ADMIN_ACCOUNTS, JSON.stringify(accounts)); } catch { /* ignore */ }
}

// ---- Session (lottery-v13-session) ----

export function loadUserSession(): (UserSession & { type?: string }) | null {
  try {
    const raw = localStorage.getItem(KEYS.USER_SESSION);
    if (!raw || raw === 'null') return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function saveUserSession(session: UserSession & { type?: string }): void {
  try { localStorage.setItem(KEYS.USER_SESSION, JSON.stringify({ type: 'user', ...session })); } catch { /* ignore */ }
}

export function removeUserSession(): void {
  localStorage.removeItem(KEYS.USER_SESSION);
}

// ---- Session (lottery-auth-session) ----

export function loadAdminSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(KEYS.ADMIN_SESSION);
    if (!raw) return null;
    const session: SessionData = JSON.parse(raw);
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      removeAdminSession();
      return null;
    }
    return session;
  } catch { return null; }
}

export function saveAdminSession(session: SessionData): void {
  try { localStorage.setItem(KEYS.ADMIN_SESSION, JSON.stringify(session)); } catch { /* ignore */ }
}

export function removeAdminSession(): void {
  localStorage.removeItem(KEYS.ADMIN_SESSION);
}

// ---- 統一 Session 查詢 ----

export function loadAnySession(): { type: 'user' | 'admin'; data: unknown } | null {
  const userSess = loadUserSession();
  if (userSess) return { type: 'user', data: userSess };
  const adminSess = loadAdminSession();
  if (adminSess) return { type: 'admin', data: adminSess };
  return null;
}

export function clearAllSessions(): void {
  removeUserSession();
  removeAdminSession();
  try { localStorage.removeItem(KEYS.ADMIN_AUTH); } catch { /* ignore */ }
}

// ---- VIP 體驗日誌 ----

export function loadVipTrialLog(): Array<{ email: string; usedAt: string; remaining: number }> {
  try {
    return JSON.parse(localStorage.getItem(KEYS.VIP_TRIAL_LOG) || '[]');
  } catch { return []; }
}

export function saveVipTrialLog(log: Array<{ email: string; usedAt: string; remaining: number }>): void {
  try { localStorage.setItem(KEYS.VIP_TRIAL_LOG, JSON.stringify(log)); } catch { /* ignore */ }
}

// ---- 訪客計數 ----

export function getGuestCountKey(date: string): string {
  return `${KEYS.GUEST_COUNT_PREFIX}:${date}`;
}

export function loadGuestCount(date: string): number {
  try {
    return parseInt(localStorage.getItem(getGuestCountKey(date)) || '0', 10);
  } catch { return 0; }
}

export function saveGuestCount(date: string, count: number): void {
  try { localStorage.setItem(getGuestCountKey(date), String(count)); } catch { /* ignore */ }
}

// ---- 管理員認證 (legacy) ----

export function loadAdminAuth(): { type: string; username: string; forcePasswordChange?: boolean } | null {
  try {
    const raw = localStorage.getItem(KEYS.ADMIN_AUTH);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function saveAdminAuth(auth: { type: string; username: string; forcePasswordChange?: boolean }): void {
  try { localStorage.setItem(KEYS.ADMIN_AUTH, JSON.stringify(auth)); } catch { /* ignore */ }
}

export function removeAdminAuth(): void {
  localStorage.removeItem(KEYS.ADMIN_AUTH);
}

// ---- 通用原始操作（給 getSessionInfo 等需要 raw 值的場景） ----

export function getRawSession(key: 'user' | 'admin'): string | null {
  const k = key === 'user' ? KEYS.USER_SESSION : KEYS.ADMIN_SESSION;
  try { return localStorage.getItem(k); } catch { return null; }
}

export function getStorageKey(key: 'user' | 'admin'): string {
  return key === 'user' ? KEYS.USER_SESSION : KEYS.ADMIN_SESSION;
}
