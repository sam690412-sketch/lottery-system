// ============================================================
// V13.5 管理員帳號持久化 - 改帳號後同步 session
// ============================================================

import { sha256 } from './auth';
import { loadAdminAccountsRaw, saveAdminAccountsRaw, loadAdminAuthSession, saveAdminAuthSession } from '@/repositories/businessDataStorage';

export interface AdminAccount {
  username: string;
  passwordHash: string;
  nickname: string;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: string;
}

/** 載入所有管理員帳號 */
function loadAll(): Record<string, AdminAccount> {
  try {
    return JSON.parse(loadAdminAccountsRaw() || '{}');
  } catch {
    return {};
  }
}

/** 儲存所有管理員帳號 */
function saveAll(accounts: Record<string, AdminAccount>): void {
  saveAdminAccountsRaw(accounts);
}

/** 同步更新 lottery-auth-session（當管理員改帳號時） */
function syncSessionUsername(newUsername: string): void {
  try {
    const raw = loadAdminAuthSession();
    if (!raw) return;
    const session = JSON.parse(raw);
    if (session.role === 'admin') {
      session.username = newUsername;
      session.userId = `admin-${newUsername}`;
      const now = Date.now();
      session.loginAt = new Date(now).toISOString();
      session.expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
      saveAdminAuthSession(session);
    }
  } catch {
    // 靜默失敗，不影響主流程
  }
}

/** 初始化預設管理員（若無管理員則創建） */
export function initDefaultAdmin(): void {
  const accounts = loadAll();
  if (Object.keys(accounts).length === 0) {
    accounts['admin'] = {
      username: 'admin',
      passwordHash: sha256('admin123'),
      nickname: '管理員',
      mustChangePassword: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    saveAll(accounts);
  }
}

/** 驗證管理員登入 */
export function verifyAdmin(username: string, password: string): {
  success: boolean;
  needPasswordChange?: boolean;
  error?: string;
} {
  initDefaultAdmin();
  const accounts = loadAll();
  const account = accounts[username];
  if (!account) return { success: false, error: '帳號不存在' };
  if (!account.isActive) return { success: false, error: '帳號已停用' };
  if (account.passwordHash !== sha256(password)) return { success: false, error: '密碼錯誤' };
  return { success: true, needPasswordChange: account.mustChangePassword };
}

/** 修改管理員密碼 */
export function changeAdminPassword(
  username: string,
  oldPassword: string,
  newPassword: string,
): { success: boolean; error?: string } {
  const accounts = loadAll();
  const account = accounts[username];
  if (!account) return { success: false, error: '帳號不存在' };
  if (account.passwordHash !== sha256(oldPassword)) return { success: false, error: '舊密碼錯誤' };
  if (newPassword.length < 6) return { success: false, error: '新密碼至少6碼' };
  account.passwordHash = sha256(newPassword);
  account.mustChangePassword = false;
  saveAll(accounts);
  return { success: true };
}

/** 新增管理員 */
export function addAdmin(username: string, password: string, nickname?: string): boolean {
  const accounts = loadAll();
  if (accounts[username]) return false;
  accounts[username] = {
    username,
    passwordHash: sha256(password),
    nickname: nickname || username,
    mustChangePassword: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  saveAll(accounts);
  return true;
}

/** 刪除管理員 */
export function deleteAdmin(username: string): boolean {
  const accounts = loadAll();
  if (!accounts[username]) return false;
  if (Object.keys(accounts).length <= 1) return false;
  delete accounts[username];
  saveAll(accounts);
  return true;
}

/** 取得所有管理員 */
export function getAllAdmins(): AdminAccount[] {
  initDefaultAdmin();
  return Object.values(loadAll());
}

/** 是否已修改過預設密碼 */
export function hasChangedDefaultPassword(): boolean {
  const accounts = loadAll();
  return accounts['admin']?.mustChangePassword === false;
}

/** 修改管理員帳號（可同時改密碼）- V13.5 改帳號後同步更新 session */
export function changeAdminUsername(
  oldUsername: string,
  oldPassword: string,
  newUsername: string,
  newPassword: string,
): { success: boolean; error?: string } {
  const accounts = loadAll();
  const account = accounts[oldUsername];
  if (!account) return { success: false, error: '舊帳號不存在' };
  if (account.passwordHash !== sha256(oldPassword)) return { success: false, error: '舊密碼錯誤' };
  if (!newUsername || newUsername.trim().length === 0) return { success: false, error: '新帳號不可空白' };
  if (newPassword.length < 6) return { success: false, error: '新密碼至少6碼' };

  // 檢查新帳號是否與其他帳號重複（排除自己）
  if (oldUsername !== newUsername && accounts[newUsername]) {
    return { success: false, error: '新帳號已存在' };
  }

  // 如果帳號不同，需要搬移資料
  if (oldUsername !== newUsername) {
    accounts[newUsername] = {
      ...account,
      username: newUsername,
      passwordHash: sha256(newPassword),
      mustChangePassword: false,
    };
    delete accounts[oldUsername];
  } else {
    // 只改密碼
    account.passwordHash = sha256(newPassword);
    account.mustChangePassword = false;
  }

  saveAll(accounts);

  // V13.5: 同步更新 lottery-auth-session
  syncSessionUsername(newUsername);

  return { success: true };
}

/** 修改管理員啟用狀態 */
export function setAdminActive(username: string, active: boolean): boolean {
  const accounts = loadAll();
  if (!accounts[username]) return false;
  // 至少保留一個啟用中的管理員
  if (!active) {
    const activeCount = Object.values(accounts).filter(a => a.isActive && a.username !== username).length;
    if (activeCount === 0) return false;
  }
  accounts[username].isActive = active;
  saveAll(accounts);
  return true;
}
