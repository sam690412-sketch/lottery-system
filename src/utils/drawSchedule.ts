// ============================================================
// V11 開獎排程工具
// ============================================================

import type { LotteryType } from './lotteryConfig';
import { getConfig } from './lotteryConfig';

const DAY_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

/** 今天是否為開獎日 */
export function isDrawToday(type: LotteryType): boolean {
  const config = getConfig(type);
  const today = DAY_NAMES[new Date().getDay()];
  return config.drawDays.includes(today);
}

/** 取得下一個開獎日 */
export function getNextDrawDate(type: LotteryType): Date {
  const config = getConfig(type);
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dayName = DAY_NAMES[d.getDay()];
    if (config.drawDays.includes(dayName)) return d;
  }
  return now;
}

/** 計算未來N天內的開獎日 */
export function getDrawDates(type: LotteryType, days: number = 28): Date[] {
  const config = getConfig(type);
  const dates: Date[] = [];
  const now = new Date();
  for (let i = 0; i <= days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dayName = DAY_NAMES[d.getDay()];
    if (config.drawDays.includes(dayName)) dates.push(d);
  }
  return dates;
}

/** 取得下一個開獎的彩種 */
export function getNextDrawLottery(): { type: LotteryType; date: Date } | null {
  const types: LotteryType[] = ['power', 'lotto649', 'daily539'];
  let earliest: { type: LotteryType; date: Date } | null = null;
  for (const t of types) {
    const d = getNextDrawDate(t);
    if (!earliest || d < earliest.date) earliest = { type: t, date: d };
  }
  return earliest;
}

/** 今天哪個彩種開獎 */
export function getTodayDrawLotteries(): LotteryType[] {
  const types: LotteryType[] = ['power', 'lotto649', 'daily539'];
  return types.filter(t => isDrawToday(t));
}
