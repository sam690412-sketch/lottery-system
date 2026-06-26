// ============================================================
// V13.1 正式版預留 - Database Provider 接口
// 目前使用 localStorage 實作，正式版替換為 PostgreSQL/MongoDB
// ============================================================

import type { UserRole } from './authProvider';
import { loadUserAccounts } from '@/repositories/authStorage';
import { loadJournal, saveJournal, saveJson } from '@/repositories/businessDataStorage';
// Batch 3d-5: quota 後端化（flag 預設 localStorage，行為不變）
import { getQuotaGuardSource, computeGenerationLimit } from '@/utils/quotaGuard';
import { getBackendAuthSnapshot } from '@/utils/backendAuthSnapshot';

export interface UserRecord {
  id: string;
  email: string;
  nickname: string;
  role: UserRole;
  vipTrialRemaining: number;
  dailyGenerateCount: number;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface DatabaseProvider {
  /** 取得單一會員 */
  getUser: (email: string) => Promise<UserRecord | null>;
  /** 取得所有會員（管理員用） */
  getAllUsers: () => Promise<UserRecord[]>;
  /** 更新會員資料 */
  updateUser: (email: string, data: Partial<UserRecord>) => Promise<boolean>;
  /** 刪除會員 */
  deleteUser: (email: string) => Promise<boolean>;
  /** 使用VIP體驗券 */
  consumeVipTrial: (email: string) => Promise<{ success: boolean; remaining: number }>;
  /** 記錄產號次數 */
  recordGeneration: (email: string) => Promise<{ used: number; limit: number }>;
  /** 記錄投注日誌 */
  saveJournalEntry: (entry: unknown) => Promise<boolean>;
  /** 取得投注日誌 */
  getJournal: (email: string) => Promise<unknown[]>;
}

/** 本地 localStorage 實作（展示版使用） */
class LocalDatabaseProvider implements DatabaseProvider {
  private getAccounts(): Record<string, UserRecord> {
    try {
      return loadUserAccounts();
    } catch {
      return {};
    }
  }

  private saveAccounts(accounts: Record<string, UserRecord>) {
    saveJson('lottery-v13-accounts', accounts);
  }

  async getUser(email: string) {
    return this.getAccounts()[email] || null;
  }

  async getAllUsers() {
    return Object.values(this.getAccounts());
  }

  async updateUser(email: string, data: Partial<UserRecord>) {
    const accounts = this.getAccounts();
    if (!accounts[email]) return false;
    accounts[email] = { ...accounts[email], ...data };
    this.saveAccounts(accounts);
    return true;
  }

  async deleteUser(email: string) {
    const accounts = this.getAccounts();
    delete accounts[email];
    this.saveAccounts(accounts);
    return true;
  }

  async consumeVipTrial(email: string) {
    const accounts = this.getAccounts();
    const user = accounts[email];
    if (!user || user.vipTrialRemaining <= 0) return { success: false, remaining: 0 };
    user.vipTrialRemaining--;
    this.saveAccounts(accounts);
    return { success: true, remaining: user.vipTrialRemaining };
  }

  async recordGeneration(email: string) {
    const accounts = this.getAccounts();
    const user = accounts[email];
    if (!user) return { used: 0, limit: 3 };
    user.dailyGenerateCount = (user.dailyGenerateCount || 0) + 1;
    this.saveAccounts(accounts);
    // Batch 3d-5: 額度可灰度讀 BackendAuthSnapshot；flag 預設 localStorage（維持現況）。
    const limit = computeGenerationLimit({
      source: getQuotaGuardSource(),
      localRole: user.role,
      snapshot: getBackendAuthSnapshot(),
    });
    return { used: user.dailyGenerateCount, limit };
  }

  async saveJournalEntry(entry: unknown) {
    const journal = JSON.parse(loadJournal() || '[]');
    journal.push(entry);
    saveJournal(journal);
    return true;
  }

  async getJournal(_email: string) {
    return JSON.parse(loadJournal() || '[]');
  }
}

/** 單例 */
const databaseProvider = new LocalDatabaseProvider();
export default databaseProvider;

/** 正式版後端資料庫實作範例：
class PostgresProvider implements DatabaseProvider {
  private db: Pool;
  
  constructor() {
    this.db = new Pool({
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  }
  
  async getUser(email: string) {
    const result = await this.db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }
  
  async getAllUsers() {
    const result = await this.db.query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows;
  }
  
  // ... 其他方法
}
*/
