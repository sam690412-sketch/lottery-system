import { Check } from 'lucide-react';

export const BUILDER_STEPS = [
  { key: 'lottery', label: '彩種' },
  { key: 'stats', label: '統計' },
  { key: 'dream', label: '夢境' },
  { key: 'birthday', label: '生日' },
  { key: 'metaphysics', label: '命理' },
  { key: 'result', label: '完成' },
];

interface StepIndicatorProps {
  current: number;
  completed: readonly number[];
  canContinue: boolean;
  onJump: (index: number) => void;
}

export default function StepIndicator({ current, completed, canContinue, onJump }: StepIndicatorProps) {
  return (
    <ol className="v33-stepper v33-panel" aria-label="打造步驟">
      {BUILDER_STEPS.map((step, i) => {
        const done = completed.includes(i);
        const locked = i !== current && (!done || (i > 0 && !canContinue));
        return (
          <li key={step.key} data-complete={done || undefined}>
            <button type="button" onClick={() => onJump(i)} disabled={locked}
              aria-current={i === current ? 'step' : undefined}
              aria-label={`步驟 ${i + 1}，${step.label}${locked ? '，尚未開放' : done && i !== current ? '，已走過' : ''}`}>
              <span className="v33-step-node" aria-hidden="true">
                {done && i !== current ? <Check size={15} /> : i + 1}
              </span>
              <span className="v33-step-label">{step.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
