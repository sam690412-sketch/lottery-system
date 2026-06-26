// ============================================================
// V9 獎項判斷系統 - 三彩種共用
// ============================================================

import type { LotteryType } from './lotteryConfig';
import { getConfig } from './lotteryConfig';

export interface PrizeResult {
  tier: string;       // 獎項名稱
  matched: number;    // 主區命中數
  specialMatched: boolean; // 特別號/第二區是否命中
  isWin: boolean;     // 是否中獎
  estimatedAmount: number; // 參考獎金（實際浮動）
  note: string;       // 說明
}

/** 判斷獎項 */
export function getPrizeTier(type: LotteryType, mainHits: number, specialHit: boolean): PrizeResult {
  switch (type) {
    case 'power':
      return getPowerPrize(mainHits, specialHit);
    case 'lotto649':
      return getLotto649Prize(mainHits, specialHit);
    case 'daily539':
      return getDaily539Prize(mainHits);
    default:
      return { tier: '未知', matched: mainHits, specialMatched: specialHit, isWin: false, estimatedAmount: 0, note: '' };
  }
}

/** 威力彩獎項 */
function getPowerPrize(mainHits: number, specialHit: boolean): PrizeResult {
  if (mainHits === 6 && specialHit) return { tier: '頭獎', matched: 6, specialMatched: true, isWin: true, estimatedAmount: 0, note: '頭獎為浮動獎金，請輸入實際金額' };
  if (mainHits === 6) return { tier: '貳獎', matched: 6, specialMatched: false, isWin: true, estimatedAmount: 0, note: '貳獎為浮動獎金' };
  if (mainHits === 5 && specialHit) return { tier: '參獎', matched: 5, specialMatched: true, isWin: true, estimatedAmount: 150000, note: '固定獎金' };
  if (mainHits === 5) return { tier: '肆獎', matched: 5, specialMatched: false, isWin: true, estimatedAmount: 20000, note: '固定獎金' };
  if (mainHits === 4 && specialHit) return { tier: '伍獎', matched: 4, specialMatched: true, isWin: true, estimatedAmount: 4000, note: '固定獎金' };
  if (mainHits === 4) return { tier: '陸獎', matched: 4, specialMatched: false, isWin: true, estimatedAmount: 800, note: '固定獎金' };
  if (mainHits === 3 && specialHit) return { tier: '柒獎', matched: 3, specialMatched: true, isWin: true, estimatedAmount: 400, note: '固定獎金' };
  if (mainHits === 2 && specialHit) return { tier: '捌獎', matched: 2, specialMatched: true, isWin: true, estimatedAmount: 200, note: '固定獎金' };
  if (mainHits === 3) return { tier: '普獎', matched: 3, specialMatched: false, isWin: true, estimatedAmount: 100, note: '固定獎金' };
  return { tier: '未中獎', matched: mainHits, specialMatched: specialHit, isWin: false, estimatedAmount: 0, note: '' };
}

/** 大樂透獎項 */
function getLotto649Prize(mainHits: number, specialHit: boolean): PrizeResult {
  if (mainHits === 6 && specialHit) return { tier: '頭獎', matched: 6, specialMatched: true, isWin: true, estimatedAmount: 0, note: '頭獎為浮動獎金，請輸入實際金額' };
  if (mainHits === 6) return { tier: '貳獎', matched: 6, specialMatched: false, isWin: true, estimatedAmount: 0, note: '貳獎為浮動獎金' };
  if (mainHits === 5 && specialHit) return { tier: '參獎', matched: 5, specialMatched: true, isWin: true, estimatedAmount: 0, note: '參獎為浮動獎金' };
  if (mainHits === 5) return { tier: '肆獎', matched: 5, specialMatched: false, isWin: true, estimatedAmount: 0, note: '肆獎為浮動獎金' };
  if (mainHits === 4 && specialHit) return { tier: '伍獎', matched: 4, specialMatched: true, isWin: true, estimatedAmount: 0, note: '伍獎為浮動獎金' };
  if (mainHits === 4) return { tier: '陸獎', matched: 4, specialMatched: false, isWin: true, estimatedAmount: 2000, note: '固定獎金' };
  if (mainHits === 3 && specialHit) return { tier: '柒獎', matched: 3, specialMatched: true, isWin: true, estimatedAmount: 1000, note: '固定獎金' };
  if (mainHits === 2 && specialHit) return { tier: '普獎', matched: 2, specialMatched: true, isWin: true, estimatedAmount: 400, note: '固定獎金' };
  if (mainHits === 3) return { tier: '玖獎', matched: 3, specialMatched: false, isWin: true, estimatedAmount: 200, note: '固定獎金' };
  return { tier: '未中獎', matched: mainHits, specialMatched: specialHit, isWin: false, estimatedAmount: 0, note: '' };
}

/** 今彩539獎項 */
function getDaily539Prize(mainHits: number): PrizeResult {
  if (mainHits === 5) return { tier: '頭獎', matched: 5, specialMatched: false, isWin: true, estimatedAmount: 8000000, note: '頭獎固定800萬' };
  if (mainHits === 4) return { tier: '貳獎', matched: 4, specialMatched: false, isWin: true, estimatedAmount: 20000, note: '固定獎金' };
  if (mainHits === 3) return { tier: '參獎', matched: 3, specialMatched: false, isWin: true, estimatedAmount: 300, note: '固定獎金' };
  if (mainHits === 2) return { tier: '肆獎', matched: 2, specialMatched: false, isWin: true, estimatedAmount: 50, note: '固定獎金' };
  return { tier: '未中獎', matched: mainHits, specialMatched: false, isWin: false, estimatedAmount: 0, note: '' };
}

/** 計算命中數 */
export function countMatches(myMain: number[], drawMain: number[], mySpecial?: number, drawSpecial?: number) {
  const mainHits = myMain.filter(n => drawMain.includes(n)).length;
  const specialHit = mySpecial !== undefined && drawSpecial !== undefined && mySpecial === drawSpecial;
  return { mainHits, specialHit };
}

/** 計算投注成本 */
export function calculateCost(type: LotteryType, comboCount: number): number {
  return getConfig(type).ticketPrice * comboCount;
}
