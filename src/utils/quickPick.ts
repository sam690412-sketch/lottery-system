import { getAllNumbers, getConfig, PLAY_TYPE_CONFIG } from '@/utils/lotteryConfig';
import type { CombinePlayType, LotteryType } from '@/utils/lotteryConfig';
import { USER_KEYS, userGetJson, userSetJson } from '@/utils/userStorage';

export interface SavedNumbers {
  id: string;
  name: string;
  numbers: number[];
  type: LotteryType;
  note: string;
  secondZone?: number;
}

export interface QuickPick {
  numbers: number[];
  secondZone?: number;
}

export interface QuickPickConditions {
  preferred: number[];
  excluded: number[];
}

export function drawQuickPick(type: LotteryType, play: CombinePlayType, conditions?: QuickPickConditions): QuickPick {
  const config = getConfig(type);
  if (config.category === 'digit') {
    return { numbers: Array.from({ length: config.mainCount }, () => Math.floor(Math.random() * 10)) };
  }
  const count = config.category === 'combine' ? PLAY_TYPE_CONFIG[play].k : config.mainCount;
  const excluded = new Set(conditions?.excluded);
  const eligible = getAllNumbers(type).filter(number => !excluded.has(number));
  const eligibleSet = new Set(eligible);
  const preferred = [...new Set(conditions?.preferred)].filter(number => eligibleSet.has(number)).slice(0, count);
  const pool = eligible.filter(number => !preferred.includes(number));
  const additional = Array.from({ length: Math.min(count - preferred.length, pool.length) },
    () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  const numbers = [...preferred, ...additional].sort((a, b) => a - b);
  if (config.specialMode !== 'separate') return { numbers };
  return { numbers, secondZone: 1 + Math.floor(Math.random() * config.specialMax) };
}

export function quickPickKey(pick: QuickPick) {
  return pick.numbers.join(',') + '|' + (pick.secondZone ?? '');
}

export function saveQuickPick(type: LotteryType, pick: QuickPick, name = getConfig(type).name + ' · 快速選號'): 'saved' | 'duplicate' | 'failed' {
  const items = userGetJson<SavedNumbers[]>(USER_KEYS.KEEP_SETS, []);
  const itemKey = quickPickKey(pick);
  if (items.some(item => item.type === type && quickPickKey(item) === itemKey)) return 'duplicate';
  const item: SavedNumbers = {
    id: Date.now().toString() + '-' + Math.random().toString(36).slice(2),
    type,
    ...pick,
    name,
    note: '',
  };
  userSetJson(USER_KEYS.KEEP_SETS, [item, ...items]);
  return userGetJson<SavedNumbers[]>(USER_KEYS.KEEP_SETS, []).some(entry => entry.id === item.id)
    ? 'saved' : 'failed';
}

export function analysisLink(type: LotteryType, numbers: number[], note?: string, date?: string) {
  const config = getConfig(type);
  if (config.category === 'digit') return '/analysis/' + type;
  if (config.category === 'combine') return '/combine-analysis/' + (type === 'lotto49c' ? '49' : '39');
  const params = new URLSearchParams({ game: type, numbers: numbers.join(',') });
  if (note) params.set('note', note);
  if (date) params.set('date', date);
  return '/selection-analysis?' + params.toString();
}
