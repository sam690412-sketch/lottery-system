// ============================================================
// V18.2.8: Business Data Storage Unified Layer
// 統一封裝業務數據 localStorage 操作
// 涵蓋: observationPool, observationPoolV3, history, analytics, payment, abTest
// ============================================================

// ---- Observation Pool V2 ----

const POOL_V2_KEY = 'lottery-observation-pool-v2';

export function loadObservationPoolV2(): string | null {
  try { return localStorage.getItem(POOL_V2_KEY); } catch { return null; }
}

export function saveObservationPoolV2(pool: unknown): void {
  try { localStorage.setItem(POOL_V2_KEY, JSON.stringify(pool)); } catch { /* ignore */ }
}

export function removeObservationPoolV2(): void {
  try { localStorage.removeItem(POOL_V2_KEY); } catch { /* ignore */ }
}

// ---- Observation Pool V3 ----

export function buildPoolV3Key(lotteryType: string, userId?: string): string {
  return `lottery-obs-v3:${lotteryType}:${userId || 'default'}`;
}

export function loadObservationPoolV3(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function saveObservationPoolV3(key: string, pool: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(pool)); } catch { /* ignore */ }
}

// ---- History ----

const HISTORY_KEY = 'lottery-play-history';

export function loadHistory(): string | null {
  try { return localStorage.getItem(HISTORY_KEY); } catch { return null; }
}

export function saveHistory(history: unknown): void {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* ignore */ }
}

// ---- Analytics ----

const ANALYTICS_KEY = 'lottery-v18-analytics';

export function loadAnalytics(): string | null {
  try { return localStorage.getItem(ANALYTICS_KEY); } catch { return null; }
}

export function saveAnalytics(events: unknown): void {
  try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events)); } catch { /* ignore */ }
}

// ---- Funnel ----

const FUNNEL_KEY = 'lottery-v18-funnel';

export function loadFunnel(): string | null {
  try { return localStorage.getItem(FUNNEL_KEY); } catch { return null; }
}

export function saveFunnel(funnel: unknown): void {
  try { localStorage.setItem(FUNNEL_KEY, JSON.stringify(funnel)); } catch { /* ignore */ }
}

// ---- AB Test ----

const AB_TEST_KEY = 'lottery-v18-ab-test';

export function loadABTest(): string | null {
  try { return localStorage.getItem(AB_TEST_KEY); } catch { return null; }
}

export function saveABTest(config: unknown): void {
  try { localStorage.setItem(AB_TEST_KEY, JSON.stringify(config)); } catch { /* ignore */ }
}

// ---- Payment ----

const PAYMENT_KEY = 'lottery-v18-payments';
const SUBSCRIPTION_KEY = 'lottery-v18-subscriptions';

export function loadPayments(): string | null {
  try { return localStorage.getItem(PAYMENT_KEY); } catch { return null; }
}

export function savePayments(payments: unknown): void {
  try { localStorage.setItem(PAYMENT_KEY, JSON.stringify(payments)); } catch { /* ignore */ }
}

export function loadSubscriptions(): string | null {
  try { return localStorage.getItem(SUBSCRIPTION_KEY); } catch { return null; }
}

export function saveSubscriptions(subs: unknown): void {
  try { localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subs)); } catch { /* ignore */ }
}

// ---- User Session (for analytics role detection) ----

export function loadUserSessionRaw(): string | null {
  try { return localStorage.getItem('lottery-v13-session'); } catch { return null; }
}

// ---- Generic ----

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

export function saveJson(key: string, data: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
}

export function removeKey(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// ---- Journal ----

const JOURNAL_KEY = 'lottery-journal-v13';

export function loadJournal(): string | null {
  try { return localStorage.getItem(JOURNAL_KEY); } catch { return null; }
}

export function saveJournal(journal: unknown): void {
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal)); } catch { /* ignore */ }
}

// ---- Tester Accounts ----

const TESTER_KEY = 'lottery-tester-accounts';

export function loadTesterAccounts(): string | null {
  try { return localStorage.getItem(TESTER_KEY); } catch { return null; }
}

export function saveTesterAccounts(accounts: unknown): void {
  try { localStorage.setItem(TESTER_KEY, JSON.stringify(accounts)); } catch { /* ignore */ }
}

// ---- Admin Accounts ----

const ADMIN_ACCOUNTS_KEY = 'lottery-admin-accounts';

export function loadAdminAccountsRaw(): string | null {
  try { return localStorage.getItem(ADMIN_ACCOUNTS_KEY); } catch { return null; }
}

