// ============================================================
// V19.3.5 Draw Sync Scheduler
// Daily sync + auto-update all analytics after sync
// ============================================================

import type { LotteryType } from './lotteryAnalytics';
import { syncAllLotteryTypes, type SyncResult } from './officialDrawProvider';
import { clearAICache } from './aiCache';

const SCHEDULER_KEY = 'v1935-scheduler';
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SchedulerState {
  lastRun: string;
  nextRun: string;
  totalRuns: number;
  totalAdded: number;
  lastResults: SyncResult[];
}

function loadState(): SchedulerState {
  try {
    const raw = localStorage.getItem(SCHEDULER_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { lastRun: '', nextRun: '', totalRuns: 0, totalAdded: 0, lastResults: [] };
}

function saveState(state: SchedulerState) {
  try { localStorage.setItem(SCHEDULER_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

/** Check if sync is due */
export function isSyncDue(): boolean {
  const state = loadState();
  if (!state.lastRun) return true;
  const lastRun = new Date(state.lastRun).getTime();
  return Date.now() - lastRun >= SYNC_INTERVAL_MS;
}

/** Get scheduler status */
export function getSchedulerStatus(): { lastRun: string; nextRun: string; totalRuns: number; totalAdded: number; isDue: boolean } {
  const state = loadState();
  return {
    lastRun: state.lastRun,
    nextRun: state.nextRun,
    totalRuns: state.totalRuns,
    totalAdded: state.totalAdded,
    isDue: isSyncDue(),
  };
}

/** Run full sync cycle */
export async function runSyncCycle(onProgress?: (msg: string) => void): Promise<SyncResult[]> {
  onProgress?.('開始同步週期...');

  // 1. Sync all lottery types
  const results = await syncAllLotteryTypes(onProgress);

  // 2. Clear AI caches (will be recomputed on next access)
  clearAICache();
  onProgress?.('AI 分析快取已清除，下次訪問時自動重算');

  // 3. Update scheduler state
  const totalAdded = results.reduce((s, r) => s + r.added, 0);
  const state = loadState();
  state.lastRun = new Date().toISOString();
  state.nextRun = new Date(Date.now() + SYNC_INTERVAL_MS).toISOString();
  state.totalRuns++;
  state.totalAdded += totalAdded;
  state.lastResults = results;
  saveState(state);

  onProgress?.(`同步週期完成，共新增 ${totalAdded} 期`);
  return results;
}

/** Auto-sync on app startup (if due) */
export async function autoSyncOnStartup(): Promise<boolean> {
  if (isSyncDue()) {
    console.log('[SyncScheduler] Sync is due, running auto-sync...');
    await runSyncCycle();
    return true;
  }
  console.log('[SyncScheduler] Sync not due yet');
  return false;
}
