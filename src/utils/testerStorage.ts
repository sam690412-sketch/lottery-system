// ============================================================
// V13.3 測試員帳號持久化 - 全部存 localStorage
// ============================================================

import { loadTesterAccounts, saveTesterAccounts } from '@/repositories/businessDataStorage';

export interface TesterAccount {
  username: string;
  password: string;
  nickname: string;
  note: string;
  isActive: boolean;
  createdAt: string;
}

/** 載入所有測試員 */
function loadAll(): Record<string, TesterAccount> {
  try {
    return JSON.parse(loadTesterAccounts() || '{}');
  } catch {
    return {};
  }
}

/** 儲存所有測試員 */
function saveAll(accounts: Record<string, TesterAccount>): void {
  saveTesterAccounts(accounts);
}

/** 初始化預設測試員（若無測試員則創建） */
export function initDefaultTester(): void {
  const accounts = loadAll();
  if (!accounts['tester']) {
    accounts['tester'] = {
      username: 'tester',
      password: 'tester123',
      nickname: '預設測試員',
      note: '系統預設測試員帳號',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    saveAll(accounts);
  }
}

/** 驗證測試員登入 */
export function verifyTester(username: string, password: string): {
  success: boolean;
  error?: string;
} {
  initDefaultTester();
  const accounts = loadAll();
  const account = accounts[username];
  if (!account) return { success: false, error: '帳號不存在' };
  if (!account.isActive) return { success: false, error: '帳號已停用' };
  if (account.password !== password) return { success: false, error: '密碼錯誤' };
  return { success: true };
}

/** 新增測試員 */
export function addTester(
  username: string,
  password: string,
  nickname?: string,
  note?: string,
): boolean {
  const accounts = loadAll();
  if (accounts[username]) return false;
  accounts[username] = {
    username,
    password,
    nickname: nickname || username,
    note: note || '',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  saveAll(accounts);
  return true;
}

/** 修改測試員密碼 */
export function changeTesterPassword(username: string, newPassword: string): boolean {
  const accounts = loadAll();
  if (!accounts[username]) return false;
  accounts[username].password = newPassword;
  saveAll(accounts);
  return true;
}

/** 修改測試員資料 */
export function updateTester(
  username: string,
  data: Partial<Pick<TesterAccount, 'nickname' | 'note'>>,
): boolean {
  const accounts = loadAll();
  if (!accounts[username]) return false;
  if (data.nickname !== undefined) accounts[username].nickname = data.nickname;
  if (data.note !== undefined) accounts[username].note = data.note;
  saveAll(accounts);
  return true;
}

/** 停用/啟用測試員 */
export function setTesterActive(username: string, active: boolean): boolean {
  const accounts = loadAll();
  if (!accounts[username]) return false;
  accounts[username].isActive = active;
  saveAll(accounts);
  return true;
}

/** 刪除測試員 */
export function deleteTester(username: string): boolean {
  const accounts = loadAll();
  if (!accounts[username]) return false;
  delete accounts[username];
  saveAll(accounts);
  return true;
}

/** 取得所有測試員 */
export function getAllTesters(): TesterAccount[] {
  initDefaultTester();
  return Object.values(loadAll());
}

/** 取得單一測試員 */
export function getTester(username: string): TesterAccount | null {
  return loadAll()[username] || null;
}
