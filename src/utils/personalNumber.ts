// ============================================================
// Personal Number Engine - 個人化號碼引擎
// ============================================================

import type { AnyPersonalSource, PersonalPool, PersonalNumberEntry, SourceType } from '@/types/personal';
import { loadDreamRecords } from './dreamDB';

/** 字母轉數字 A=1, B=2... */
function letterToNum(ch: string): number {
  const c = ch.toUpperCase().charCodeAt(0);
  if (c >= 65 && c <= 90) return c - 64;
  return 0;
}

/** 確保數字在 1-38 範圍 */
function clamp38(n: number): number {
  if (n < 1) return ((n - 1) % 38 + 38) % 38 + 1;
  if (n > 38) return ((n - 1) % 38) + 1;
  return n;
}

/** 拆數字成個位 */
function digitSplit(n: number): number[] {
  return String(n).split('').map(Number).filter(d => d > 0);
}

/** 生日類轉號碼 */
function parseBirthday(source: Extract<AnyPersonalSource, { type: 'birthday' }>): number[] {
  const dt = new Date(source.date);
  const m = dt.getMonth() + 1;
  const d = dt.getDate();
  const y = dt.getFullYear() % 100;
  const result: number[] = [];
  result.push(clamp38(m), clamp38(d), clamp38(y));
  result.push(clamp38(m * 10 + d));
  result.push(clamp38(m + d));
  result.push(clamp38(y + m));
  result.push(clamp38(digitSplit(m + d + y).reduce((a, b) => a + b, 0)));
  digitSplit(m).forEach(n => result.push(clamp38(n)));
  digitSplit(d).forEach(n => result.push(clamp38(n)));
  return [...new Set(result)];
}

/** 車牌類轉號碼 */
function parseLicense(source: Extract<AnyPersonalSource, { type: 'license' }>): number[] {
  const result: number[] = [];
  const chars = source.licensePlate.split('');
  const nums: number[] = [];
  chars.forEach(ch => {
    const n = parseInt(ch);
    if (!isNaN(n) && n > 0) nums.push(n);
    else { const ln = letterToNum(ch); if (ln > 0) nums.push(ln); }
  });
  result.push(...nums.map(clamp38));
  if (nums.length >= 2) {
    result.push(clamp38(nums.reduce((a, b) => a + b, 0)));
    result.push(clamp38(nums[0] * 10 + nums[1]));
  }
  return [...new Set(result)];
}

/** 手機類轉號碼 */
function parsePhone(source: Extract<AnyPersonalSource, { type: 'phone' }>): number[] {
  const digits = source.last4.split('').map(Number).filter(d => !isNaN(d));
  const result: number[] = [];
  digits.forEach(d => result.push(clamp38(d)));
  if (digits.length >= 2) {
    result.push(clamp38(digits[0] * 10 + digits[1]));
    result.push(clamp38(digits[1] * 10 + digits[2]));
  }
  result.push(clamp38(digits.reduce((a, b) => a + b, 0)));
  result.push(clamp38(digits[digits.length - 1]));
  return [...new Set(result)];
}

/** 紀念日類轉號碼 */
function parseAnniversary(source: Extract<AnyPersonalSource, { type: 'anniversary' }>): number[] {
  const dt = new Date(source.date);
  const m = dt.getMonth() + 1;
  const d = dt.getDate();
  const y = dt.getFullYear() % 100;
  const result: number[] = [];
  result.push(clamp38(m), clamp38(d), clamp38(y));
  result.push(clamp38(m * 10 + d));
  result.push(clamp38(m + d + y));
  result.push(clamp38(digitSplit(m + d).reduce((a, b) => a + b, 0)));
  return [...new Set(result)];
}

/** 自訂幸運號 */
function parseLucky(source: Extract<AnyPersonalSource, { type: 'lucky' }>): number[] {
  return [clamp38(source.number)];
}

/** 解析單個資料來源為號碼 */
export function parsePersonalSource(source: AnyPersonalSource): { numbers: number[]; reason: string } {
  switch (source.type) {
    case 'birthday':
      return { numbers: parseBirthday(source), reason: `${source.name}(${source.relation})生日轉換` };
    case 'license':
      return { numbers: parseLicense(source), reason: `車牌${source.licensePlate}轉換` };
    case 'phone':
      return { numbers: parsePhone(source), reason: `手機末四碼${source.last4}轉換` };
    case 'anniversary':
      return { numbers: parseAnniversary(source), reason: `${source.eventName}紀念日轉換` };
    case 'dream':
      return { numbers: parseDreamToNumbers(source), reason: `夢境「${source.mainSymbol}」符號轉換` };
    case 'lucky':
      return { numbers: parseLucky(source), reason: source.reason || '自訂幸運號' };
    default:
      return { numbers: [], reason: '' };
  }
}

/** 夢境轉號碼 */
function parseDreamToNumbers(source: Extract<AnyPersonalSource, { type: 'dream' }>): number[] {
  const result: number[] = [];
  const symbolNumbers = getDreamSymbolNumbers(source.mainSymbol);
  result.push(...symbolNumbers);
  const dt = new Date(source.date);
  result.push(clamp38(dt.getDate()));
  const emotionWeights: Record<string, number[]> = {
    '吉': [3, 6, 8, 9, 16, 18, 26, 28, 29, 36, 38],
    '普通': [1, 4, 7, 10, 11, 14, 19, 20, 22, 25, 31, 34],
    '不安': [2, 5, 12, 13, 15, 17, 21, 23, 24, 27, 30, 32, 33, 35, 37],
  };
  result.push(...(emotionWeights[source.emotion] || []));
  return [...new Set(result)].slice(0, 8);
}

