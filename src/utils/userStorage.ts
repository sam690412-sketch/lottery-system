// ============================================================
// 會員資料隔離工具 - 所有業務資料依 userId 隔離
// ============================================================

import { loadUser } from '@/components/AuthPanel';
import { loadJson, saveJson, removeKey } from '@/repositories/businessDataStorage';

/** 取得目前使用者ID：會員用email前綴，訪客用 'guest' */
export function getCurrentUserId(): string {
  const user = loadUser();
  if (user?.email) {
    // 用email前綴作為userId，去掉特殊字元
    return user.email.replace(/[^a-zA-Z0-9]/g, '_');
  }
  return 'guest';
}

/** 產生隔離的 key: {baseKey}:{userId} */
export function getUserKey(baseKey: string): string {
  return `${baseKey}:${getCurrentUserId()}`;
}

/** 依使用者讀取 */
export function userGetItem(baseKey: string): string | null {
  return loadJson<string>(getUserKey(baseKey), '' as unknown as string) || null;
}

/** 依使用者寫入 */
export function userSetItem(baseKey: string, value: string): void {
  saveJson(getUserKey(baseKey), value);
}

/** 依使用者刪除 */
export function userRemoveItem(baseKey: string): void {
  removeKey(getUserKey(baseKey));
}

/** 依使用者讀取JSON */
export function userGetJson<T>(baseKey: string, defaultValue: T): T {
  try {
    const raw = userGetItem(baseKey);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/** 依使用者寫入JSON */
export function userSetJson(baseKey: string, value: unknown): void {
  try {
    userSetItem(baseKey, JSON.stringify(value));
  } catch { /* ignore */ }
}

// 需要隔離的資料 key 定義
export const USER_KEYS = {
  PERSONAL_SOURCES: 'personal-sources',
  DREAM_RECORDS: 'lottery-dream-records-v10.5',
  METAPHYSICS_BIRTH: 'lottery-metaphysics-birth',
  JOURNAL: 'lottery-journal-v10',
  BUDGET: 'lottery-budget',
  KEEP_SETS: 'v12-keep-sets',
} as const;

// V18.2.9 P0-2: 檢查是否有養號設定
interface KeepSet {
  id: string;
  name: string;
  numbers: number[];
  type: string;
  note: string;
}

/** 檢查指定彩種是否有養號設定 */
export function hasPersonalNumbers(lotteryType: string): boolean {
  const sets = userGetJson<KeepSet[]>(USER_KEYS.KEEP_SETS, []);
  return sets.some(s => s.type === lotteryType && s.numbers.length > 0);
}

/** 取得指定彩種的養號數量 */
export function getPersonalNumberCount(lotteryType: string): number {
  const sets = userGetJson<KeepSet[]>(USER_KEYS.KEEP_SETS, []);
  return sets.filter(s => s.type === lotteryType).reduce((sum, s) => sum + s.numbers.length, 0);
}
