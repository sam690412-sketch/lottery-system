import { loadMetaDataRaw, saveMetaDataRaw, removeMetaDataRaw } from '@/repositories/businessDataStorage';

// ============================================================
// V14.0 命理學派系統 - 7大學派 + 權重設定
// ============================================================

export type MetaSchoolId = 'bazi' | 'meihua' | 'qimen' | 'ziwei' | 'heluo' | 'kyusei' | 'numerology';

export interface MetaSchool {
  id: MetaSchoolId;
  name: string;
  origin: string;
  description: string;
  defaultWeight: number;
}

export const META_SCHOOLS: MetaSchool[] = [
  { id: 'bazi', name: '八字五行', origin: '中國傳統命理', description: '依生辰八字推算五行強弱與用神', defaultWeight: 20 },
  { id: 'meihua', name: '梅花易數', origin: '北宋邵雍', description: '以象數理推萬物變化，靈活取數', defaultWeight: 15 },
  { id: 'qimen', name: '奇門遁甲', origin: '中國古代術數', description: '天盤九星地盤八門，擇吉避凶', defaultWeight: 10 },
  { id: 'ziwei', name: '紫微斗數', origin: '中國傳統星命', description: '依星曜組合推命盤吉凶方位', defaultWeight: 15 },
  { id: 'heluo', name: '河洛理數', origin: '伏羲河圖洛書', description: '先天後天八卦配數，五行生成數', defaultWeight: 15 },
  { id: 'kyusei', name: '九星氣學', origin: '日本九星術', description: '依本命星與年運星推氣運走向', defaultWeight: 10 },
  { id: 'numerology', name: '生日靈數', origin: '畢達哥拉斯數秘術', description: '將生日數字化，推生命靈數與幸運數', defaultWeight: 15 },
];

export interface MetaAnalysisResult {
  school: MetaSchoolId;
  schoolName: string;
  basis: string;
  recommendedNumbers: number[];
  weights: Record<number, number>;
  userWeight: number;
}

const SCHOOL_WEIGHT_KEY = 'lottery-meta-school-weights';

