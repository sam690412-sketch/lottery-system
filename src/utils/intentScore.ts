// ============================================================
// V18.2.14 PHASE A: VIP Intent Score - 已遷移到 businessDataStorage
// 計分規則：AI推薦/觀察池/夢境/命理/回測/VIP頁面/升級點擊
// 輸出：0-30冷 / 31-70溫 / 71-100熱
// ============================================================

import { getUsageStats } from './analytics';
import { getFunnel } from './funnelAnalytics';
import { getMilestoneStatus } from './behaviorTracker';
import type { BehaviorEvent } from './behaviorTracker';
import { loadJson, saveJson } from '@/repositories/businessDataStorage';
import { defaultFactory } from '@/repositories/factory';

const INTENT_KEY = 'lottery-v18-intent';

// 計分規則
const SCORE_RULES: Record<string, number> = {
  ai_recommend_click: 10,       // AI推薦點擊
  ai_recommend_3x: 15,          // AI推薦3次以上（額外加分）
  watchlist_use: 10,            // 觀察池使用
  dream_use: 8,                 // 夢境使用
  fortune_use: 8,               // 命理使用
  backtest_use: 15,             // 回測使用
  vip_page_view: 20,            // VIP頁面瀏覽
  upgrade_click: 30,            // 升級按鈕點擊
};

export interface IntentScore {
  score: number;
  level: 'cold' | 'warm' | 'hot';
  levelLabel: string;
  breakdown: Record<string, number>;
  updatedAt: string;
}

/** 計算 VIP 意向分數 (0-100) */
export function getIntentScore(): IntentScore {
  const stats = getUsageStats();
  const funnel = getFunnel();
  const milestones = getMilestoneStatus();
  const breakdown: Record<string, number> = {};
  let total = 0;

  // 1. AI推薦點擊 +10
  if (stats.totalAIClicks > 0) {
    breakdown.ai_recommend_click = SCORE_RULES.ai_recommend_click;
    total += SCORE_RULES.ai_recommend_click;
  }

  // 2. AI推薦3次以上 +15
  if (stats.totalAIClicks >= 3) {
    breakdown.ai_recommend_3x = SCORE_RULES.ai_recommend_3x;
    total += SCORE_RULES.ai_recommend_3x;
  }

  // 3. 觀察池使用 +10（通過里程碑判斷）
  if (milestones.first_watchlist) {
    breakdown.watchlist_use = SCORE_RULES.watchlist_use;
    total += SCORE_RULES.watchlist_use;
  }

  // 4. 夢境使用 +8
  if (milestones.first_dream || stats.totalDreamUsages > 0) {
    breakdown.dream_use = SCORE_RULES.dream_use;
    total += SCORE_RULES.dream_use;
  }

  // 5. 命理使用 +8
  if (milestones.first_fortune || stats.totalMetaUsages > 0) {
    breakdown.fortune_use = SCORE_RULES.fortune_use;
    total += SCORE_RULES.fortune_use;
  }

  // 6. 回測使用 +15
  if (milestones.first_backtest) {
    breakdown.backtest_use = SCORE_RULES.backtest_use;
    total += SCORE_RULES.backtest_use;
  }

  // 7. VIP頁面瀏覽 +20
  if (funnel.vipViews > 0 || milestones.first_vip_page_view) {
    breakdown.vip_page_view = SCORE_RULES.vip_page_view;
    total += SCORE_RULES.vip_page_view;
  }

  // 8. 升級按鈕點擊 +30
  if (funnel.upgradeClicks > 0 || milestones.first_upgrade_click) {
    breakdown.upgrade_click = SCORE_RULES.upgrade_click;
    total += SCORE_RULES.upgrade_click;
  }

  // 上限 100
  total = Math.min(100, total);

  // 保存
  const result: IntentScore = {
    score: total,
    level: getIntentLevel(total),
    levelLabel: getIntentLevelLabel(total),
    breakdown,
    updatedAt: new Date().toISOString(),
  };

  // V18.2.14: 透過統一 Storage 層儲存
  try {
    saveJson(INTENT_KEY, result);
    defaultFactory.getAnalyticsRepository().saveIntent(result).catch(() => {});
  }
  catch { /* ignore */ }

  return result;
}

/** 獲取意向等級 */
export function getIntentLevel(score: number): 'cold' | 'warm' | 'hot' {
  if (score <= 30) return 'cold';
  if (score <= 70) return 'warm';
  return 'hot';
}

/** 獲取意向等級標籤 */
export function getIntentLevelLabel(score: number): string {
  if (score <= 30) return '冷';
  if (score <= 70) return '溫';
  return '熱';
}

/** 獲取已保存的意向分數 */
export function getSavedIntentScore(): IntentScore | null {
  try {
    // V18.2.14: 統一使用 Storage 層
    return loadJson<IntentScore | null>(INTENT_KEY, null);
  } catch { return null; }
}

/** 獲取里程碑轉換意向分數對應 */
export function getMilestoneIntentContribution(): { milestone: BehaviorEvent; score: number; completed: boolean }[] {
  const milestones = getMilestoneStatus();
  return [
    { milestone: 'first_ai_recommend', score: SCORE_RULES.ai_recommend_click, completed: milestones.first_ai_recommend },
    { milestone: 'first_watchlist', score: SCORE_RULES.watchlist_use, completed: milestones.first_watchlist },
    { milestone: 'first_dream', score: SCORE_RULES.dream_use, completed: milestones.first_dream },
    { milestone: 'first_fortune', score: SCORE_RULES.fortune_use, completed: milestones.first_fortune },
    { milestone: 'first_backtest', score: SCORE_RULES.backtest_use, completed: milestones.first_backtest },
    { milestone: 'first_vip_page_view', score: SCORE_RULES.vip_page_view, completed: milestones.first_vip_page_view },
    { milestone: 'first_upgrade_click', score: SCORE_RULES.upgrade_click, completed: milestones.first_upgrade_click },
  ];
}

/** 獲取簡易用戶分群 */
export function getUserSegment(): { segment: string; label: string; recommendation: string } {
  const score = getIntentScore();
  switch (score.level) {
    case 'hot':
      return { segment: 'high_intent', label: '高意圖用戶', recommendation: '推送限時VIP折扣，加速轉換' };
    case 'warm':
      return { segment: 'medium_intent', label: '中意圖用戶', recommendation: '展示VIP價值頁案例，強調ROI' };
    case 'cold':
      return { segment: 'low_intent', label: '低意圖用戶', recommendation: '提升產品體驗，增加功能使用頻率' };
  }
}
