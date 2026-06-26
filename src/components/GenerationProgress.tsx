// ============================================================
// V18.2.11 MODULE A: Generation Progress
// 產號進度動畫元件
// ============================================================
import { Loader2 } from 'lucide-react';

export interface GenerationStage {
  percent: number;
  label: string;
}

export const GENERATION_STAGES: GenerationStage[] = [
  { percent: 0,  label: '初始化條件' },
  { percent: 15, label: '讀取養號資料' },
  { percent: 30, label: '分析統計觀察池' },
  { percent: 45, label: '解析夢境權重' },
  { percent: 60, label: '套用命理權重' },
  { percent: 75, label: '執行13層漏斗' },
  { percent: 90, label: '組合校驗' },
  { percent: 100, label: '產號完成' },
];

interface Props {
  progress: number; // 0-100
}

function getStageLabel(progress: number): string {
  for (let i = GENERATION_STAGES.length - 1; i >= 0; i--) {
    if (progress >= GENERATION_STAGES[i].percent) {
      return GENERATION_STAGES[i].label;
    }
  }
  return GENERATION_STAGES[0].label;
}

export default function GenerationProgress({ progress }: Props) {
  const label = getStageLabel(progress);
  const isComplete = progress >= 100;

  return (
    <div className="w-full space-y-3 py-6 mb-4">
      {/* 進度百分比 + 圖示 */}
      <div className="flex items-center justify-center gap-3">
        {!isComplete && <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />}
        {isComplete && <span className="text-emerald-400 text-lg">✓</span>}
        <span className="text-2xl font-bold text-amber-400">{progress}%</span>
      </div>

      {/* 階段文字 */}
      <p className="text-center text-sm text-gray-400">
        {isComplete ? '產號完成！' : `分析中，請稍候... (${label})`}
      </p>

      {/* 進度條 */}
      <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: isComplete
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
          }}
        />
      </div>

      {/* 階段標記 */}
      <div className="flex justify-between px-0.5">
        {GENERATION_STAGES.filter((_, i) => i % 2 === 0).map((stage) => (
          <div
            key={stage.percent}
            className={`text-[9px] transition-colors ${
              progress >= stage.percent ? 'text-amber-400' : 'text-gray-700'
            }`}
          >
            {stage.percent}%
          </div>
        ))}
      </div>
    </div>
  );
}
