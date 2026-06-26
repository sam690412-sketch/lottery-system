// ============================================================
// V13.1 正式版預留 - Auth Provider 接口
// 目前使用 localStorage 實作，正式版替換為後端 API
// ============================================================

import {
  sha256,
  registerUser as localRegister,
  loginUser as localLogin,
  logout as localLogout,
  getSession,
  type UserRole,
} from '@/utils/auth';
import { loadUserAccounts, saveUserAccounts } from '@/repositories/authStorage';

export type { UserRole };

/** 認證提供者接口 - 正式版替換為後端 API */
export interface AuthProvider {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (email: string, password: string, nickname?: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  getCurrentUser: () => Promise<{ email: string; nickname: string; role: UserRole } | null>;
}

/** 本地 localStorage 實作（展示版使用） */
class LocalAuthProvider implements AuthProvider {
  async login(email: string, password: string) {
    const result = localLogin(email, password);
    return { success: result.success, error: result.error };
  }

  async logout() {
    localLogout();
  }

  async register(email: string, password: string, nickname?: string) {
    const result = localRegister(email, password, nickname);
    return { success: result.success, error: result.error };
  }

  async updatePassword(oldPassword: string, newPassword: string) {
    const session = getSession();
    if (!session || !session.email) return { success: false, error: '未登入' };

    const accounts = loadUserAccounts();
    const account = accounts[session.email];
    if (!account) return { success: false, error: '帳號不存在' };
    if (account.passwordHash !== sha256(oldPassword)) return { success: false, error: '舊密碼錯誤' };
    if (newPassword.length < 6) return { success: false, error: '新密碼至少6碼' };

    account.passwordHash = sha256(newPassword);
    saveUserAccounts(accounts);
    return { success: true };
  }

  async getCurrentUser() {
    const session = getSession();
    if (!session || session.type !== 'user') return null;
    return {
      email: session.email,
      nickname: session.nickname || session.email.split('@')[0],
      role: session.role || 'guest',
    };
  }
}

/** 單例 */
const authProvider = new LocalAuthProvider();
export default authProvider;

/** 正式版後端 API 實作範例：
class BackendAuthProvider implements AuthProvider {
  private apiBase = '/api/v1/auth';
  
  async login(email: string, password: string) {
    const res = await fetch(`${this.apiBase}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  }
  
  async logout() {
    await fetch(`${this.apiBase}/logout`, { method: 'POST' });
    localStorage.removeItem('token');
  }
  
  // ... 其他方法
}
*/
