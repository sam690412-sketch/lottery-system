// ============================================================
// V18.2.7: 登入 Session 持久化 - 自我修复 + 完整验证
// 所有 localStorage 操作已遷移到 authStorage.ts
// ============================================================

import type { UserRole } from './auth';
import * as authStorage from '@/repositories/authStorage';

export interface SessionData {
  userId: string;
  username: string;
  nickname: string;
  role: UserRole;
  loginAt: string;
  expiresAt: string;
}

/** 儲存 session */
export function saveSession(data: Omit<SessionData, 'loginAt' | 'expiresAt'>): void {
  const now = Date.now();
  const session: SessionData = {
    ...data,
    loginAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天過期
  };
  authStorage.saveAdminSession(session);
}

/** 載入 session */
export function loadSession(): SessionData | null {
  return authStorage.loadAdminSession();
}

/** 清除 session */
export function clearSession(): void {
  authStorage.removeAdminSession();
}

/** 驗證 session 資料結構是否完整 */
export function validateSessionUser(session: SessionData | null): session is SessionData {
  if (!session) return false;
  if (!session.userId || typeof session.userId !== 'string') return false;
  if (!session.username || typeof session.username !== 'string') return false;
  if (!session.nickname || typeof session.nickname !== 'string') return false;
  if (!session.role || typeof session.role !== 'string') return false;
  if (!session.loginAt || typeof session.loginAt !== 'string') return false;
  if (!session.expiresAt || typeof session.expiresAt !== 'string') return false;
  // role 必須是有效值
  if (!['admin', 'tester', 'vip', 'free'].includes(session.role)) return false;
  // 檢查過期
  if (new Date(session.expiresAt).getTime() < Date.now()) return false;
  return true;
}

/** 更新 session 中的 username（當管理員改帳號時同步） */
export function updateSessionUsername(newUsername: string): boolean {
  try {
    const session = authStorage.loadAdminSession();
    if (!session) return false;
    session.username = newUsername;
    session.userId = `admin-${newUsername}`;
    // 保留原過期時間或重新設定
    const now = Date.now();
    session.loginAt = new Date(now).toISOString();
    session.expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    authStorage.saveAdminSession(session);
    return true;
  } catch {
    return false;
  }
}

/** 是否已登入 */
export function isLoggedIn(): boolean {
  return loadSession() !== null;
}

/** 取得當前角色 */
export function getCurrentRole(): UserRole {
  const session = loadSession();
  return session?.role || 'guest';
}

/** 取得當前使用者名稱 */
export function getCurrentUsername(): string {
  const session = loadSession();
  return session?.username || '';
}

/** 是否為管理員 */
export function isAdminSession(): boolean {
  return getCurrentRole() === 'admin';
}

/** 是否為測試員 */
export function isTesterSession(): boolean {
  return getCurrentRole() === 'tester';
}

/** 是否已過期 */
export function isSessionExpired(): boolean {
  const session = loadSession();
  if (!session) return true;
  return new Date(session.expiresAt).getTime() < Date.now();
}

/** 取得完整的 session 資訊（給 Debug 用） */
export function getSessionInfo(): {
  exists: boolean;
  username: string;
  role: string;
  userId: string;
  loginAt: string;
  expiresAt: string;
  isValid: boolean;
  isExpired: boolean;
  storageKey: string;
  raw: string | null;
} {
  const raw = authStorage.getRawSession('admin');
  const session = loadSession();
  const isValid = validateSessionUser(session);
  return {
    exists: !!raw,
    username: session?.username || '',
    role: session?.role || 'guest',
    userId: session?.userId || '',
    loginAt: session?.loginAt || '',
    expiresAt: session?.expiresAt || '',
    isValid,
    isExpired: !isValid && !!session,
    storageKey: authStorage.getStorageKey('admin'),
    raw,
  };
}
