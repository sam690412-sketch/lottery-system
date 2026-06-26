// ============================================================
// V9 彩種切換器 - 威力彩 / 大樂透 / 今彩539
// ============================================================
import { Badge } from '@/components/ui/badge';
import type { LotteryType } from '@/utils/lotteryConfig';
import { LOTTERY_CONFIGS } from '@/utils/lotteryConfig';
import { Sparkles, Clover, Sun } from 'lucide-react';

interface Props {
  active: LotteryType;
  onChange: (type: LotteryType) => void;
}

const ICONS: Partial<Record<LotteryType, React.ReactNode>> = {
  power: <Sparkles className="w-4 h-4" />,
  lotto649: <Clover className="w-4 h-4" />,
  daily539: <Sun className="w-4 h-4" />,
};

const COLOR_CLASS: Partial<Record<LotteryType, string>> = {
  power: 'text-amber-400 border-amber-700/50 bg-amber-950/30 hover:bg-amber-900/40',
  lotto649: 'text-blue-400 border-blue-700/50 bg-blue-950/30 hover:bg-blue-900/40',
  daily539: 'text-emerald-400 border-emerald-700/50 bg-emerald-950/30 hover:bg-emerald-900/40',
};

const ACTIVE_CLASS: Partial<Record<LotteryType, string>> = {
  power: 'ring-2 ring-amber-500/50 bg-amber-900/40',
  lotto649: 'ring-2 ring-blue-500/50 bg-blue-900/40',
  daily539: 'ring-2 ring-emerald-500/50 bg-emerald-900/40',
};

export default function LotterySelector({ active, onChange }: Props) {
  const config = LOTTERY_CONFIGS[active];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {(Object.keys(LOTTERY_CONFIGS) as LotteryType[]).map(type => {
          const c = LOTTERY_CONFIGS[type];
          const isActive = type === active;
          return (
            <button
              key={type}
              onClick={() => onChange(type)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-sm font-medium ${
                isActive ? `${COLOR_CLASS[type]} ${ACTIVE_CLASS[type]}` : 'border-gray-700/50 text-gray-500 hover:text-gray-300 hover:bg-gray-800/40'
              }`}
            >
              {ICONS[type]}
              <span>{c.name}</span>
              {isActive && (
                <Badge variant="outline" className={`text-[9px] ml-1 ${COLOR_CLASS[type]}`}>
                  {config.mainMin}~{config.mainMax}選{config.mainCount}
                  {config.hasSpecial && config.specialMode === 'separate' ? `+${config.specialMin}~${config.specialMax}` : ''}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
