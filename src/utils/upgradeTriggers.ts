// ============================================================
// V18.1.3 PHASE A+B+E: Intent Driven Trigger System
// 根據 Intent Score (冷/溫/熱) + 情境優先級，顯示最適合的升級文案
// Cold(0-30): 不顯示廣告 / Warm(31-70): 輕量Trigger / Hot(71-100): 強CTA
// ============================================================

import { getCurrentPermissions, getCurrentRole, getVipTrialRemaining } from './permissions';
import { getIntentScore, getSavedIntentScore, type IntentScore } from './intentScore';

export type TriggerType =
  | 'ai_locked'      // AI推薦被鎖 (P1)
  | 'pool_full'      // 觀察池已滿 (P2)
  | 'backtest_locked'// 回測功能被鎖 (P3)
  | 'trial_empty'    // 命理次數不足 (P4)
  | 'dream_empty'    // 夢境次數不足 (P5)
  | 'general'        // 一般升級 (P6)
  // V18.1.3 PHASE A: Intent Driven 類型
  | 'intent_cold'    // Cold用戶 - 只保留一般提示
  | 'intent_warm'    // Warm用戶 - 輕量Trigger
  | 'intent_hot';    // Hot用戶 - 強CTA

export interface TriggerMessage {
  type: TriggerType;
  title: string;
  subtitle: string;
  highlight: string;  // 強調的VIP功能
  cta: string;        // 按鈕文案
  priority: number;   // 優先級 1-5
}

const MESSAGES: Record<TriggerType, TriggerMessage> = {
  ai_locked: {
    type: 'ai_locked',
    title: '想看完整 AI 推薦號碼？',
    subtitle: '免費會員只能看前 2 碼，升級 VIP 立即解鎖完整 6 碼 + 每日 5 組推薦',
    highlight: 'AI推薦 x5 組/日',
    cta: '解鎖完整推薦',
    priority: 6,
  },
  pool_full: {
    type: 'pool_full',
    title: '觀察池已滿（10/10）',
    subtitle: '你正在追蹤的號碼已達上限。VIP 會員可擴充至 50 碼，完整監控冷熱變化',
    highlight: '觀察池 50 碼',
    cta: '擴充觀察池',
    priority: 5,
  },
  backtest_locked: {
    type: 'backtest_locked',
    title: '回測分析僅限 VIP',
    subtitle: '用歷史數據驗證你的選號策略。100/300/500 期回測，科學選號',
    highlight: '歷史回測',
    cta: '解鎖回測分析',
    priority: 4,
  },
  trial_empty: {
    type: 'trial_empty',
    title: 'VIP 體驗券已用完',
    subtitle: '命理輔助和綜合模式需要 VIP。八字、紫微、梅花易數等你解鎖',
    highlight: '命理輔助全開',
    cta: '繼續使用命理',
    priority: 3,
  },
  dream_empty: {
    type: 'dream_empty',
    title: '夢境選牌次數不足',
    subtitle: 'VIP 會員可無限使用夢境選牌功能，輸入夢境即可獲得象徵權重建議',
    highlight: '夢境無限',
    cta: '解鎖夢境功能',
    priority: 2,
  },
  general: {
    type: 'general',
    title: '升級 VIP，解鎖全部功能',
    subtitle: '超過 80% 的活躍用戶選擇 VIP。無限產號、AI 推薦、觀察池擴容',
    highlight: '全部功能',
    cta: '查看 VIP 方案',
    priority: 1,
  },
  // V18.1.3 PHASE A: Intent Driven Messages
  intent_cold: {
    type: 'intent_cold',
    title: '繼續體驗選號功能',
    subtitle: '免費會員每日可產號 10 次，盡情探索各種選號方式',
    highlight: '免費體驗',
    cta: '繼續體驗',
    priority: 0,
  },
  intent_warm: {
    type: 'intent_warm',
    title: '已有許多會員開始使用 AI 推薦與觀察池功能',
    subtitle: '升級即可解鎖更多能力：無限產號、AI推薦x5、回測分析、50碼觀察池',
    highlight: 'AI+觀察池',
    cta: '了解VIP價值',
    priority: 0,
  },
  intent_hot: {
    type: 'intent_hot',
    title: '你已經完成大部分核心體驗',
    subtitle: '立即升級 VIP，解鎖完整功能：無限產號、AI推薦x5、回測分析、命理輔助全開',
    highlight: '完整功能',
    cta: '立即升級',
    priority: 0,
  },
};

/** V18.1.3 PHASE A: 根據 Intent Score 返回對應的 Intent Driven Trigger */
export function checkIntentDrivenTrigger(score: IntentScore): TriggerMessage {
  switch (score.level) {
    case 'cold':
      return MESSAGES.intent_cold;
    case 'warm':
      return MESSAGES.intent_warm;
    case 'hot':
      return MESSAGES.intent_hot;
  }
}

/** V18.1.3 PHASE B: 檢查情境優先級，返回單一最高優先級 Trigger */
function checkPriorityTrigger(): TriggerMessage | null {
  const perms = getCurrentPermissions();
  const role = getCurrentRole();

  // P1: AI推薦被鎖（最高優先級）
  if (role === 'free' && perms.maxAIGenerations <= 1) {
    return MESSAGES.ai_locked;
  }

  // P2: 觀察池已滿
  if (role === 'free' && perms.maxObservationPool <= 10) {
    return MESSAGES.pool_full;
  }

  // P3: 回測被鎖
  if (!perms.canViewBacktest && role !== 'guest') {
    return MESSAGES.backtest_locked;
  }

  // P4: 命理次數不足
  if (role === 'free') {
    const remaining = getVipTrialRemaining();
    if (remaining === 0) {
      return MESSAGES.trial_empty;
    }
  }

  // P5: 夢境次數不足
  if (role === 'free' && !perms.canUseDream) {
    return MESSAGES.dream_empty;
  }

  // P6: 一般升級（無特定情境）
  return null;
}

/** V18.1.3: 整合檢查 - Intent Driven + Priority */
export function checkTrigger(): TriggerMessage {
  // 1. 先檢查是否有高優先級情境觸發
  const priorityTrigger = checkPriorityTrigger();

  // 2. 取得 Intent Score（優先使用已保存值）
  const intentScore = getSavedIntentScore() || getIntentScore();

  // 3. Cold 用戶 (0-30): 即使有優先情境也只顯示一般提示
  if (intentScore.level === 'cold') {
    return priorityTrigger && priorityTrigger.priority >= 5
      ? priorityTrigger  // 但 AI 被鎖和觀察池滿這種阻塞性情況仍顯示
      : MESSAGES.intent_cold;
  }

  // 4. Warm/Hot 用戶: 有優先情境顯示情境trigger，否則顯示intent driven
  if (priorityTrigger) {
    // Warm: 輕量顯示 / Hot: 強CTA
    if (intentScore.level === 'warm' && priorityTrigger.priority < 4) {
      return MESSAGES.intent_warm;
    }
    return priorityTrigger;
  }

  // 5. 無特定情境: 完全依照 Intent Score 顯示
  return checkIntentDrivenTrigger(intentScore);
}

/** 取得所有可能的觸發訊息（用於A/B測試） */
export function getAllTriggers(): TriggerMessage[] {
  return Object.values(MESSAGES).sort((a, b) => b.priority - a.priority);
}

/** 根據觸發類型取得特定訊息 */
export function getTriggerByType(type: TriggerType): TriggerMessage {
  return MESSAGES[type] || MESSAGES.general;
}
