// ============================================================
// V18.2.14 PHASE A: Behavior Tracking - 已遷移到 businessDataStorage
// 首次行為里程碑追蹤
// Storage key: lottery-v18-behavior
// ============================================================

const BEHAVIOR_KEY = 'lottery-v18-behavior';

// V18.2.14: 導入統一 Storage 層
import { loadJson, saveJson, removeKey } from '@/repositories/businessDataStorage';
import { defaultFactory } from '@/repositories/factory';

export type BehaviorEvent =
  | 'first_login'
  | 'first_ai_recommend'
  | 'first_watchlist'
  | 'first_dream'
  | 'first_fortune'
  | 'first_backtest'
  | 'first_vip_page_view'
  | 'first_upgrade_click';

export interface BehaviorRecord {
  event: BehaviorEvent;
  timestamp: string;
  role: string;
  daysFromRegister: number;
}

export interface BehaviorStore {
  registerDate: string;
  milestones: Partial<Record<BehaviorEvent, BehaviorRecord>>;
  history: BehaviorRecord[];
}

/** 載入行為數據 */
function loadStore(): BehaviorStore {
  return loadJson<BehaviorStore>(BEHAVIOR_KEY, { registerDate: new Date().toISOString(), milestones: {}, history: [] });
}

/** 保存行為數據 */
function saveStore(store: BehaviorStore): void {
  try {
    saveJson(BEHAVIOR_KEY, store);
    // V18.2.6: 雙寫到 Repository
    defaultFactory.getAnalyticsRepository().saveBehavior(store).catch(() => {});
  }
  catch { /* ignore */ }
}

/** 獲取當前角色 */
function getRole(): string {
  try {
    const sess = loadJson<{ role?: string }>('lottery-v13-session', {} as { role?: string });
    if (sess && typeof sess === 'object' && 'role' in sess) return sess.role || 'guest';
  } catch { /* ignore */ }
  return 'guest';
}

/** 計算註冊天數 */
function getDaysFromRegister(store: BehaviorStore): number {
  const reg = new Date(store.registerDate).getTime();
  const now = Date.now();
  return Math.floor((now - reg) / (1000 * 60 * 60 * 24));
}

/** 記錄首次行為里程碑（同一事件只記錄一次） */
export function trackFirst(event: BehaviorEvent): BehaviorRecord | null {
  const store = loadStore();

  // 已記錄過則跳過
  if (store.milestones[event]) return null;

  const record: BehaviorRecord = {
    event,
    timestamp: new Date().toISOString(),
    role: getRole(),
    daysFromRegister: getDaysFromRegister(store),
  };

  store.milestones[event] = record;
  store.history.push(record);
  saveStore(store);
  return record;
}

/** 檢查是否已完成某里程碑 */
export function hasMilestone(event: BehaviorEvent): boolean {
  const store = loadStore();
  return !!store.milestones[event];
}

/** 獲取所有里程碑狀態 */
export function getMilestoneStatus(): Record<BehaviorEvent, boolean> {
  const store = loadStore();
  const allEvents: BehaviorEvent[] = [
    'first_login', 'first_ai_recommend', 'first_watchlist',
    'first_dream', 'first_fortune', 'first_backtest',
    'first_vip_page_view', 'first_upgrade_click',
  ];
  const result = {} as Record<BehaviorEvent, boolean>;
  for (const e of allEvents) {
    result[e] = !!store.milestones[e];
  }
  return result;
}

/** 獲取里程碑完成數量 */
export function getCompletedMilestoneCount(): number {
  const store = loadStore();
  return Object.keys(store.milestones).length;
}

/** 獲取所有行為歷史 */
export function getBehaviorHistory(): BehaviorRecord[] {
  return loadStore().history;
}

/** 獲取特定時間範圍的行為 */
export function getBehaviorInRange(days: number): BehaviorRecord[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return loadStore().history.filter(h => new Date(h.timestamp) >= cutoff);
}

/** 重置行為數據 */
export function resetBehavior(): void {
  removeKey(BEHAVIOR_KEY);
  // V18.2.6: 同步清除 Repository
  const empty: BehaviorStore = { registerDate: new Date().toISOString(), milestones: {}, history: [] };
  defaultFactory.getAnalyticsRepository().saveBehavior(empty).catch(() => {});
}

/** 匯出 CSV */
export function exportBehaviorCSV(): string {
  const store = loadStore();
  const lines = ['event,timestamp,role,daysFromRegister'];
  for (const h of store.history) {
    lines.push(`${h.event},${h.timestamp},${h.role},${h.daysFromRegister}`);
  }
  return lines.join('\n');
}
