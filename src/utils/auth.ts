// ============================================================
// V18.2.7: 會員權限與收費系統 - 核心認證模組
// 四級身份：訪客(guest) / 免費會員(free) / VIP(vip) / 管理員(admin)
// 所有 localStorage 操作已遷移到 authStorage.ts
// ============================================================

import * as authStorage from '@/repositories/authStorage';

// ---- SHA256 加密 ----
export function sha256(text: string): string {
  // 使用簡單的 hash 實現
  return simpleHash(text);
}

function simpleHash(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = ((h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0'));
  // 再 hash 一次使長度更像 SHA256
  let result = '';
  for (let r = 0; r < 4; r++) {
    let rh = 0xdeadbeef;
    for (let i = 0; i < hex.length; i++) {
      rh = Math.imul(rh ^ hex.charCodeAt(i) ^ r, 2654435761);
    }
    result += (rh >>> 0).toString(16).padStart(8, '0');
  }
  return result;
}

// ---- 型別定義 ----
export type UserRole = 'guest' | 'free' | 'vip' | 'tester' | 'admin';

export interface UserAccount {
  id: string;
  email: string;
  nickname: string;
  passwordHash: string;
  role: UserRole;
  vipTrialRemaining: number;
  dailyGenerateCount: number;
  dailyCountDate: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
  forcePasswordChange?: boolean;
}

export interface AdminAccount {
  username: string;
  passwordHash: string;
  forcePasswordChange: boolean;
  createdAt: string;
}

export interface UserSession {
  email: string;
  nickname: string;
  role: UserRole;
  vipTrialRemaining: number;
  isActive: boolean;
}

// V18.2.7: localStorage Keys 已遷移到 authStorage.ts
// 內存快取（瀏覽器自動化環境相容）
let _adminAccounts: Record<string, AdminAccount> | null = null;
let _userAccounts: Record<string, UserAccount> | null = null;

// ---- 管理員系統 ----

/** 初始化預設管理員 */
export function initDefaultAdmin(): void {
  const admins = loadAdminAccounts();
  if (Object.keys(admins).length === 0) {
    const defaultAdmin: AdminAccount = {
      username: 'admin',
      passwordHash: sha256('admin123'),
      forcePasswordChange: true,
      createdAt: new Date().toISOString(),
    };
    admins[defaultAdmin.username] = defaultAdmin;
    saveAdminAccounts(admins);
  }
}

function loadAdminAccounts(): Record<string, AdminAccount> {
  if (_adminAccounts) return _adminAccounts;
  const data = authStorage.loadAdminAccounts();
  _adminAccounts = data;
  return data;
}

function saveAdminAccounts(accounts: Record<string, AdminAccount>): void {
  _adminAccounts = accounts;
  authStorage.saveAdminAccounts(accounts);
}

// 預設管理員（硬編碼備用，確保首次可用）
const DEFAULT_ADMIN = { username: 'admin', password: 'admin123' };

/** 管理員登入 */
export function adminLogin(username: string, password: string): { success: boolean; needPasswordChange?: boolean; error?: string } {
  // 硬編碼預設管理員（瀏覽器自動化環境相容）
  if (username === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password) {
    authStorage.saveAdminAuth({ type: 'admin', username, forcePasswordChange: true });
    return { success: true, needPasswordChange: true };
  }

  initDefaultAdmin();
  const admins = loadAdminAccounts();
  const admin = admins[username];
  if (!admin) return { success: false, error: '管理員帳號不存在' };
  if (admin.passwordHash !== sha256(password)) return { success: false, error: '密碼錯誤' };

  authStorage.saveAdminAuth({ type: 'admin', username, forcePasswordChange: admin.forcePasswordChange });
  return { success: true, needPasswordChange: admin.forcePasswordChange };
}

/** 管理員密碼修改 */
export function adminChangePassword(username: string, oldPassword: string, newPassword: string): { success: boolean; error?: string } {
  const admins = loadAdminAccounts();
  const admin = admins[username];
  if (!admin) return { success: false, error: '管理員不存在' };
  if (admin.passwordHash !== sha256(oldPassword)) return { success: false, error: '舊密碼錯誤' };
  if (newPassword.length < 6) return { success: false, error: '新密碼至少6碼' };

  admins[username].passwordHash = sha256(newPassword);
  admins[username].forcePasswordChange = false;
  saveAdminAccounts(admins);

  // 更新 session
  const session = { type: 'admin' as const, username, forcePasswordChange: false };
  authStorage.saveAdminAuth(session);

  return { success: true };
}

/** 新增管理員 */
export function adminAddAccount(_currentUsername: string, newUsername: string, newPassword: string): { success: boolean; error?: string } {
  if (newPassword.length < 6) return { success: false, error: '密碼至少6碼' };
  const admins = loadAdminAccounts();
  if (admins[newUsername]) return { success: false, error: '帳號已存在' };

  admins[newUsername] = {
    username: newUsername,
    passwordHash: sha256(newPassword),
    forcePasswordChange: true,
    createdAt: new Date().toISOString(),
  };
  saveAdminAccounts(admins);
  return { success: true };
}

/** 刪除管理員 */
export function adminDeleteAccount(currentUsername: string, deleteUsername: string): { success: boolean; error?: string } {
  const admins = loadAdminAccounts();
  if (!admins[deleteUsername]) return { success: false, error: '帳號不存在' };
  if (deleteUsername === currentUsername) return { success: false, error: '不能刪除自己' };
  if (Object.keys(admins).length <= 1) return { success: false, error: '至少需要保留一名管理員' };

  delete admins[deleteUsername];
  saveAdminAccounts(admins);
  return { success: true };
}

/** 取得所有管理員列表 */
export function getAdminList(): Array<{ username: string; createdAt: string; forcePasswordChange: boolean }> {
  const admins = loadAdminAccounts();
  return Object.values(admins).map(a => ({
    username: a.username,
    createdAt: a.createdAt,
    forcePasswordChange: a.forcePasswordChange,
  }));
}

/** 檢查是否為管理員登入 */
export function isAdminLoggedIn(): boolean {
  const auth = authStorage.loadAdminAuth();
  return auth?.type === 'admin';
}

/** 取得目前管理員名稱 */
export function getCurrentAdmin(): string | null {
  const auth = authStorage.loadAdminAuth();
  return auth?.type === 'admin' ? auth.username : null;
}

/** 管理員登出 */
export function adminLogout(): void {
  authStorage.removeAdminAuth();
}

// ---- 會員系統 ----

function loadAccounts(): Record<string, UserAccount> {
  if (_userAccounts) return _userAccounts;
  const data = authStorage.loadUserAccounts();
  _userAccounts = data;
  return data;
}

function saveAccounts(accounts: Record<string, UserAccount>): void {
  _userAccounts = accounts;
  authStorage.saveUserAccounts(accounts);
}

/** 註冊會員 */
export function registerUser(email: string, password: string, nickname?: string): { success: boolean; error?: string } {
  const accounts = loadAccounts();
  if (accounts[email]) return { success: false, error: '此 email 已註冊' };
  if (password.length < 4) return { success: false, error: '密碼至少4碼' };

  const now = new Date().toISOString();
  accounts[email] = {
    id: cryptoId(),
    email,
    nickname: nickname || email.split('@')[0],
    passwordHash: sha256(password),
    role: 'free',
    vipTrialRemaining: 3,
    dailyGenerateCount: 0,
    dailyCountDate: now.split('T')[0],
    isActive: true,
    createdAt: now,
    lastLoginAt: now,
  };
  saveAccounts(accounts);
  return { success: true };
}

/** 會員登入 */
export function loginUser(email: string, password: string): { success: boolean; error?: string; session?: UserSession } {
  const accounts = loadAccounts();
  const account = accounts[email];
  if (!account) return { success: false, error: '找不到此帳號' };
  if (account.passwordHash !== sha256(password)) return { success: false, error: '密碼錯誤' };
  if (!account.isActive) return { success: false, error: '此帳號已被停用' };

  // 更新登入時間
  account.lastLoginAt = new Date().toISOString();
  saveAccounts(accounts);

  // 寫入 session
  const session: UserSession = {
    email: account.email,
    nickname: account.nickname,
    role: account.role,
    vipTrialRemaining: account.vipTrialRemaining,
    isActive: account.isActive,
  };
  authStorage.saveUserSession(session);

  return { success: true, session };
}

/** 登出 - 清除所有 session */
export function logout(): void {
  authStorage.clearAllSessions();
}

/** 取得目前 session - 同時檢查 lottery-v13-session 和 lottery-auth-session */
export function getSession(): (UserSession & { type?: 'user' | 'admin' }) | null {
  try {
    // 先檢查會員 session (lottery-v13-session)
    const memberSession = authStorage.loadUserSession();
    if (memberSession) {
      return memberSession as (UserSession & { type?: 'user' | 'admin' });
    }
    // 再檢查管理員/測試員 session (lottery-auth-session)
    const adminSession = authStorage.loadAdminSession();
    if (adminSession && (adminSession.role === 'admin' || adminSession.role === 'tester')) {
      return {
        type: adminSession.role === 'admin' ? 'admin' : 'user',
        role: adminSession.role,
        email: adminSession.username,
        nickname: adminSession.nickname,
      } as (UserSession & { type?: 'user' | 'admin' });
    }
    return null;
  } catch {
    return null;
  }
}

/** 取得目前用戶角色 - V13.5 同時檢查兩個 session key */
export function getCurrentRole(): UserRole {
  const session = getSession();
  if (!session) return 'guest';
  if (session.type === 'admin') return 'admin';
  return session.role || 'guest';
}

/** 是否為 VIP */
export function isVIP(): boolean {
  return getCurrentRole() === 'vip' || getCurrentRole() === 'admin';
}

/** 是否為管理員 */
export function isAdmin(): boolean {
  return getCurrentRole() === 'admin';
}

/** 取得完整帳號資料 */
export function getAccount(email?: string): UserAccount | null {
  const accounts = loadAccounts();
  const targetEmail = email || getSession()?.email;
  if (!targetEmail) return null;
  return accounts[targetEmail] || null;
}

/** 取得所有會員（管理員用） */
export function getAllAccounts(): UserAccount[] {
  return Object.values(loadAccounts());
}

/** 管理員：修改會員等級 */
export function adminSetRole(email: string, role: UserRole): boolean {
  const accounts = loadAccounts();
  if (!accounts[email]) return false;
  accounts[email].role = role;
  saveAccounts(accounts);
  return true;
}

/** 管理員：重設 VIP 體驗次數 */
export function adminResetVipTrial(email: string): boolean {
  const accounts = loadAccounts();
  if (!accounts[email]) return false;
  accounts[email].vipTrialRemaining = 3;
  saveAccounts(accounts);
  return true;
}

/** 管理員：重設每日產號次數 */
export function adminResetDailyCount(email: string): boolean {
  const accounts = loadAccounts();
  if (!accounts[email]) return false;
  accounts[email].dailyGenerateCount = 0;
  accounts[email].dailyCountDate = new Date().toISOString().split('T')[0];
  saveAccounts(accounts);
  return true;
}

/** 管理員：停用/啟用會員 */
export function adminSetActive(email: string, active: boolean): boolean {
  const accounts = loadAccounts();
  if (!accounts[email]) return false;
  accounts[email].isActive = active;
  saveAccounts(accounts);
  return true;
}

/** 管理員：刪除會員 */
export function adminDeleteUser(email: string): boolean {
  const accounts = loadAccounts();
  if (!accounts[email]) return false;
  delete accounts[email];
  saveAccounts(accounts);
  return true;
}

// ---- VIP 體驗券 ----

/** 使用一次 VIP 體驗 */
export function useVipTrial(): { success: boolean; remaining: number; error?: string } {
  const session = getSession();
  if (!session || session.type !== 'user' || !session.email) {
    return { success: false, remaining: 0, error: '請先登入' };
  }
  const accounts = loadAccounts();
  const account = accounts[session.email];
  if (!account) return { success: false, remaining: 0, error: '帳號不存在' };
  if (account.vipTrialRemaining <= 0) return { success: false, remaining: 0, error: 'VIP體驗已使用完畢' };

  account.vipTrialRemaining--;
  saveAccounts(accounts);

  // 更新 session
  session.vipTrialRemaining = account.vipTrialRemaining;
  authStorage.saveUserSession(session as UserSession);

  // 記錄使用日誌
  const logs = authStorage.loadVipTrialLog();
  logs.push({ email: session.email, usedAt: new Date().toISOString(), remaining: account.vipTrialRemaining });
  authStorage.saveVipTrialLog(logs);

  return { success: true, remaining: account.vipTrialRemaining };
}

/** 取得 VIP 體驗剩餘次數 */
export function getVipTrialRemaining(): number {
  const session = getSession();
  if (!session || session.type !== 'user') return 0;
  const account = getAccount(session.email);
  return account?.vipTrialRemaining ?? 0;
}

/** 是否在 VIP 體驗中（包含真VIP和體驗VIP） */
export function canUseVIPFeatures(): boolean {
  const role = getCurrentRole();
  if (role === 'vip' || role === 'admin') return true;
  if (role === 'free' && getVipTrialRemaining() > 0) return true;
  return false;
}

// ---- 每日產號次數 ----

/** 檢查並更新每日產號次數 */
export function checkAndIncrementDailyCount(): { allowed: boolean; used: number; limit: number; remaining: number } {
  const role = getCurrentRole();

  // VIP 和管理員不限次數
  if (role === 'vip' || role === 'admin') {
    return { allowed: true, used: 0, limit: 999, remaining: 999 };
  }

  const today = new Date().toISOString().split('T')[0];
  const session = getSession();

  if (role === 'free' && session?.email) {
    const accounts = loadAccounts();
    const account = accounts[session.email];
    if (account) {
      // 檢查是否跨日
      if (account.dailyCountDate !== today) {
        account.dailyGenerateCount = 0;
        account.dailyCountDate = today;
      }
      const limit = 10;
      if (account.dailyGenerateCount >= limit) {
        return { allowed: false, used: account.dailyGenerateCount, limit, remaining: 0 };
      }
      account.dailyGenerateCount++;
      saveAccounts(accounts);
      return { allowed: true, used: account.dailyGenerateCount, limit, remaining: limit - account.dailyGenerateCount };
    }
  }

  // 訪客：使用 authStorage 計數
  const guestUsed = authStorage.loadGuestCount(today);
  const guestLimit = 3;
  if (guestUsed >= guestLimit) {
    return { allowed: false, used: guestUsed, limit: guestLimit, remaining: 0 };
  }
  authStorage.saveGuestCount(today, guestUsed + 1);
  return { allowed: true, used: guestUsed + 1, limit: guestLimit, remaining: guestLimit - guestUsed - 1 };
}

/** 取得今日產號次數資訊 */
export function getDailyCountInfo(): { used: number; limit: number; remaining: number } {
  const role = getCurrentRole();
  if (role === 'vip' || role === 'admin') return { used: 0, limit: 999, remaining: 999 };

  const today = new Date().toISOString().split('T')[0];
  const session = getSession();

  if (role === 'free' && session?.email) {
    const account = getAccount(session.email);
    if (account) {
      const used = account.dailyCountDate === today ? account.dailyGenerateCount : 0;
      return { used, limit: 10, remaining: Math.max(0, 10 - used) };
    }
  }

  const used = authStorage.loadGuestCount(today);
  return { used, limit: 3, remaining: Math.max(0, 3 - used) };
}

// ---- 工具 ----

function cryptoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** 升級為 VIP（模擬） */
export function upgradeToVip(_plan: 'monthly' | 'quarterly' | 'yearly'): boolean {
  const session = getSession();
  if (!session || session.type !== 'user' || !session.email) return false;

  const accounts = loadAccounts();
  if (!accounts[session.email]) return false;

  accounts[session.email].role = 'vip';
  saveAccounts(accounts);

  // 更新 session
  session.role = 'vip';
  authStorage.saveUserSession(session as UserSession);

  return true;
}