/** 夢境符號對應號碼 */
function getDreamSymbolNumbers(symbol: string): number[] {
  const symbolMap: Record<string, number[]> = {
    '蛇': [3, 6, 9, 13, 18, 27, 36],
    '龍': [1, 5, 8, 16, 21, 28, 35],
    '鳳凰': [2, 7, 12, 19, 22, 29, 33],
    '虎': [4, 10, 14, 20, 23, 30, 34],
    '魚': [1, 6, 11, 17, 24, 26, 31],
    '水': [1, 6, 11, 16, 21, 26, 31, 36],
    '火': [2, 7, 12, 17, 22, 27, 32, 37],
    '山': [5, 10, 15, 20, 25, 30, 35],
    '路': [1, 4, 7, 10, 13, 16, 19, 22],
    '錢': [8, 18, 28, 38, 6, 16, 26],
    '花': [3, 9, 15, 21, 27, 33],
    '雨': [1, 4, 7, 11, 14, 17],
    '樹': [3, 8, 13, 18, 23, 28, 33, 38],
    '房子': [1, 5, 10, 15, 20, 25, 30],
    '飛': [7, 14, 21, 28, 35],
    '跑': [2, 5, 8, 11, 14],
    '人': [1, 2, 3, 4, 5],
    '鬼': [13, 17, 23, 29, 31],
    '光': [1, 8, 11, 18, 21, 28],
    '暗': [4, 9, 14, 19, 24, 29, 34],
  };
  return symbolMap[symbol] || [clamp38(symbol.length * 3 + 5)];
}

/** 建立個人化號碼池 */
export function buildPersonalNumberPool(sources: AnyPersonalSource[], userNumbers: number[]): PersonalPool {
  const entryMap: Record<number, PersonalNumberEntry> = {};
  const bySource: Record<string, number[]> = {};

  sources.filter(s => s.enabled).forEach(source => {
    const { numbers, reason } = parsePersonalSource(source);
    bySource[source.id] = numbers;
    const weight = source.importance || 3;

    numbers.forEach(num => {
      if (!entryMap[num]) {
        entryMap[num] = { number: num, sources: [], totalWeight: 0 };
      }
      entryMap[num].sources.push({
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        reason,
        weight,
      });
      entryMap[num].totalWeight += weight;
    });
  });

  // ===== 夢境資料流修復：讀取夢境紀錄並加入 pool =====
  try {
    const dreamRecords = loadDreamRecords();
    if (dreamRecords.length > 0) {
      const latestDream = dreamRecords[0];
      const dreamNumbers = [
        ...(latestDream.suggestedNumbers || []),
        ...(latestDream.dreamNumbers || []),
        ...(latestDream.luckyTails || []),
      ].filter(n => n >= 1 && n <= 49);
      const uniqueDreamNumbers = [...new Set(dreamNumbers)];
      if (uniqueDreamNumbers.length > 0) {
        uniqueDreamNumbers.forEach(num => {
          if (!entryMap[num]) {
            entryMap[num] = { number: num, sources: [], totalWeight: 0 };
          }
          entryMap[num].sources.push({
            sourceId: 'dream-record',
            sourceName: `夢境[${latestDream.symbols.join(',')}]`,
            sourceType: 'dream',
            reason: `情緒:${latestDream.emotion} 數字:${latestDream.dreamNumbers.join(',')}`,
            weight: 5,
          });
          entryMap[num].totalWeight += 5;
        });
      }
    }
  } catch { /* ignore */ }

  const entries = Object.values(entryMap).sort((a, b) => b.totalWeight - a.totalWeight);
  const numbers = entries.map(e => e.number);
  const overlapsWithUser = numbers.filter(n => userNumbers.includes(n));

  return { entries, numbers, bySource, overlapsWithUser };
}

/** 計算個人化權重 (0-100) */
export function calculatePersonalWeights(pool: PersonalPool): Record<number, number> {
  const weights: Record<number, number> = {};
  if (pool.entries.length === 0) {
    for (let i = 1; i <= 38; i++) weights[i] = 30;
    return weights;
  }

  const maxWeight = Math.max(...pool.entries.map(e => e.totalWeight));
  pool.entries.forEach(e => {
    weights[e.number] = Math.min(100, 30 + (e.totalWeight / maxWeight) * 70);
  });

  for (let i = 1; i <= 38; i++) {
    if (!weights[i]) weights[i] = 10;
  }
  return weights;
}

/** 取得來源類型中文名 */
export function sourceTypeName(type: SourceType): string {
  const map: Record<SourceType, string> = {
    birthday: '生日',
    license: '車牌',
    phone: '手機',
    anniversary: '紀念日',
    dream: '夢境',
    lucky: '幸運號',
  };
  return map[type];
}

/** 來源類型顏色 */
export function sourceTypeColor(type: SourceType): string {
  const map: Record<SourceType, string> = {
    birthday: 'text-pink-400 bg-pink-900/20',
    license: 'text-blue-400 bg-blue-900/20',
    phone: 'text-green-400 bg-green-900/20',
    anniversary: 'text-purple-400 bg-purple-900/20',
    dream: 'text-indigo-400 bg-indigo-900/20',
    lucky: 'text-amber-400 bg-amber-900/20',
  };
  return map[type];
}
