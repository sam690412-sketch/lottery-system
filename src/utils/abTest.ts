// ============================================================
// V18.2.14 PHASE A: A/B TEST 框架 - 已遷移到 businessDataStorage
// ============================================================

import { trackEvent } from './analytics';
import { loadABTest, saveABTest, removeKey } from '@/repositories/businessDataStorage';

const AB_TEST_KEY = 'lottery-v18-ab-test';

export type ABVariant = 'A' | 'B' | 'C';

export interface ABConfig {
  variant: ABVariant;
  assignedAt: string;
  clicks: number;
}

/** A/B 測試配置 */
const VARIANTS: Record<ABVariant, { name: string; highlight: string; color: string }> = {
  A: { name: 'AI推薦版', highlight: 'AI智能推薦', color: 'border-purple-500 bg-purple-950/20' },
  B: { name: '觀察池版', highlight: '深度號碼追蹤', color: 'border-cyan-500 bg-cyan-950/20' },
  C: { name: '玄學版', highlight: '夢境命理解析', color: 'border-indigo-500 bg-indigo-950/20' },
};

/** 獲取用戶的 A/B 版本（首次隨機分配，後續固定） */
export function getABVariant(): ABVariant {
  try {
    const raw = loadABTest();
    if (raw) {
      const config: ABConfig = JSON.parse(raw);
      return config.variant;
    }
  } catch { /* ignore */ }

  // 首次隨機分配
  const variants: ABVariant[] = ['A', 'B', 'C'];
  const variant = variants[Math.floor(Math.random() * variants.length)];
  const config: ABConfig = { variant, assignedAt: new Date().toISOString(), clicks: 0 };
  saveABTest(config);
  trackEvent('ab_test', 'assigned', variant);
  return variant;
}

/** 獲取版本資訊 */
export function getVariantInfo(variant: ABVariant) {
  return VARIANTS[variant];
}

/** 記錄 A/B 測試點擊 */
export function trackABClick(action: string): void {
  const variant = getABVariant();
  trackEvent('ab_test_click', action, variant);

  // 增加點擊計數
  try {
    const raw = loadABTest();
    if (raw) {
      const config: ABConfig = JSON.parse(raw);
      config.clicks++;
      saveABTest(config);
    }
  } catch { /* ignore */ }
}

/** 獲取 A/B 測試統計 */
export function getABStats(): Record<ABVariant, { users: number; clicks: number }> {
  // 這裡簡化為本地統計，正式版應從後端獲取
  const stats: Record<ABVariant, { users: number; clicks: number }> = {
    A: { users: 0, clicks: 0 },
    B: { users: 0, clicks: 0 },
    C: { users: 0, clicks: 0 },
  };

  try {
    const raw = loadABTest();
    if (raw) {
      const config: ABConfig = JSON.parse(raw);
      stats[config.variant].users = 1;
      stats[config.variant].clicks = config.clicks;
    }
  } catch { /* ignore */ }

  return stats;
}

/** 重置 A/B 測試（用於測試） */
export function resetABTest(): void {
  removeKey(AB_TEST_KEY);
}

/** 根據 A/B 版本取得推薦文案 */
export function getUpgradeCTA(variant: ABVariant): { title: string; subtitle: string; highlight: string } {
  switch (variant) {
    case 'A':
      return {
        title: 'AI 幫你選號，勝率更高',
        subtitle: 'VIP 每日 5 組 AI 推薦，基於 13 層評分模型',
        highlight: 'AI推薦',
      };
    case 'B':
      return {
        title: '追蹤 50 個號碼的冷熱變化',
        subtitle: 'VIP 觀察池擴容至 50 碼，掌握每個號碼的週期規律',
        highlight: '觀察池50碼',
      };
    case 'C':
      return {
        title: '夢境與命理，另一種選號智慧',
        subtitle: 'VIP 解鎖 5 大夢境學派 + 八字紫微梅花易數',
        highlight: '夢境+命理',
      };
  }
}
