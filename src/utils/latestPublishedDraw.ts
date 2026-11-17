import { getConfig } from './lotteryConfig';

const SOURCES = {
  power: ['SuperLotto638Result', 'superLotto638Res'],
  lotto649: ['Lotto649Result', 'lotto649Res'],
  daily539: ['Daily539Result', 'daily539Res'],
} as const;

export type PublishedDrawGame = keyof typeof SOURCES;

export interface PublishedDraw {
  issue: number;
  date: string;
  numbers: number[];
  special: number | null;
}

const TAIPEI_OFFSET = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
const DRAW_CACHE_PREFIX = 'lottery:published-draw:v1:';

function taipeiDate(timestamp: number) {
  return new Date(timestamp + TAIPEI_OFFSET).toISOString().slice(0, 10);
}

export function getRegularDrawSchedule(game: PublishedDrawGame, now: number) {
  const today = Date.parse(taipeiDate(now) + 'T20:30:00+08:00');
  const { drawDays } = getConfig(game);
  const week = Array.from({ length: 15 }, (_, i) => today + (i - 7) * DAY_MS)
    .filter(time => drawDays.includes(WEEKDAYS[new Date(time + TAIPEI_OFFSET).getUTCDay()]));
  return {
    next: week.find(time => time > now)!,
    previousDate: taipeiDate(week.filter(time => time <= now).at(-1)!),
  };
}

export function formatDrawCountdown(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60000);
  if (minutes < 1) return '不到 1 分鐘';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes / 60) % 24;
  if (days) return `${days} 天 ${hours} 小時`;
  if (hours) return `${hours} 小時 ${minutes % 60} 分鐘`;
  return `${minutes} 分鐘`;
}

function readPublishedDraw(row: unknown, game: PublishedDrawGame, month: string, today: string): PublishedDraw {
  if (typeof row !== 'object' || !row) throw new Error('Expected a published draw');
  const { period, lotteryDate, drawNumberSize, drawNumberAppear } =
    row as Record<string, unknown>;
  const issue = Number(period);
  const date = typeof lotteryDate === 'string' ? lotteryDate.slice(0, 10) : '';
  const sourceNumbers = drawNumberSize ?? drawNumberAppear;
  const config = getConfig(game);
  if (!date.startsWith(month + '-') || !Array.isArray(sourceNumbers)
    || sourceNumbers.length !== config.mainCount + Number(config.hasSpecial)) {
    throw new Error('Invalid published draw');
  }

  const numbers: number[] = sourceNumbers.slice(0, config.mainCount);
  const special: number | null = config.hasSpecial ? sourceNumbers[config.mainCount] : null;
  const draw = { issue, date, numbers, special };
  if (!isPublishedDraw(draw, game, today)) throw new Error('Invalid published draw');
  return { ...draw, numbers: numbers.sort((a, b) => a - b) };
}

function isPublishedDraw(value: unknown, game: PublishedDrawGame, today: string): value is PublishedDraw {
  if (!value || typeof value !== 'object') return false;
  const { issue, date, numbers, special } = value as PublishedDraw;
  const config = getConfig(game);
  if (!Number.isSafeInteger(issue) || issue <= 0 || typeof date !== 'string' || date > today) return false;
  const timestamp = Date.parse(date + 'T00:00:00Z');
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) return false;
  if (!Array.isArray(numbers) || numbers.length !== config.mainCount || new Set(numbers).size !== numbers.length
    || numbers.some(n => !Number.isInteger(n) || n < config.mainMin || n > config.mainMax)) return false;
  if (!config.hasSpecial) return special === null;
  return special !== null && Number.isInteger(special) && special >= config.specialMin && special <= config.specialMax
    && (config.specialMode !== 'same' || !numbers.includes(special));
}

export function readPublishedDrawCache(game: PublishedDrawGame, now = Date.now()): PublishedDraw | null {
  try {
    const data = JSON.parse(localStorage.getItem(DRAW_CACHE_PREFIX + game) ?? 'null');
    return isPublishedDraw(data, game, taipeiDate(now)) ? data : null;
  } catch {
    return null;
  }
}

export function comparePublishedDraws(a: PublishedDraw, b: PublishedDraw) {
  return a.date.localeCompare(b.date) || a.issue - b.issue;
}

export function rememberPublishedDraw(game: PublishedDrawGame, draw: PublishedDraw) {
  const previous = readPublishedDrawCache(game);
  if (previous && comparePublishedDraws(draw, previous) < 0) return previous;
  try { localStorage.setItem(DRAW_CACHE_PREFIX + game, JSON.stringify(draw)); }
  catch { /* The verified result remains available for this session. */ }
  return draw;
}

export async function fetchLatestPublishedDraw(game: PublishedDrawGame, signal: AbortSignal, now = Date.now()) {
  const [endpoint, key] = SOURCES[game];
  const today = taipeiDate(now);
  const [year, month] = today.split('-').map(Number);
  const lastMonth = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
  for (const monthKey of [today.slice(0, 7), lastMonth]) {
    const url = new URL('https://api.taiwanlottery.com/TLCAPIWeB/Lottery/' + endpoint);
    url.search = new URLSearchParams({ month: monthKey, pageNum: '1', pageSize: '1' }).toString();
    const response = await fetch(url, { cache: 'no-store', credentials: 'omit', signal });
    if (!response.ok) throw new Error('Draw request failed');
    const json = await response.json();
    const rows: unknown = json?.content?.[key];
    if (!Array.isArray(rows)) throw new Error('Invalid published draw response');
    if (rows.length) return readPublishedDraw(rows[0], game, monthKey, today);
  }
  return null;
}