export function saveAdminAccountsRaw(accounts: unknown): void {
  try { localStorage.setItem(ADMIN_ACCOUNTS_KEY, JSON.stringify(accounts)); } catch { /* ignore */ }
}

// ---- Budget ----

const BUDGET_KEY = 'lottery-budget';

export function loadBudget(): string | null {
  try { return localStorage.getItem(BUDGET_KEY); } catch { return null; }
}

export function saveBudget(budget: unknown): void {
  try { localStorage.setItem(BUDGET_KEY, JSON.stringify(budget)); } catch { /* ignore */ }
}

// ---- Backtest Journal ----

const BACKTEST_JOURNAL_KEY = 'lottery-test-journal';

export function loadBacktestJournal(): string | null {
  try { return localStorage.getItem(BACKTEST_JOURNAL_KEY); } catch { return null; }
}

export function saveBacktestJournal(entries: unknown): void {
  try { localStorage.setItem(BACKTEST_JOURNAL_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
}

// ---- Digit Data Cache ----

export function loadDigitCache(cacheKey: string): string | null {
  try { return localStorage.getItem(cacheKey); } catch { return null; }
}

export function saveDigitCache(cacheKey: string, data: unknown): void {
  try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* ignore */ }
}

// ---- Sync Meta ----

export function loadSyncMeta(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function saveSyncMeta(key: string, data: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
}

// ---- Draw History ----

export function loadDrawHistoryRaw(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function saveDrawHistoryRaw(key: string, data: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
}

// ---- Data Source ----

const DATA_SOURCE_KEY = 'power-lottery-data-v8';
const DATA_SOURCE_META_KEY = 'power-lottery-meta';
const PERSONAL_SOURCES_KEY = 'personal-sources';
const POWER_LOTTERY_JOURNAL_KEY = 'power-lottery-journal';

export function loadDataSourceV8(): string | null {
  try { return localStorage.getItem(DATA_SOURCE_KEY); } catch { return null; }
}

export function saveDataSourceV8(data: unknown): void {
  try { localStorage.setItem(DATA_SOURCE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export function loadDataSourceMeta(): string | null {
  try { return localStorage.getItem(DATA_SOURCE_META_KEY); } catch { return null; }
}

export function saveDataSourceMeta(meta: unknown): void {
  try { localStorage.setItem(DATA_SOURCE_META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

export function loadPersonalSources(): string | null {
  try { return localStorage.getItem(PERSONAL_SOURCES_KEY); } catch { return null; }
}

export function savePersonalSources(sources: unknown): void {
  try { localStorage.setItem(PERSONAL_SOURCES_KEY, JSON.stringify(sources)); } catch { /* ignore */ }
}

export function loadPowerLotteryJournal(): string | null {
  try { return localStorage.getItem(POWER_LOTTERY_JOURNAL_KEY); } catch { return null; }
}

export function savePowerLotteryJournal(journal: unknown): void {
  try { localStorage.setItem(POWER_LOTTERY_JOURNAL_KEY, JSON.stringify(journal)); } catch { /* ignore */ }
}

// ---- Lottery State ----

const LOTTERY_STATE_KEY = 'power-lottery-13-funnel';

export function loadLotteryState(): string | null {
  try { return localStorage.getItem(LOTTERY_STATE_KEY); } catch { return null; }
}

export function saveLotteryState(state: unknown): void {
  try { localStorage.setItem(LOTTERY_STATE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

// ---- History (power-lottery-history) ----

const POWER_HISTORY_KEY = 'power-lottery-history';

export function loadPowerHistory(): string | null {
  try { return localStorage.getItem(POWER_HISTORY_KEY); } catch { return null; }
}

export function savePowerHistory(data: unknown): void {
  try { localStorage.setItem(POWER_HISTORY_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

// ---- Dream Schools ----

export function loadDreamDataRaw(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function saveDreamDataRaw(key: string, data: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
}

export function removeDreamDataRaw(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// ---- Metaphysics Schools ----

export function loadMetaDataRaw(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function saveMetaDataRaw(key: string, data: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
}

export function removeMetaDataRaw(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// ---- Strategy Ranking ----

export function loadStrategyDataRaw(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

// ---- Auth Session (legacy admin) ----

const ADMIN_AUTH_SESSION_KEY = 'lottery-auth-session';

export function loadAdminAuthSession(): string | null {
  try { return localStorage.getItem(ADMIN_AUTH_SESSION_KEY); } catch { return null; }
}

export function saveAdminAuthSession(session: unknown): void {
  try { localStorage.setItem(ADMIN_AUTH_SESSION_KEY, JSON.stringify(session)); } catch { /* ignore */ }
}
