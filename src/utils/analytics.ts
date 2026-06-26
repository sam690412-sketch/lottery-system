// ============================================================
// V18.0 MODULE F: 數據收集與使用追蹤
// 目的：收集用戶行為數據以驗證付費意願
// ============================================================

// V18.2.6: 導入 Repository Factory
import { defaultFactory } from '@/repositories/factory';
// V18.2.8: 導入業務數據統一封裝層
import * as bizStorage from '@/repositories/businessDataStorage';

export interface AnalyticsEvent {
  type: string;
  action: string;
  detail?: string;
  timestamp: string;
  role?: string;
}

export interface UsageStats {
  totalGenerations: number;
  totalDreamUsages: number;
  totalMetaUsages: number;
  totalAIClicks: number;
  totalXuanxueUsages: number;
  vipUpgradeClicks: number;
  featureUsages: Record<string, number>;
  dailyStats: Record<string, { generations: number; aiClicks: number }>;
}

/** 記錄事件 */
export function trackEvent(type: string, action: string, detail?: string): void {
  try {
    const events = loadEvents();
    const role = getCurrentRoleSafe();
    events.push({ type, action, detail, timestamp: new Date().toISOString(), role });
    // 只保留最近500條
    if (events.length > 500) events.splice(0, events.length - 500);
    bizStorage.saveAnalytics(events);
    // V18.2.8: 業務數據已遷移到 businessDataStorage.ts
    // V18.2.6: 雙寫到 Repository
    const event = events[events.length - 1];
    if (event) defaultFactory.getAnalyticsRepository().addEvent(event).catch(() => {});
  } catch { /* ignore */ }
}

/** 獲取使用統計 */
export function getUsageStats(): UsageStats {
  try {
    const events = loadEvents();
    const stats: UsageStats = {
      totalGenerations: 0,
      totalDreamUsages: 0,
      totalMetaUsages: 0,
      totalAIClicks: 0,
      totalXuanxueUsages: 0,
      vipUpgradeClicks: 0,
      featureUsages: {},
      dailyStats: {},
    };
    for (const e of events) {
      // 功能使用
      if (!stats.featureUsages[e.type]) stats.featureUsages[e.type] = 0;
      stats.featureUsages[e.type]++;

      // 分類統計
      if (e.type === 'generate') stats.totalGenerations++;
      if (e.type === 'dream') stats.totalDreamUsages++;
      if (e.type === 'metaphysics') stats.totalMetaUsages++;
      if (e.type === 'ai_recommend') stats.totalAIClicks++;
      if (e.type === 'xuanxue') stats.totalXuanxueUsages++;
      if (e.type === 'vip_upgrade_click') stats.vipUpgradeClicks++;

      // 每日統計
      const day = e.timestamp.split('T')[0];
      if (!stats.dailyStats[day]) stats.dailyStats[day] = { generations: 0, aiClicks: 0 };
      if (e.type === 'generate') stats.dailyStats[day].generations++;
      if (e.type === 'ai_recommend') stats.dailyStats[day].aiClicks++;
    }
    return stats;
  } catch {
    return { totalGenerations: 0, totalDreamUsages: 0, totalMetaUsages: 0, totalAIClicks: 0, totalXuanxueUsages: 0, vipUpgradeClicks: 0, featureUsages: {}, dailyStats: {} };
  }
}

/** 產號轉換率 */
export function getConversionRate(): number {
  const stats = getUsageStats();
  if (stats.totalAIClicks === 0) return 0;
  return Math.round((stats.totalGenerations / stats.totalAIClicks) * 100);
}

/** 匯出 CSV 報告 */
export function exportAnalyticsCSV(): string {
  const stats = getUsageStats();
  const lines = [
    '類型,次數',
    `產號總數,${stats.totalGenerations}`,
    `夢境使用,${stats.totalDreamUsages}`,
    `命理使用,${stats.totalMetaUsages}`,
    `AI推薦點擊,${stats.totalAIClicks}`,
    `玄學中心使用,${stats.totalXuanxueUsages}`,
    `VIP升級點擊,${stats.vipUpgradeClicks}`,
    `產號轉換率,${getConversionRate()}%`,
  ];
  return lines.join('\n');
}

