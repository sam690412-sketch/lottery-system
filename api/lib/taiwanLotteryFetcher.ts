// ============================================================
// V19.3.6 Taiwan Lottery Fetcher
// Fetches official draw data from Taiwan Lottery website
// Fallback to seed data on failure
// ============================================================

export interface RawDrawData {
  period: number;
  date: string;
  zone1: number[];
  zone2: number;
}

const LOTTERY_CONFIG = {
  power: {
    name: '威力彩',
    historyUrl: 'https://www.taiwanlottery.com.tw/lotto/superlotto638/history.aspx',
    zone1Count: 6,
    zone1Min: 1, zone1Max: 38,
    zone2Min: 1, zone2Max: 8,
  },
  lotto649: {
    name: '大樂透',
    historyUrl: 'https://www.taiwanlottery.com.tw/lotto/lotto649/history.aspx',
    zone1Count: 6,
    zone1Min: 1, zone1Max: 49,
    zone2Min: 0, zone2Max: 0,
  },
  daily539: {
    name: '今彩539',
    historyUrl: 'https://www.taiwanlottery.com.tw/lotto/dailycash/history.aspx',
    zone1Count: 5,
    zone1Min: 1, zone1Max: 39,
    zone2Min: 0, zone2Max: 0,
  },
} as const;

export type LotteryFetchType = keyof typeof LOTTERY_CONFIG;

/**
 * Fetch latest draw result from Taiwan Lottery public API
 * Returns null on failure (caller should use fallback)
 */
export async function fetchLatestDraw(type: LotteryFetchType): Promise<RawDrawData | null> {
  try {
    // Taiwan Lottery publishes results in result_all.js
    const res = await fetch('https://www.taiwanlottery.com.tw/result_all.js', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LotteryApp/1.0)',
      },
    });
    if (!res.ok) return null;

    const js = await res.text();
    return parseResultAllJS(js, type);
  } catch {
    return null;
  }
}

/**
 * Parse Taiwan Lottery result_all.js to extract draw data
 */
function parseResultAllJS(js: string, type: LotteryFetchType): RawDrawData | null {
  // The result_all.js contains variables like:
  // var superLotto638_latest = { period: "114000001", date: "2025/01/01", num: "01,02,03,04,05,06", sp: "01" };
  try {
    if (type === 'power') {
      const match = js.match(/superLotto638_latest\s*=\s*\{[^}]+\}/);
      if (!match) return null;
      const obj = parseJSObject(match[0]);
      const nums = String(obj.num || obj.nums || '').split(',').map(Number).filter(Boolean);
      return {
        period: parseInt(String(obj.period).replace(/\D/g, ''), 10),
        date: normalizeDate(String(obj.date || obj.drawDate || '')),
        zone1: nums.slice(0, 6),
        zone2: parseInt(String(obj.sp || obj.special || '0'), 10) || 0,
      };
    }
    if (type === 'lotto649') {
      const match = js.match(/lotto649_latest\s*=\s*\{[^}]+\}/);
      if (!match) return null;
      const obj = parseJSObject(match[0]);
      const nums = String(obj.num || obj.nums || '').split(',').map(Number).filter(Boolean);
      return {
        period: parseInt(String(obj.period).replace(/\D/g, ''), 10),
        date: normalizeDate(String(obj.date || obj.drawDate || '')),
        zone1: nums.slice(0, 6),
        zone2: 0,
      };
    }
    if (type === 'daily539') {
      const match = js.match(/daily539_latest\s*=\s*\{[^}]+\}/);
      if (!match) return null;
      const obj = parseJSObject(match[0]);
      const nums = String(obj.num || obj.nums || '').split(',').map(Number).filter(Boolean);
      return {
        period: parseInt(String(obj.period).replace(/\D/g, ''), 10),
        date: normalizeDate(String(obj.date || obj.drawDate || '')),
        zone1: nums.slice(0, 5),
        zone2: 0,
      };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Parse a simple JavaScript object string to a JS object
 * e.g. '{ period: "114000001", date: "2025/01/01" }'
 */
function parseJSObject(str: string): Record<string, unknown> {
  // Extract the object body after '='
  const eqIdx = str.indexOf('=');
  const body = eqIdx >= 0 ? str.substring(eqIdx + 1).trim() : str;
  // Use Function constructor for safe parsing
  const fn = new Function(`return ${body}`);
  return fn() as Record<string, unknown>;
}

/**
 * Normalize Taiwan date format to YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  // Handle formats: "2025/01/01", "114/01/01" (roc year), "2025-01-01"
  let s = dateStr.trim().replace(/-/g, '/');

  // Convert ROC year (Minguo) to Gregorian
  if (/^\d{2,3}\//.test(s)) {
    const parts = s.split('/');
    const rocYear = parseInt(parts[0], 10);
    if (rocYear < 200) { // Likely ROC year
      parts[0] = String(rocYear + 1911);
      s = parts.join('/');
    }
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split('T')[0];
}

/**
 * Validate a draw record
 * Returns array of error messages (empty = valid)
 */
export function validateDrawRecord(
  type: LotteryFetchType,
  draw: RawDrawData,
): string[] {
  const cfg = LOTTERY_CONFIG[type];
  const errors: string[] = [];

  // 1. Period check
  if (!draw.period || draw.period <= 0) {
    errors.push('invalid_period');
  }

  // 2. Date check
  if (!draw.date || !/^\d{4}-\d{2}-\d{2}$/.test(draw.date)) {
    errors.push('invalid_date');
  }

  // 3. Zone1 count
  if (draw.zone1.length !== cfg.zone1Count) {
    errors.push(`wrong_count: expected ${cfg.zone1Count}, got ${draw.zone1.length}`);
  }

  // 4. Zone1 range
  const outOfRange = draw.zone1.filter(n => n < cfg.zone1Min || n > cfg.zone1Max);
  if (outOfRange.length > 0) {
    errors.push(`out_of_range: ${outOfRange.join(',')} outside ${cfg.zone1Min}-${cfg.zone1Max}`);
  }

  // 5. Duplicates in zone1
  if (new Set(draw.zone1).size !== draw.zone1.length) {
    errors.push('duplicate_numbers');
  }

  // 6. Special number range
  if (cfg.zone2Max > 0 && (draw.zone2 < cfg.zone2Min || draw.zone2 > cfg.zone2Max)) {
    errors.push(`invalid_special: ${draw.zone2} outside ${cfg.zone2Min}-${cfg.zone2Max}`);
  }

  // 7. Missing field
  if (!draw.period || !draw.date || draw.zone1.length === 0) {
    errors.push('missing_field');
  }

  return errors;
}

/**
 * Load seed data from local JSON as fallback
 */
export async function loadSeedData(type: LotteryFetchType): Promise<RawDrawData[]> {
  try {
    const seedModule = await import('../../src/data/historicalDraws.json');
    const seed = seedModule.default || seedModule;
    const key = type === 'power' ? 'power' : type === 'lotto649' ? 'lotto649' : 'daily539';
    const arr = seed[key] || [];
    return arr.map((d: any) => ({
      period: d.period,
      date: d.date,
      zone1: d.zone1,
      zone2: d.zone2 || 0,
    }));
  } catch {
    return [];
  }
}
