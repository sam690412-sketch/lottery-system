// ============================================================
// V18.1.3 PHASE A+B+E: Intent Driven Upgrade Trigger Banner
// 根據 Intent Score (冷/溫/熱) + 情境優先級顯示不同 Trigger
// Cold: 不顯示廣告 / Warm: 輕量Trigger / Hot: 強CTA
// ============================================================
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/utils/analytics';
import { trackFirst } from '@/utils/behaviorTracker';
import { type TriggerMessage, checkTrigger, getTriggerByType } from '@/utils/upgradeTriggers';
import { getIntentScore, getSavedIntentScore } from '@/utils/intentScore';
import { useNavigate } from 'react-router';
import { X, Lock, Eye, Brain, Sparkles, BarChart3, Snowflake, Flame, Thermometer } from 'lucide-react';
import { useState, useMemo } from 'react';

const TRIGGER_ICONS = {
  ai_locked: Brain,
  pool_full: Eye,
  trial_empty: Sparkles,
  backtest_locked: BarChart3,
  dream_empty: Sparkles,
  general: Lock,
  intent_cold: Snowflake,
  intent_warm: Thermometer,
  intent_hot: Flame,
};

const TRIGGER_COLORS: Record<string, string> = {
  ai_locked: 'border-purple-700/40 bg-purple-950/20',
  pool_full: 'border-cyan-700/40 bg-cyan-950/20',
  trial_empty: 'border-indigo-700/40 bg-indigo-950/20',
  backtest_locked: 'border-amber-700/40 bg-amber-950/20',
  dream_empty: 'border-pink-700/40 bg-pink-950/20',
  general: 'border-gray-700/40 bg-gray-800/50',
  // V18.1.3: Intent Driven 顏色
  intent_cold: 'border-blue-800/30 bg-blue-950/10',
  intent_warm: 'border-amber-700/30 bg-amber-950/10',
  intent_hot: 'border-red-700/40 bg-red-950/20',
};

const ICON_COLORS: Record<string, string> = {
  ai_locked: 'text-purple-400',
  pool_full: 'text-cyan-400',
  trial_empty: 'text-indigo-400',
  backtest_locked: 'text-amber-400',
  dream_empty: 'text-pink-400',
  general: 'text-gray-400',
  intent_cold: 'text-blue-400',
  intent_warm: 'text-amber-400',
  intent_hot: 'text-red-400',
};

const CTA_COLORS: Record<string, string> = {
  ai_locked: 'bg-purple-600 hover:bg-purple-500',
  pool_full: 'bg-cyan-600 hover:bg-cyan-500',
  trial_empty: 'bg-indigo-600 hover:bg-indigo-500',
  backtest_locked: 'bg-amber-600 hover:bg-amber-500',
  dream_empty: 'bg-pink-600 hover:bg-pink-500',
  general: 'bg-amber-600 hover:bg-amber-500',
  intent_cold: 'bg-gray-700 hover:bg-gray-600',
  intent_warm: 'bg-amber-600 hover:bg-amber-500',
  intent_hot: 'bg-red-600 hover:bg-red-500',
};

interface Props {
  /** 強制指定情境類型，若未提供則自動檢測 */
  forcedType?: string;
  /** 點擊升級後的回調 */
  onUpgrade?: () => void;
  /** 是否可關閉 */
  dismissible?: boolean;
}

export default function UpgradeTriggerBanner({ forcedType, onUpgrade, dismissible = true }: Props) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // V18.1.3: 讀取 Intent Score（優先使用已保存值，避免重新計算覆蓋）
  const intentScore = useMemo(() => {
    const saved = getSavedIntentScore();
    if (saved) return saved;
    return getIntentScore();
  }, []);

  if (dismissed) return null;

  const trigger: TriggerMessage = forcedType
    ? getTriggerByType(forcedType as Parameters<typeof getTriggerByType>[0])
    : checkTrigger();

  // V18.1.3 PHASE A: Cold 用戶(0-30)不顯示升級廣告
  if (!forcedType && intentScore.level === 'cold' && trigger.type === 'intent_cold') {
    return (
      <div className="rounded-lg border border-blue-800/20 bg-blue-950/5 px-3 py-2 text-center">
        <p className="text-[10px] text-gray-600">
          💡 提示：免費會員每日可產號 10 次，盡情體驗各種選號方式
        </p>
      </div>
    );
  }

  const Icon = TRIGGER_ICONS[trigger.type as keyof typeof TRIGGER_ICONS] || Lock;
  const colorClass = TRIGGER_COLORS[trigger.type] || TRIGGER_COLORS.general;
  const iconColor = ICON_COLORS[trigger.type] || ICON_COLORS.general;
  const ctaClass = CTA_COLORS[trigger.type] || CTA_COLORS.general;

  // V18.1.3 PHASE E: 動態 CTA 根據 Intent Level
  const getDynamicCTA = () => {
    if (forcedType) return trigger.cta;
    switch (intentScore.level) {
      case 'hot': return '立即升級';
      case 'warm': return '了解VIP價值';
      case 'cold': return '繼續體驗';
    }
  };

  // V18.1.3 PHASE E: 動態導航目標
  const getDynamicTarget = () => {
    if (intentScore.level === 'hot') return '/vip-roi';
    if (intentScore.level === 'warm') return '/vip-value-v2';
    return '/vip-value-v2';
  };

  const handleUpgrade = () => {
    trackEvent('trigger_click', trigger.type);
    trackEvent('intent_trigger_click', intentScore.level, trigger.type);
    trackFirst('first_upgrade_click');
    trackFirst('first_vip_page_view');
    if (onUpgrade) onUpgrade();
    else navigate(getDynamicTarget());
  };

  // V18.1.3: 記錄曝光（含 intent level）
  trackEvent('trigger_show', trigger.type);
  trackEvent('intent_trigger_show', intentScore.level, trigger.type);

  return (
    <div className={`relative rounded-xl border p-4 mb-3 ${colorClass}`}>
      {/* Intent Score 徽章 */}
      <div className="absolute -top-2 -right-2">
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
          intentScore.level === 'hot' ? 'bg-red-900/60 text-red-300 border border-red-700/40' :
          intentScore.level === 'warm' ? 'bg-amber-900/60 text-amber-300 border border-amber-700/40' :
          'bg-blue-900/60 text-blue-300 border border-blue-700/40'
        }`}>
          {intentScore.score}
        </span>
      </div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-400"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="flex items-start gap-3">
        <div className={`shrink-0 mt-0.5 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-200">{trigger.title}</p>
          <p className="text-xs text-gray-500 mt-1">{trigger.subtitle}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
              {trigger.highlight}
            </span>
            <Button
              size="sm"
              className={`h-7 text-xs ${ctaClass}`}
              onClick={handleUpgrade}
            >
              {getDynamicCTA()} →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