/** 取得使用者設定的學派權重 */
export function getSchoolWeights(): Record<MetaSchoolId, number> {
  try {
    const raw = loadMetaDataRaw(SCHOOL_WEIGHT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const defaults: Record<string, number> = {};
  META_SCHOOLS.forEach(s => { defaults[s.id] = s.defaultWeight; });
  return defaults as Record<MetaSchoolId, number>;
}

/** 儲存學派權重 */
export function saveSchoolWeights(weights: Record<MetaSchoolId, number>): void {
  saveMetaDataRaw(SCHOOL_WEIGHT_KEY, weights);
}

/** 驗證總權重 = 100 */
export function validateWeights(weights: Record<MetaSchoolId, number>): boolean {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(total - 100) < 1;
}

/** 正規化權重至總和100 */
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return weights;
  const result: Record<string, number> = {};
  Object.entries(weights).forEach(([k, v]) => { result[k] = Math.round((v / total) * 100); });
  return result;
}

// 八字五行
function analyzeBazi(year: number, month: number, day: number, hour: number): Omit<MetaAnalysisResult, 'school'|'schoolName'|'userWeight'> {
  const gz = getGanZhi(year, month, day);
  const elements = gz.ganElement + gz.zhiElement;
  const wuxingCount: Record<string, number> = {};
  for (const c of elements) { wuxingCount[c] = (wuxingCount[c] || 0) + 1; }
  const dominant = Object.entries(wuxingCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '土';
  const elementNums: Record<string, number[]> = {
    '金': [2,7,12,17,22,27,32,37], '木': [4,9,14,19,24,29,34],
    '水': [1,6,11,16,21,26,31,36], '火': [3,8,13,18,23,28,33,38], '土': [5,10,15,20,25,30,35],
  };
  const nums = elementNums[dominant] || elementNums['土'];
  const weights: Record<number, number> = {};
  nums.forEach(n => { weights[n] = 25; });
  const basis = `八字五行：${year}年${month}月${day}日${hour}時，天干地支五行「${elements}」，以「${dominant}」為用神`;
  return { basis, recommendedNumbers: nums.slice(0, 6), weights };
}

// 梅花易數
function analyzeMeihua(year: number, month: number, day: number): Omit<MetaAnalysisResult, 'school'|'schoolName'|'userWeight'> {
  const upper = ((year + month + day) % 8) || 8;
  const lower = ((year * month + day) % 8) || 8;
  const change = ((year + month + day) % 6) || 6;
  const hexNums = [upper * 3 + 1, lower * 3 + 2, change * 5 + 3, upper + lower, upper * 2 + change, lower * 2 + change].map(n => ((n - 1) % 38) + 1);
  const weights: Record<number, number> = {};
  hexNums.forEach(n => { weights[n] = 22; });
  return {
    basis: `梅花易數：上卦${upper}、下卦${lower}、變爻${change}，以動爻變化取數`,
    recommendedNumbers: [...new Set(hexNums)].slice(0, 6), weights,
  };
}

// 奇門遁甲
function analyzeQimen(year: number, month: number, day: number, hour: number): Omit<MetaAnalysisResult, 'school'|'schoolName'|'userWeight'> {
  const ju = ((year + month + day) % 9) || 9;
  const star = ((hour + day) % 9) || 9;
  const door = ((month + hour) % 8) || 8;
  const nums = [ju * 3 + 1, star * 3 + 2, door * 4 + 3, ju + star, star + door, ju + door].map(n => ((n - 1) % 38) + 1);
  const weights: Record<number, number> = {};
  nums.forEach(n => { weights[n] = 20; });
  return {
    basis: `奇門遁甲：${ju}局、天${star}星、${['休','生','傷','杜','景','死','驚','開'][door-1]}門`,
    recommendedNumbers: [...new Set(nums)].slice(0, 6), weights,
  };
}

// 紫微斗數
function analyzeZiwei(year: number, month: number, day: number, gender: string): Omit<MetaAnalysisResult, 'school'|'schoolName'|'userWeight'> {
  const ming = ((year % 12 + month + day) % 12) + 1;
  const shen = ((year + month * 2 + day) % 12) + 1;
  const starNums = [ming * 2 + 1, shen * 2 + 3, (ming + shen) * 2, year % 38 + 1, month * 3 + 1].map(n => ((n - 1) % 38) + 1);
  const weights: Record<number, number> = {};
  starNums.forEach(n => { weights[n] = 22; });
  return {
    basis: `紫微斗數：命宮在${ming}、身宮在${shen}，${gender}命，依主星亮度取數`,
    recommendedNumbers: [...new Set(starNums)].slice(0, 6), weights,
  };
}

// 河洛理數
function analyzeHeluo(year: number, month: number, day: number): Omit<MetaAnalysisResult, 'school'|'schoolName'|'userWeight'> {
  const xiantian = (year % 9) || 9;
  const houtian = ((month + day) % 9) || 9;
  const heluoNums = [xiantian * 3 + 5, houtian * 3 + 2, (xiantian + houtian) * 2 + 1, xiantian * 4, houtian * 4, (xiantian * houtian) % 38 + 1].map(n => ((n - 1) % 38) + 1);
  const weights: Record<number, number> = {};
  heluoNums.forEach(n => { weights[n] = 20; });
  return {
    basis: `河洛理數：先天卦${xiantian}、後天卦${houtian}，河圖洛書配數`,
    recommendedNumbers: [...new Set(heluoNums)].slice(0, 6), weights,
  };
}

// 九星氣學
function analyzeKyusei(year: number, month: number, _day: number): Omit<MetaAnalysisResult, 'school'|'schoolName'|'userWeight'> {
  const honmei = ((year % 9) || 9);
  const nenun = (((new Date().getFullYear() - year) + honmei) % 9) || 9;
  const getsuyou = ((month + honmei) % 9) || 9;
  const kyuNums = [honmei * 3 + 5, nenun * 3 + 2, getsuyou * 4 + 1, (honmei + nenun) * 2, (nenun + getsuyou) * 2].map(n => ((n - 1) % 38) + 1);
  const weights: Record<number, number> = {};
  kyuNums.forEach(n => { weights[n] = 18; });
  return {
    basis: `九星氣學：本命星${honmei}、年運星${nenun}、月照星${getsuyou}，依氣運走向取數`,
    recommendedNumbers: [...new Set(kyuNums)].slice(0, 6), weights,
  };
}

// 生日靈數
function analyzeNumerology(year: number, month: number, day: number): Omit<MetaAnalysisResult, 'school'|'schoolName'|'userWeight'> {
  const sumDigits = (n: number) => n.toString().split('').reduce((a, c) => a + parseInt(c), 0);
  const lifePath = sumDigits(sumDigits(sumDigits(year) + sumDigits(month) + sumDigits(day)));
  const destiny = sumDigits(sumDigits(month) + sumDigits(day));
  const soul = sumDigits(sumDigits(year));
  const numNums = [lifePath, destiny, soul, lifePath + destiny, lifePath * 2, destiny * 2, (lifePath + destiny + soul) % 38 + 1].filter(n => n > 0 && n <= 38);
  const weights: Record<number, number> = {};
  numNums.forEach(n => { weights[n] = 24; });
  return {
    basis: `生日靈數：生命靈數${lifePath}、命運數${destiny}、靈魂數${soul}，畢達哥拉斯數秘術`,
    recommendedNumbers: [...new Set(numNums)].slice(0, 6), weights,
  };
}

// 天干地支
function getGanZhi(year: number, _month: number, _day: number) {
  const gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const gzIdx = (year - 4) % 60;
  const gIdx = gzIdx % 10;
  const zIdx = gzIdx % 12;
  const ganElement = ['木','木','火','火','土','土','金','金','水','水'];
  const zhiElement = ['水','土','木','木','土','火','火','土','金','金','土','水'];
  return { gan: gan[gIdx], zhi: zhi[zIdx], ganElement: ganElement[gIdx], zhiElement: zhiElement[zIdx] };
}

/** 分析命理 - 指定學派 */
export function analyzeMetaBySchool(
  year: number, month: number, day: number, hour: number, gender: string, schoolId: MetaSchoolId, userWeight: number
): MetaAnalysisResult {
  const school = META_SCHOOLS.find(s => s.id === schoolId)!;
  let result: Omit<MetaAnalysisResult, 'school'|'schoolName'|'userWeight'>;
  if (schoolId === 'bazi') result = analyzeBazi(year, month, day, hour);
  else if (schoolId === 'meihua') result = analyzeMeihua(year, month, day);
  else if (schoolId === 'qimen') result = analyzeQimen(year, month, day, hour);
  else if (schoolId === 'ziwei') result = analyzeZiwei(year, month, day, gender);
  else if (schoolId === 'heluo') result = analyzeHeluo(year, month, day);
  else if (schoolId === 'kyusei') result = analyzeKyusei(year, month, day);
  else result = analyzeNumerology(year, month, day);
  return { school: schoolId, schoolName: school.name, ...result, userWeight };
}

/** 分析命理 - 全部啟用學派（依使用者權重） */
export function analyzeMetaAllSchools(
  year: number, month: number, day: number, hour: number, gender: string,
  enabledSchools: MetaSchoolId[]
): MetaAnalysisResult[] {
  const userWeights = getSchoolWeights();
  return enabledSchools.map(id => analyzeMetaBySchool(year, month, day, hour, gender, id, userWeights[id] || 10));
}

/** 取得命理權重（綜合所有啟用學派，依使用者權重加權） */
export function getMetaphysicsWeights(
  year: number, month: number, day: number, hour: number, gender: string,
  enabledSchools: MetaSchoolId[]
): Record<number, number> {
  const results = analyzeMetaAllSchools(year, month, day, hour, gender, enabledSchools);
  const combined: Record<number, number> = {};
  results.forEach(r => {
    const w = r.userWeight / 100;
    Object.entries(r.weights).forEach(([n, weight]) => {
      combined[Number(n)] = (combined[Number(n)] || 0) + weight * w;
    });
  });
  return combined;
}

// ===== 今日命理權重（供首頁產號使用） =====
const DAILY_META_WEIGHTS_KEY = 'lottery-daily-meta-weights';

/** 保存今日命理權重 */
export function saveDailyMetaWeights(weights: Record<number, number>): void {
  saveMetaDataRaw(DAILY_META_WEIGHTS_KEY, weights);
}

/** 讀取今日命理權重 */
export function loadDailyMetaWeights(): Record<number, number> | null {
  try {
    const raw = loadMetaDataRaw(DAILY_META_WEIGHTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** 清除今日命理權重 */
export function clearDailyMetaWeights(): void {
  removeMetaDataRaw(DAILY_META_WEIGHTS_KEY);
}

// ===== V14.1: 命理快捷模式 =====
export interface MetaQuickMode {
  id: string;
  name: string;
  description: string;
  weights: Record<MetaSchoolId, number>;
  enabled: MetaSchoolId[];
}

export const META_QUICK_MODES: MetaQuickMode[] = [
  {
    id: 'fortune',
    name: '財運型',
    description: '注重八字與紫微，穩定求財',
    weights: { bazi: 30, ziwei: 30, qimen: 20, numerology: 20, meihua: 0, heluo: 0, kyusei: 0 },
    enabled: ['bazi', 'ziwei', 'qimen', 'numerology'],
  },
  {
    id: 'windfall',
    name: '偏財型',
    description: '強化奇門與梅花，追求高回報',
    weights: { qimen: 30, meihua: 25, bazi: 20, numerology: 25, ziwei: 0, heluo: 0, kyusei: 0 },
    enabled: ['qimen', 'meihua', 'bazi', 'numerology'],
  },
  {
    id: 'stable',
    name: '穩健型',
    description: '均衡配置，穩中求勝',
    weights: { bazi: 25, ziwei: 20, heluo: 20, numerology: 20, meihua: 10, qimen: 5, kyusei: 0 },
    enabled: ['bazi', 'ziwei', 'heluo', 'numerology', 'meihua', 'qimen'],
  },
  {
    id: 'raise',
    name: '養號型',
    description: '強化河洛與八字，配合養號策略',
    weights: { heluo: 30, bazi: 25, ziwei: 20, numerology: 15, meihua: 10, qimen: 0, kyusei: 0 },
    enabled: ['heluo', 'bazi', 'ziwei', 'numerology', 'meihua'],
  },
  {
    id: 'burst',
    name: '爆發型',
    description: '奇門+梅花+靈數，高波動高回報',
    weights: { qimen: 35, meihua: 25, numerology: 20, bazi: 20, ziwei: 0, heluo: 0, kyusei: 0 },
    enabled: ['qimen', 'meihua', 'numerology', 'bazi'],
  },
];

/** 套用快捷模式 */
export function applyQuickMode(modeId: string): void {
  const mode = META_QUICK_MODES.find(m => m.id === modeId);
  if (!mode) return;
  saveSchoolWeights(mode.weights);
  saveMetaDataRaw('enabled-meta-schools', mode.enabled);
}
