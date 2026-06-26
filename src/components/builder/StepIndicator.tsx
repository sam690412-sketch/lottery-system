// ============================================================
// V16-1 — Builder Wizard StepIndicator（純顯示步驟指示）
// 不接任何引擎、不做任何 gating。
// ============================================================
import { Check } from 'lucide-react';

export interface BuilderStep {
  key: string;
  label: string;
}

export const BUILDER_STEPS: BuilderStep[] = [
  { key: 'lottery', label: '彩種' },
  { key: 'stats', label: '統計' },
  { key: 'dream', label: '夢境' },
  { key: 'birthday', label: '生日' },
  { key: 'metaphysics', label: '命理' },
  { key: 'result', label: '完成' },
];

interface StepIndicatorProps {
  current: number; // 0-based index
  onJump?: (index: number) => void;
}

export default function StepIndicator({ current, onJump }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between w-full gap-0.5 overflow-x-auto py-3 px-0.5 no-scrollbar">
      {BUILDER_STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none min-w-[2.6rem]">
            <button
              type="button"
              onClick={() => onJump?.(i)}
              className="flex flex-col items-center gap-1 shrink-0"
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition',
                  active
                    ? 'bg-amber-500 text-gray-950 border-amber-400'
                    : done
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-gray-800 text-gray-500 border-gray-700',
                ].join(' ')}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span className={active ? 'text-[10px] text-amber-300 whitespace-nowrap' : 'text-[10px] text-gray-500 whitespace-nowrap'}>
                {step.label}
              </span>
            </button>
            {i < BUILDER_STEPS.length - 1 && (
              <span className={`h-0.5 flex-1 mx-0.5 min-w-[0.5rem] ${i < current ? 'bg-amber-500/50' : 'bg-gray-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