function loadEvents(): AnalyticsEvent[] {
  try {
    const raw = bizStorage.loadAnalytics();
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function getCurrentRoleSafe(): string {
  try {
    const s = bizStorage.loadUserSessionRaw();
    if (s) return JSON.parse(s).role || 'guest';
  } catch { /* ignore */ }
  return 'guest';
}

// ============================================================
// V18.1.1 MODULE H: Conversion Dashboard
// 整合漏斗圖、轉換率、流失率、時間區間統計、意向分數
// ============================================================

import { getIntentScore, type IntentScore } from './intentScore';
import { getMilestoneStatus } from './behaviorTracker';
// BehaviorTracker types used via getMilestoneStatus

// V18.1.3 PHASE C+F: Intent Dashboard + Intent Analytics
export interface IntentUserSegment {
  level: 'cold' | 'warm' | 'hot';
  count: number;
  percentage: number;
  upgradeRate: number;
  ctr: number;
}

export interface ConversionDashboard {
  // 漏斗
  funnel: {
    visitors: number;
    registers: number;
    firstAI: number;
    firstWatchlist: number;
    firstDream: number;
    firstFortune: number;
    vipViews: number;
    upgradeClicks: number;
    paid: number;
  };
  // 轉換率
  rates: {
    visitorToRegister: number;
    registerToFirstAI: number;
    firstAIToVIPView: number;
    vipViewToUpgrade: number;
    upgradeToPaid: number;
    overall: number;
  };
  // 流失率
  dropOff: {
    visitorToRegister: number;
    registerToFirstAI: number;
    firstAIToVIPView: number;
    vipViewToUpgrade: number;
    upgradeToPaid: number;
  };
  // 時間區間
  timeRange: {
    today: DailyStats;
    last7Days: DailyStats;
    last30Days: DailyStats;
  };
  // V18.1.3 PHASE C: VIP Intent 用戶分布
  intent: {
    highIntentUsers: number;
    warmIntentUsers: number;
    lowIntentUsers: number;
    avgScore: number;
    currentUserScore: IntentScore;
    // PHASE C: 新增分段統計
    segments: IntentUserSegment[];
    // PHASE D: 用戶行為摘要
    recentBehaviors: { event: string; score: number; time: string }[];
  };
  // V18.1.3 PHASE F: Intent CTR & Upgrade Rate
  intentMetrics: {
    coldCTR: number;
    warmCTR: number;
    hotCTR: number;
    coldUpgradeRate: number;
    warmUpgradeRate: number;
    hotUpgradeRate: number;
  };
  updatedAt: string;
}

interface DailyStats {
  visitors: number;
  registrations: number;
  aiClicks: number;
  generations: number;
}

/** 獲取 Conversion Dashboard 完整數據 */
export function getConversionDashboard(): ConversionDashboard {
  const events = loadEvents();
  const funnel = getFunnelFromEvents(events);
  const rates = calcRates(funnel);
  const dropOff = calcDropOff(rates);
  const timeRange = calcTimeRange(events);
  const intentStats = calcIntentStats();
  const intentMetrics = calcIntentMetrics();

  return {
    funnel,
    rates,
    dropOff,
    timeRange,
    intent: intentStats,
    intentMetrics,
    updatedAt: new Date().toISOString(),
  };
}

/** 從事件計算完整漏斗 */
function getFunnelFromEvents(events: AnalyticsEvent[]) {
  // 基礎漏斗
  const v = events.filter(e => e.type === 'page_view' || e.type === 'visitor').length;
  const r = events.filter(e => e.type === 'register').length;
  const vc = events.filter(e => e.type === 'vip_upgrade_click').length;
  const vv = events.filter(e => e.type === 'vip_page_view' || e.action === 'nav_quick').length;
  const p = events.filter(e => e.type === 'vip_upgrade' || e.action === 'upgrade_success').length;

  // 首次行為（從里程碑）
  const ms = getMilestoneStatus();
  const fa = ms.first_ai_recommend ? 1 : 0;
  const fw = ms.first_watchlist ? 1 : 0;
  const fd = ms.first_dream ? 1 : 0;
  const ff = ms.first_fortune ? 1 : 0;

  return {
    visitors: Math.max(v, 1),
    registers: Math.max(r, fa > 0 ? 1 : 0),
    firstAI: fa,
    firstWatchlist: fw,
    firstDream: fd,
    firstFortune: ff,
    vipViews: Math.max(vv, 1),
    upgradeClicks: Math.max(vc, 1),
    paid: p,
  };
}

/** 計算轉換率 */
function calcRates(f: ReturnType<typeof getFunnelFromEvents>) {
  return {
    visitorToRegister: f.visitors > 0 ? Math.round((f.registers / f.visitors) * 1000) / 10 : 0,
    registerToFirstAI: f.registers > 0 ? Math.round((f.firstAI / f.registers) * 1000) / 10 : 0,
    firstAIToVIPView: f.firstAI > 0 ? Math.round((f.vipViews / f.firstAI) * 1000) / 10 : 0,
    vipViewToUpgrade: f.vipViews > 0 ? Math.round((f.upgradeClicks / f.vipViews) * 1000) / 10 : 0,
    upgradeToPaid: f.upgradeClicks > 0 ? Math.round((f.paid / f.upgradeClicks) * 1000) / 10 : 0,
    overall: f.visitors > 0 ? Math.round((f.paid / f.visitors) * 1000) / 10 : 0,
  };
}

/** 計算流失率 (100% - 轉換率) */
function calcDropOff(rates: ReturnType<typeof calcRates>) {
  return {
    visitorToRegister: Math.round((100 - rates.visitorToRegister) * 10) / 10,
    registerToFirstAI: Math.round((100 - rates.registerToFirstAI) * 10) / 10,
    firstAIToVIPView: Math.round((100 - rates.firstAIToVIPView) * 10) / 10,
    vipViewToUpgrade: Math.round((100 - rates.vipViewToUpgrade) * 10) / 10,
    upgradeToPaid: Math.round((100 - rates.upgradeToPaid) * 10) / 10,
  };
}

/** 計算時間區間統計 */
function calcTimeRange(events: AnalyticsEvent[]) {
  const today = new Date().toISOString().split('T')[0];
  const d7 = new Date(); d7.setDate(d7.getDate() - 7);
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);

  const countInRange = (start: Date) => {
    const filtered = events.filter(e => new Date(e.timestamp) >= start);
    return {
      visitors: filtered.filter(e => e.type === 'page_view' || e.type === 'visitor').length,
      registrations: filtered.filter(e => e.type === 'register').length,
      aiClicks: filtered.filter(e => e.type === 'ai_recommend').length,
      generations: filtered.filter(e => e.type === 'generate').length,
    };
  };

  return {
    today: countInRange(new Date(today)),
    last7Days: countInRange(d7),
    last30Days: countInRange(d30),
  };
}

/** V18.1.3 PHASE C+F: 計算 Intent 用戶分布 + CTR + Upgrade Rate */
function calcIntentStats(): ConversionDashboard['intent'] {
  const score = getIntentScore();
  const events = loadEvents();

  // 計算各 level 的曝光與點擊
  const intentShows = { cold: 0, warm: 0, hot: 0 };
  const intentClicks = { cold: 0, warm: 0, hot: 0 };
  const intentUpgrades = { cold: 0, warm: 0, hot: 0 };

  for (const e of events) {
    if (e.type === 'intent_trigger_show') {
      if (e.detail === 'cold') intentShows.cold++;
      if (e.detail === 'warm') intentShows.warm++;
      if (e.detail === 'hot') intentShows.hot++;
    }
    if (e.type === 'intent_trigger_click') {
      if (e.detail === 'cold') intentClicks.cold++;
      if (e.detail === 'warm') intentClicks.warm++;
      if (e.detail === 'hot') intentClicks.hot++;
    }
    if (e.type === 'vip_upgrade_click') {
      // 根據當前用戶 level 歸因
      if (score.level === 'cold') intentUpgrades.cold++;
      if (score.level === 'warm') intentUpgrades.warm++;
      if (score.level === 'hot') intentUpgrades.hot++;
    }
  }

  // 單用戶模式下簡化
  const isHot = score.level === 'hot';
  const isWarm = score.level === 'warm';
  const isCold = score.level === 'cold';

  // PHASE C: 用戶分段統計
  const segments: IntentUserSegment[] = [
    {
      level: 'cold',
      count: isCold ? 1 : 0,
      percentage: isCold ? 100 : 0,
      upgradeRate: intentShows.cold > 0 ? Math.round((intentUpgrades.cold / intentShows.cold) * 1000) / 10 : 0,
      ctr: intentShows.cold > 0 ? Math.round((intentClicks.cold / intentShows.cold) * 1000) / 10 : 0,
    },
    {
      level: 'warm',
      count: isWarm ? 1 : 0,
      percentage: isWarm ? 100 : 0,
      upgradeRate: intentShows.warm > 0 ? Math.round((intentUpgrades.warm / intentShows.warm) * 1000) / 10 : 0,
      ctr: intentShows.warm > 0 ? Math.round((intentClicks.warm / intentShows.warm) * 1000) / 10 : 0,
    },
    {
      level: 'hot',
      count: isHot ? 1 : 0,
      percentage: isHot ? 100 : 0,
      upgradeRate: intentShows.hot > 0 ? Math.round((intentUpgrades.hot / intentShows.hot) * 1000) / 10 : 0,
      ctr: intentShows.hot > 0 ? Math.round((intentClicks.hot / intentShows.hot) * 1000) / 10 : 0,
    },
  ];

  // PHASE D: 最近行為（從 breakdown 取）
  const recentBehaviors = Object.entries(score.breakdown)
    .map(([event, eventScore]) => ({
      event: event.replace(/_/g, ' '),
      score: eventScore,
      time: score.updatedAt,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    highIntentUsers: isHot ? 1 : 0,
    warmIntentUsers: isWarm ? 1 : 0,
    lowIntentUsers: isCold ? 1 : 0,
    avgScore: score.score,
    currentUserScore: score,
    segments,
    recentBehaviors,
  };
}

/** V18.1.3 PHASE F: 計算 Intent CTR & Upgrade Rate */
function calcIntentMetrics(): ConversionDashboard['intentMetrics'] {
  const events = loadEvents();
  const shows = { cold: 0, warm: 0, hot: 0 };
  const clicks = { cold: 0, warm: 0, hot: 0 };
  const upgrades = { cold: 0, warm: 0, hot: 0 };

  for (const e of events) {
    if (e.type === 'intent_trigger_show') {
      if (e.detail === 'cold') shows.cold++;
      if (e.detail === 'warm') shows.warm++;
      if (e.detail === 'hot') shows.hot++;
    }
    if (e.type === 'intent_trigger_click') {
      if (e.detail === 'cold') clicks.cold++;
      if (e.detail === 'warm') clicks.warm++;
      if (e.detail === 'hot') clicks.hot++;
    }
    if (e.type === 'vip_upgrade_click') {
      const score = getIntentScore();
      if (score.level === 'cold') upgrades.cold++;
      if (score.level === 'warm') upgrades.warm++;
      if (score.level === 'hot') upgrades.hot++;
    }
  }

  return {
    coldCTR: shows.cold > 0 ? Math.round((clicks.cold / shows.cold) * 1000) / 10 : 0,
    warmCTR: shows.warm > 0 ? Math.round((clicks.warm / shows.warm) * 1000) / 10 : 0,
    hotCTR: shows.hot > 0 ? Math.round((clicks.hot / shows.hot) * 1000) / 10 : 0,
    coldUpgradeRate: shows.cold > 0 ? Math.round((upgrades.cold / shows.cold) * 1000) / 10 : 0,
    warmUpgradeRate: shows.warm > 0 ? Math.round((upgrades.warm / shows.warm) * 1000) / 10 : 0,
    hotUpgradeRate: shows.hot > 0 ? Math.round((upgrades.hot / shows.hot) * 1000) / 10 : 0,
  };
}

/** 匯出 Dashboard CSV */
export function exportDashboardCSV(): string {
  const db = getConversionDashboard();
  return [
    'V18.1.1 Conversion Dashboard',
    `生成時間,${db.updatedAt}`,
    '',
    '漏斗統計',
    `訪客數,${db.funnel.visitors}`,
    `註冊數,${db.funnel.registers}`,
    `首次AI推薦,${db.funnel.firstAI}`,
    `首次觀察池,${db.funnel.firstWatchlist}`,
    `首次夢境,${db.funnel.firstDream}`,
    `首次命理,${db.funnel.firstFortune}`,
    `VIP頁面瀏覽,${db.funnel.vipViews}`,
    `升級點擊,${db.funnel.upgradeClicks}`,
    `實際付費,${db.funnel.paid}`,
    '',
    '轉換率',
    `訪客→註冊,${db.rates.visitorToRegister}%`,
    `註冊→首次AI,${db.rates.registerToFirstAI}%`,
    `AI→VIP瀏覽,${db.rates.firstAIToVIPView}%`,
    `VIP→升級點擊,${db.rates.vipViewToUpgrade}%`,
    `升級→付費,${db.rates.upgradeToPaid}%`,
    `總轉換率,${db.rates.overall}%`,
    '',
    '流失率',
    `訪客→註冊,${db.dropOff.visitorToRegister}%`,
    `註冊→首次AI,${db.dropOff.registerToFirstAI}%`,
    `AI→VIP瀏覽,${db.dropOff.firstAIToVIPView}%`,
    `VIP→升級點擊,${db.dropOff.vipViewToUpgrade}%`,
    `升級→付費,${db.dropOff.upgradeToPaid}%`,
    '',
    '今日統計',
    `訪客,${db.timeRange.today.visitors}`,
    `註冊,${db.timeRange.today.registrations}`,
    `AI點擊,${db.timeRange.today.aiClicks}`,
    `產號,${db.timeRange.today.generations}`,
    '',
    '近7天統計',
    `訪客,${db.timeRange.last7Days.visitors}`,
    `註冊,${db.timeRange.last7Days.registrations}`,
    `AI點擊,${db.timeRange.last7Days.aiClicks}`,
    `產號,${db.timeRange.last7Days.generations}`,
    '',
    '近30天統計',
    `訪客,${db.timeRange.last30Days.visitors}`,
    `註冊,${db.timeRange.last30Days.registrations}`,
    `AI點擊,${db.timeRange.last30Days.aiClicks}`,
    `產號,${db.timeRange.last30Days.generations}`,
    '',
    '意向分數',
    `高意圖用戶(>70),${db.intent.highIntentUsers}`,
    `溫意圖用戶(31-70),${db.intent.warmIntentUsers}`,
    `低意圖用戶(0-30),${db.intent.lowIntentUsers}`,
    `平均意向分數,${db.intent.avgScore}`,
  ].join('\n');
}

// ============================================================
// V18.2 AUDIT D: 付款事件模型 (Payment Event Model)
// 記錄付款流程中的關鍵事件
// ============================================================

/** 付款事件類型 */
export type PaymentEventType =
  | 'checkout_start'        // 開始結帳
  | 'checkout_success_mock' // 模擬付款成功
  | 'checkout_cancel'       // 取消結帳
  | 'subscription_activated' // 訂閱生效
  | 'subscription_expired'   // 訂閱到期
  | 'refund_requested'       // 申請退款
  | 'refund_completed';      // 退款完成

/** 記錄付款事件 */
export function trackPaymentEvent(
  eventType: PaymentEventType,
  detail?: Record<string, string | number>
): void {
  trackEvent('payment', eventType, detail ? JSON.stringify(detail) : undefined);
}

/** 記錄結帳開始 */
export function trackCheckoutStart(plan: string, amount: number): void {
  trackPaymentEvent('checkout_start', { plan, amount: String(amount) });
}

/** 記錄結帳成功（模擬） */
export function trackCheckoutSuccess(plan: string, paymentId: string): void {
  trackPaymentEvent('checkout_success_mock', { plan, paymentId });
}

/** 記錄結帳取消 */
export function trackCheckoutCancel(plan: string, reason?: string): void {
  trackPaymentEvent('checkout_cancel', { plan, reason: reason || 'user_cancel' });
}

/** 記錄訂閱生效 */
export function trackSubscriptionActivated(plan: string, subId: string): void {
  trackPaymentEvent('subscription_activated', { plan, subscriptionId: subId });
}

/** 記錄退款申請 */
export function trackRefundRequest(paymentId: string, reason: string): void {
  trackPaymentEvent('refund_requested', { paymentId, reason });
}

/** 記錄退款完成 */
export function trackRefundCompleted(paymentId: string): void {
  trackPaymentEvent('refund_completed', { paymentId });
}

/** 取得付款事件統計 */
export function getPaymentStats(): Record<PaymentEventType, number> {
  const events = loadEvents();
  const stats: Record<string, number> = {
    checkout_start: 0,
    checkout_success_mock: 0,
    checkout_cancel: 0,
    subscription_activated: 0,
    subscription_expired: 0,
    refund_requested: 0,
    refund_completed: 0,
  };
  for (const e of events) {
    if (e.type === 'payment' && e.action in stats) {
      stats[e.action]++;
    }
  }
  return stats as Record<PaymentEventType, number>;
}

// ============================================================
// V19.2.1 CONVERSION TRACKING: AI Feature Events
// ============================================================

/** Track AI Analysis Center click */
export function trackAIClick(feature: string): void {
  trackEvent('v192_ai_click', feature);
}

/** Track Live Draw page view */
export function trackLiveDrawView(): void {
  trackEvent('v192_live_draw', 'page_view');
}

/** Track Trend Analysis period change */
export function trackTrendPeriod(period: number): void {
  trackEvent('v192_trend', `period_${period}`);
}

/** Track AI Recommend action */
export function trackAIRecommendAction(action: string): void {
  trackEvent('v192_ai_recommend', action);
}

/** Track Premium AI page view */
export function trackPremiumAIView(): void {
  trackEvent('v192_premium_ai', 'page_view');
}

/** Track "Add to Watchlist" click */
export function trackAddToWatchlist(numbers: number[]): void {
  trackEvent('v192_watchlist_add', numbers.join(','));
}

/** Track VIP CTA click from AI pages */
export function trackAIVIPCTA(location: string): void {
  trackEvent('v192_vip_cta', location);
}

/** Track home dual-entry click */
export function trackHomeEntry(type: 'xuanxue' | 'data'): void {
  trackEvent('v192_home_entry', type);
}

/** Track "Generate 3 Sets" click */
export function trackGenerate3Sets(): void {
  trackEvent('v192_generate_3sets', 'click');
}

// ============================================================
// V19.3 FUNNEL: Home -> AI Analysis -> AI Recommend -> Premium AI -> Payment -> Success
// ============================================================

export type FunnelStage = 'home' | 'ai_analysis' | 'ai_recommend' | 'premium_ai' | 'payment_page' | 'payment_success';

const FUNNEL_KEY = 'v193_funnel';

/** Record funnel stage entry */
export function trackFunnelStage(stage: FunnelStage): void {
  const data = JSON.parse(localStorage.getItem(FUNNEL_KEY) || '{}');
  if (!data[stage]) data[stage] = { count: 0, firstAt: new Date().toISOString() };
  data[stage].count++;
  data[stage].lastAt = new Date().toISOString();
  localStorage.setItem(FUNNEL_KEY, JSON.stringify(data));
  trackEvent('v193_funnel', stage);
}

/** Get funnel report */
export function getFunnelReport(): Record<FunnelStage, { count: number; firstAt: string; lastAt: string }> {
  return JSON.parse(localStorage.getItem(FUNNEL_KEY) || '{}');
}

/** Get funnel conversion rate between two stages */
export function getFunnelConversion(from: FunnelStage, to: FunnelStage): number {
  const report = getFunnelReport();
  const fromCount = report[from]?.count || 0;
  const toCount = report[to]?.count || 0;
  return fromCount > 0 ? Math.round(toCount / fromCount * 1000) / 10 : 0;
}
