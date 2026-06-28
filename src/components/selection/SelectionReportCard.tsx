/**
 * SelectionReportCard.tsx  (V24-D)
 *
 * 顯示「AI 選號分析報告」。由當前分析結果即時計算(吃 scoreResult),
 * 不讀寫 localStorage、不取資料。標示娛樂用途。
 *
 * 提供「複製報告」按鈕,複製內容為純文字(exportSelectionReportAsText)。
 */

import { memo, useMemo, useState } from 'react';
import type { SelectionScoreResult } from '@/utils/selectionScoreEngine';
import {
  generateSelectionReport,
  exportSelectionReportAsText,
  downloadSelectionReportText,
  downloadSelectionReportHtml,
  type SelectionSourceMeta,
} from '@/utils/selectionReportEngine';

const GAME_LABEL: Record<string, string> = {
  power: '威力彩',
  lotto649: '大樂透',
  daily539: '今彩539',
};

export interface SelectionReportCardProps {
  lotteryType: string;
  numbers: number[];
  scoreResult: SelectionScoreResult;
  sourceMeta?: SelectionSourceMeta;
  className?: string;
}

function scoreColor(v: number): string {
  if (v >= 80) return 'text-orange-300';
  if (v >= 60) return 'text-amber-300';
  return 'text-neutral-400';
}

function SelectionReportCardBase({
  lotteryType,
  numbers,
  scoreResult,
  sourceMeta,
  className = '',
}: SelectionReportCardProps) {
  const report = useMemo(
    () => generateSelectionReport({ lotteryType, numbers, scoreResult, sourceMeta }),
    [lotteryType, numbers, scoreResult, sourceMeta],
  );

  const [copied, setCopied] = useState(false);

  const exportCtx = {
    lotteryType,
    numbers,
    overallScore: scoreResult.overallScore,
  };

  const handleCopy = async () => {
    const text = exportSelectionReportAsText(report, exportCtx);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('clipboard unavailable');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // 後備:選取 textarea 提示使用者手動複製
      window.prompt('複製以下報告內容:', text);
    }
  };

  const handleDownloadTxt = () => {
    downloadSelectionReportText(report, exportCtx);
  };

  const handleDownloadHtml = () => {
    downloadSelectionReportHtml(report, exportCtx);
  };

  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-neutral-900 p-4 ${className}`}>
      {/* 標題列 */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-neutral-100">{report.title}</h3>
          <p className="mt-0.5 text-[11px] text-neutral-600">
            產生時間 {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <button
            onClick={handleCopy}
            className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300 transition-colors hover:bg-orange-500/20"
          >
            {copied ? '已複製' : '複製報告'}
          </button>
          <button
            onClick={handleDownloadTxt}
            className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
          >
            下載 TXT
          </button>
          <button
            onClick={handleDownloadHtml}
            className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
          >
            下載 HTML
          </button>
        </div>
      </div>

      {/* 彩種 / 號碼 / 整體分數 */}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-white/[0.04] bg-neutral-950/40 px-3 py-2">
        <div className="min-w-0">
          <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300">
            {GAME_LABEL[lotteryType] ?? lotteryType}
          </span>
          <p className="mt-1 truncate text-xs tabular-nums text-neutral-300">
            {numbers.map((n) => String(n).padStart(2, '0')).join(' ')}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-2xl font-bold tabular-nums ${scoreColor(scoreResult.overallScore)}`}>
            {scoreResult.overallScore}
          </p>
          <p className="text-[10px] text-neutral-600">{report.scoreLabel}</p>
        </div>
      </div>

      {/* 摘要 */}
      <p className="mb-3 text-xs leading-relaxed text-neutral-300">{report.summary}</p>

      {/* 十個 section */}
      <div className="space-y-2">
        {report.sections.map((sec) => (
          <div
            key={sec.id}
            className="rounded-lg border border-white/[0.04] bg-neutral-950/30 px-3 py-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-neutral-200">{sec.title}</p>
              {sec.score !== undefined ? (
                <span className={`text-xs font-bold tabular-nums ${scoreColor(sec.score)}`}>
                  {sec.score}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">{sec.body}</p>
          </div>
        ))}
      </div>

      {/* 參考建議 */}
      {report.recommendations.length ? (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold text-neutral-200">參考建議</p>
          <ul className="space-y-1">
            {report.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-neutral-400">
                <span className="text-orange-500">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 提醒 */}
      {report.warnings.length ? (
        <div className="mt-3 border-t border-white/[0.06] pt-2">
          {report.warnings.map((w, i) => (
            <p key={i} className="text-[10px] text-neutral-600">
              ※ {w}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const SelectionReportCard = memo(SelectionReportCardBase);
export default SelectionReportCard;
