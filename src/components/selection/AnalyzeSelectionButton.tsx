/**
 * AnalyzeSelectionButton.tsx  (V24)
 *
 * 可重用的「分析」按鈕,給「我的號碼 / 收藏」列使用。
 * 點擊後導向 /selection-analysis 並帶入號碼,頁面會自動執行 scoreSelection()。
 *
 * 設計:
 * - 純新增、與既有收藏元件解耦;呼叫端只要傳入號碼與彩種即可。
 * - 用 <a>(框架無關),避免綁定特定 router;若你用 react-router,
 *   可改成 <Link to={href}>。
 */

import { memo } from 'react';

export interface AnalyzeSelectionButtonProps {
  /** 主號。 */
  numbers: number[];
  /** 彩種代碼(power / lotto649 / daily539 …)。 */
  lotteryType: string;
  /** 自訂文字,預設「分析」。 */
  label?: string;
  className?: string;
}

function buildHref(lotteryType: string, numbers: number[]): string {
  const params = new URLSearchParams({
    game: lotteryType,
    numbers: numbers.join(','),
  });
  return `/selection-analysis?${params.toString()}`;
}

function AnalyzeSelectionButtonBase({
  numbers,
  lotteryType,
  label = '分析',
  className = '',
}: AnalyzeSelectionButtonProps) {
  return (
    <a
      href={buildHref(lotteryType, numbers)}
      className={`inline-flex items-center justify-center rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300 transition-colors hover:bg-orange-500/20 ${className}`}
    >
      {label}
    </a>
  );
}

export const AnalyzeSelectionButton = memo(AnalyzeSelectionButtonBase);
export default AnalyzeSelectionButton;
