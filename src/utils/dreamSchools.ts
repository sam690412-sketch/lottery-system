// ============================================================
// V14.0 夢境學派系統 - 6大學派
// ============================================================

import { loadDreamDataRaw, saveDreamDataRaw, removeDreamDataRaw } from '@/repositories/businessDataStorage';

export type DreamSchoolId = 'zhougong' | 'jung' | 'freud' | 'symbol' | 'wuxing' | 'ai';

export interface DreamSchool {
  id: DreamSchoolId;
  name: string;
  origin: string;
  description: string;
}

export const DREAM_SCHOOLS: DreamSchool[] = [
  { id: 'zhougong', name: '周公解夢', origin: '中國古代', description: '依傳統象徵對照解夢，強調吉兇預兆' },
  { id: 'jung', name: '榮格分析', origin: '瑞士心理學', description: '集體潛意識與原型象徵分析' },
  { id: 'freud', name: '佛洛伊德', origin: '奧地利精神分析', description: '潛意識欲望與壓抑的象徵轉化' },
  { id: 'symbol', name: '象徵學', origin: '跨文化符號學', description: '跨文化符號比對與數字映射' },
  { id: 'wuxing', name: '東方五行夢境', origin: '東方易學', description: '五行生剋與夢境元素對應' },
  { id: 'ai', name: 'AI綜合', origin: '人工智慧', description: '多學派綜合加權，智能推薦' },
];

export interface DreamAnalysisResult {
  school: DreamSchoolId;
  schoolName: string;
  basis: string;
  luckyTails: number[];
  recommendedNumbers: number[];
  weights: Record<number, number>;
}

// 關鍵詞映射表
const SYMBOL_MAP: Record<string, { element: string; nums: number[]; tail: number[] }> = {
  '水': { element: '水', nums: [1,6,11,16,21,26,31,36], tail: [1,6] },
  '魚': { element: '水', nums: [2,7,12,17,22,27,32,37], tail: [2,7] },
  '蛇': { element: '火', nums: [3,8,13,18,23,28,33,38], tail: [3,8] },
  '龍': { element: '土', nums: [5,10,15,20,25,30,35], tail: [0,5] },
  '鳥': { element: '木', nums: [4,9,14,19,24,29,34], tail: [4,9] },
  '火': { element: '火', nums: [3,8,13,18,23,28,33,38], tail: [3,8] },
  '山': { element: '土', nums: [5,10,15,20,25,30,35], tail: [0,5] },
  '樹': { element: '木', nums: [4,9,14,19,24,29,34], tail: [4,9] },
  '金': { element: '金', nums: [2,7,12,17,22,27,32,37], tail: [2,7] },
  '雨': { element: '水', nums: [1,6,11,16,21,26,31,36], tail: [1,6] },
  '路': { element: '土', nums: [5,10,15,20,25,30,35], tail: [0,5] },
  '天': { element: '金', nums: [9,19,29,38], tail: [9] },
  '地': { element: '土', nums: [5,10,15,20,25,30,35], tail: [0,5] },
  '花': { element: '木', nums: [4,9,14,19,24,29,34], tail: [4,9] },
  '雲': { element: '水', nums: [1,6,11,16,21,26,31,36], tail: [1,6] },
  '風': { element: '木', nums: [4,9,14,19,24,29,34], tail: [4,9] },
  '雪': { element: '水', nums: [1,6,11,16,21,26,31,36], tail: [1,6] },
  '月': { element: '水', nums: [1,6,11,16,21,26,31,36], tail: [1,6] },
  '日': { element: '火', nums: [3,8,13,18,23,28,33,38], tail: [3,8] },
  '星': { element: '金', nums: [2,7,12,17,22,27,32,37], tail: [2,7] },
  '海': { element: '水', nums: [1,6,11,16,21,26,31,36], tail: [1,6] },
  '橋': { element: '土', nums: [5,10,15,20,25,30,35], tail: [0,5] },
  '門': { element: '木', nums: [4,9,14,19,24,29,34], tail: [4,9] },
  '車': { element: '金', nums: [2,7,12,17,22,27,32,37], tail: [2,7] },
  '飛': { element: '火', nums: [3,8,13,18,23,28,33,38], tail: [3,8] },
  '跑': { element: '木', nums: [4,9,14,19,24,29,34], tail: [4,9] },
  '掉': { element: '水', nums: [1,6,11,16,21,26,31,36], tail: [1,6] },
  '追': { element: '火', nums: [3,8,13,18,23,28,33,38], tail: [3,8] },
  '死': { element: '水', nums: [1,6,11,16,21,26,31,36], tail: [1,6] },
  '生': { element: '木', nums: [4,9,14,19,24,29,34], tail: [4,9] },
  '錢': { element: '金', nums: [2,7,12,17,22,27,32,37], tail: [2,7] },
  '人': { element: '土', nums: [5,10,15,20,25,30,35], tail: [0,5] },
  '家': { element: '土', nums: [5,10,15,20,25,30,35], tail: [0,5] },
  '黑': { element: '水', nums: [1,6,11,16,21,26,31,36], tail: [1,6] },
  '白': { element: '金', nums: [2,7,12,17,22,27,32,37], tail: [2,7] },
  '紅': { element: '火', nums: [3,8,13,18,23,28,33,38], tail: [3,8] },
  '綠': { element: '木', nums: [4,9,14,19,24,29,34], tail: [4,9] },
  '黃': { element: '土', nums: [5,10,15,20,25,30,35], tail: [0,5] },
};

function extractKeywords(content: string): string[] {
  const keys = Object.keys(SYMBOL_MAP);
  return keys.filter(k => content.includes(k));
}

function schoolZhougong(content: string, emotion: string): Omit<DreamAnalysisResult, 'school'|'schoolName'> {
  const keywords = extractKeywords(content);
  const allNums: number[] = [];
  const allTails: number[] = [];
  keywords.forEach(k => { allNums.push(...SYMBOL_MAP[k].nums); allTails.push(...SYMBOL_MAP[k].tail); });
  const basis = keywords.length > 0 ? `周公解夢：夢見「${keywords.join('、')}」為${emotion === '吉' ? '吉兆' : emotion === '不安' ? '警示' : '平象'}，對應五行數字` : '無明確對應，使用通用推薦';
  const weights: Record<number, number> = {};
  [...new Set(allNums)].forEach(n => { weights[n] = (weights[n] || 0) + 20; });
  return { basis, luckyTails: [...new Set(allTails)], recommendedNumbers: [...new Set(allNums)].slice(0, 8), weights };
}

function schoolJung(content: string, _emotion: string): Omit<DreamAnalysisResult, 'school'|'schoolName'> {
  const archetypes: Record<string, { name: string; nums: number[]; tail: number[] }> = {
    '水': { name: '潛意識之海', nums: [1,6,11,16,21,26], tail: [1,6] },
    '蛇': { name: '陰影原型', nums: [3,8,13,18,23,28], tail: [3,8] },
    '龍': { name: '自性原型', nums: [5,10,15,20,25,30], tail: [0,5] },
    '鳥': { name: '超越原型', nums: [4,9,14,19,24,29], tail: [4,9] },
    '路': { name: '個體化歷程', nums: [2,7,12,17,22,27], tail: [2,7] },
    '追': { name: '追逐陰影', nums: [3,8,13,18,23,28], tail: [3,8] },
    '掉': { name: '墜落焦慮', nums: [1,6,11,16,21,26], tail: [1,6] },
    '飛': { name: '超越象徵', nums: [4,9,14,19,24,29], tail: [4,9] },
  };
  const keywords = Object.keys(archetypes).filter(k => content.includes(k));
  const allNums: number[] = [];
  const allTails: number[] = [];
  const matched = keywords.map(k => archetypes[k].name);
  keywords.forEach(k => { allNums.push(...archetypes[k].nums); allTails.push(...archetypes[k].tail); });
  const basis = matched.length > 0 ? `榮格分析：觸發原型「${matched.join('、')}」，反映${_emotion === '吉' ? '心理整合' : '內在衝突'}` : '無明確原型對應，使用通用推薦';
  const weights: Record<number, number> = {};
  [...new Set(allNums)].forEach(n => { weights[n] = (weights[n] || 0) + 18; });
  return { basis, luckyTails: [...new Set(allTails)], recommendedNumbers: [...new Set(allNums)].slice(0, 8), weights };
}

function schoolFreud(content: string, _emotion: string): Omit<DreamAnalysisResult, 'school'|'schoolName'> {
  const desireMap: Record<string, { desire: string; nums: number[]; tail: number[] }> = {
    '水': { desire: '情感流動', nums: [1,6,11,16,21,26], tail: [1,6] },
    '蛇': { desire: '性壓抑轉化', nums: [3,8,13,18,23,28], tail: [3,8] },
    '錢': { desire: '物質焦慮', nums: [2,7,12,17,22,27], tail: [2,7] },
    '追': { desire: '逃避機制', nums: [3,8,13,18,23,28], tail: [3,8] },
    '掉': { desire: '失控恐懼', nums: [1,6,11,16,21,26], tail: [1,6] },
    '飛': { desire: '升華欲望', nums: [4,9,14,19,24,29], tail: [4,9] },
    '門': { desire: '探索潛意識', nums: [5,10,15,20,25,30], tail: [0,5] },
    '路': { desire: '人生選擇', nums: [2,7,12,17,22,27], tail: [2,7] },
  };
  const keywords = Object.keys(desireMap).filter(k => content.includes(k));
  const allNums: number[] = [];
  const allTails: number[] = [];
  const matched = keywords.map(k => desireMap[k].desire);
  keywords.forEach(k => { allNums.push(...desireMap[k].nums); allTails.push(...desireMap[k].tail); });
  const basis = matched.length > 0 ? `佛洛伊德：夢見「${keywords.join('、')}」反映${matched.join('、')}的潛意識投射` : '無明確欲望映射，使用通用推薦';
  const weights: Record<number, number> = {};
  [...new Set(allNums)].forEach(n => { weights[n] = (weights[n] || 0) + 16; });
  return { basis, luckyTails: [...new Set(allTails)], recommendedNumbers: [...new Set(allNums)].slice(0, 8), weights };
}

function schoolSymbol(content: string, _emotion: string): Omit<DreamAnalysisResult, 'school'|'schoolName'> {
  const keywords = extractKeywords(content);
  const crossCultural: Record<string, number[]> = {
    '水': [1,6,11,16,21,26,31,36], '火': [3,8,13,18,23,28,33,38],
    '木': [4,9,14,19,24,29,34], '金': [2,7,12,17,22,27,32,37],
    '土': [5,10,15,20,25,30,35], '魚': [2,7,12,17,22,27],
    '蛇': [3,8,13,18,23,28], '龍': [5,10,15,20,25,30],
    '鳥': [4,9,14,19,24,29], '花': [4,9,14,19,24,29],
    '路': [2,7,12,17,22,27], '門': [4,9,14,19,24,29],
  };
  const allNums: number[] = [];
  const matched: string[] = [];
  keywords.forEach(k => {
    if (crossCultural[k]) { allNums.push(...crossCultural[k]); matched.push(k); }
  });
  const basis = matched.length > 0 ? `象徵學：「${matched.join('、')}」在跨文化符號系統中對應數字群` : '無跨文化符號對應，使用通用推薦';
  const weights: Record<number, number> = {};
  [...new Set(allNums)].forEach(n => { weights[n] = (weights[n] || 0) + 15; });
  return { basis, luckyTails: [1,3,5,7,9], recommendedNumbers: [...new Set(allNums)].slice(0, 8), weights };
}

function schoolWuxing(content: string, emotion: string): Omit<DreamAnalysisResult, 'school'|'schoolName'> {
  const wuxingMap: Record<string, { element: string; nums: number[]; tail: number[] }> = {
    '水': { element: '水', nums: [1,6,11,16,21,26,31,36], tail: [1,6] },
    '火': { element: '火', nums: [3,8,13,18,23,28,33,38], tail: [3,8] },
    '木': { element: '木', nums: [4,9,14,19,24,29,34], tail: [4,9] },
    '金': { element: '金', nums: [2,7,12,17,22,27,32,37], tail: [2,7] },
    '土': { element: '土', nums: [5,10,15,20,25,30,35], tail: [0,5] },
    '魚': { element: '水', nums: [1,6,11,16,21,26], tail: [1,6] },
    '蛇': { element: '火', nums: [3,8,13,18,23,28], tail: [3,8] },
    '樹': { element: '木', nums: [4,9,14,19,24,29], tail: [4,9] },
    '花': { element: '木', nums: [4,9,14,19,24,29], tail: [4,9] },
    '龍': { element: '土', nums: [5,10,15,20,25,30], tail: [0,5] },
    '雨': { element: '水', nums: [1,6,11,16,21,26], tail: [1,6] },
  };
  const keywords = Object.keys(wuxingMap).filter(k => content.includes(k));
  const allNums: number[] = [];
  const allTails: number[] = [];
  const elements = keywords.map(k => wuxingMap[k].element);
  keywords.forEach(k => { allNums.push(...wuxingMap[k].nums); allTails.push(...wuxingMap[k].tail); });
  const basis = elements.length > 0 ? `東方五行夢境：夢中元素屬「${[...new Set(elements)].join('、')}」，依五行生剋推薦對應數字，整體為${emotion === '吉' ? '吉象' : emotion === '不安' ? '需化解' : '平象'}` : '無五行元素對應，使用通用推薦';
  const weights: Record<number, number> = {};
  [...new Set(allNums)].forEach(n => { weights[n] = (weights[n] || 0) + 22; });
  return { basis, luckyTails: [...new Set(allTails)], recommendedNumbers: [...new Set(allNums)].slice(0, 8), weights };
}

function schoolAI(results: Omit<DreamAnalysisResult, 'school'|'schoolName'>[]): Omit<DreamAnalysisResult, 'school'|'schoolName'> {
  const combinedWeights: Record<number, number> = {};
  const allTails: number[] = [];
  const allNums: number[] = [];
  results.forEach(r => {
    Object.entries(r.weights).forEach(([n, w]) => {
      combinedWeights[Number(n)] = (combinedWeights[Number(n)] || 0) + w * 0.2;
    });
    allTails.push(...r.luckyTails);
    allNums.push(...r.recommendedNumbers);
  });
  const sorted = Object.entries(combinedWeights).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const aiWeights: Record<number, number> = {};
  sorted.forEach(([n, w]) => { aiWeights[Number(n)] = Math.round(w * 1.5); });
  return {
    basis: `AI綜合：融合5大學派分析結果，智能加權推薦${sorted.length}個高置信號碼`,
    luckyTails: [...new Set(allTails)],
    recommendedNumbers: sorted.map(([n]) => Number(n)),
    weights: aiWeights,
  };
}

/** 分析夢境 - 指定學派 */
export function analyzeDreamBySchool(content: string, emotion: string, schoolId: DreamSchoolId): DreamAnalysisResult {
  const school = DREAM_SCHOOLS.find(s => s.id === schoolId)!;
  let result: Omit<DreamAnalysisResult, 'school'|'schoolName'>;
  if (schoolId === 'ai') {
    const allResults = DREAM_SCHOOLS.filter(s => s.id !== 'ai').map(s => analyzeDreamBySchool(content, emotion, s.id));
    result = schoolAI(allResults);
  } else if (schoolId === 'zhougong') result = schoolZhougong(content, emotion);
  else if (schoolId === 'jung') result = schoolJung(content, emotion);
  else if (schoolId === 'freud') result = schoolFreud(content, emotion);
  else if (schoolId === 'symbol') result = schoolSymbol(content, emotion);
  else result = schoolWuxing(content, emotion);
  return { school: schoolId, schoolName: school.name, ...result };
}

// V18.2.9 P0-3: 學派勾選功能
const SELECTED_SCHOOLS_KEY = 'lottery-dream-selected-schools';

/** 預設勾選學派：周公解夢、象徵學、東方五行夢境、AI綜合 */
const DEFAULT_SELECTED_SCHOOLS: DreamSchoolId[] = ['zhougong', 'symbol', 'wuxing', 'ai'];

/** 讀取已勾選的學派 */
export function loadSelectedDreamSchools(): DreamSchoolId[] {
  try {
    const raw = loadDreamDataRaw(SELECTED_SCHOOLS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_SELECTED_SCHOOLS;
}

/** 儲存已勾選的學派 */
export function saveSelectedDreamSchools(schools: DreamSchoolId[]): void {
  try { saveDreamDataRaw(SELECTED_SCHOOLS_KEY, schools); } catch { /* ignore */ }
}

/** 分析夢境 - 只分析已勾選學派 */
export function analyzeDreamAllSchools(content: string, emotion: string): DreamAnalysisResult[] {
  const selected = loadSelectedDreamSchools();
  const nonAiSelected = selected.filter(id => id !== 'ai');
  // 只分析已勾選的非AI學派
  const individual = nonAiSelected.map(id => analyzeDreamBySchool(content, emotion, id));
  // AI綜合：如果勾選了ai，則綜合所有已勾選的非AI學派結果
  if (selected.includes('ai')) {
    const aiResult = schoolAI(individual);
    return [...individual, { school: 'ai', schoolName: 'AI綜合', ...aiResult }];
  }
  return individual;
}

/** 取得夢境權重（指定學派，用於scoring） */
export function getDreamWeights(content: string, emotion: string, schoolId: DreamSchoolId): Record<number, number> {
  return analyzeDreamBySchool(content, emotion, schoolId).weights;
}

/** 取得所有學派權重（用於scoring） */
export function getDreamWeightsAllSchools(content: string, emotion: string): Record<number, number> {
  const allResults = analyzeDreamAllSchools(content, emotion);
  const combined: Record<number, number> = {};
  allResults.forEach(r => {
    if (r.school === 'ai') {
      Object.entries(r.weights).forEach(([n, w]) => { combined[Number(n)] = (combined[Number(n)] || 0) + w; });
    } else {
      Object.entries(r.weights).forEach(([n, w]) => { combined[Number(n)] = (combined[Number(n)] || 0) + w * 0.15; });
    }
  });
  return combined;
}

// ===== 今日夢境權重（供首頁產號使用） =====
const DAILY_DREAM_WEIGHTS_KEY = 'lottery-daily-dream-weights';
const DAILY_DREAM_CONTENT_KEY = 'lottery-daily-dream-content';

/** 保存今日夢境權重 */
export function saveDailyDreamWeights(weights: Record<number, number>, content: string): void {
  saveDreamDataRaw(DAILY_DREAM_WEIGHTS_KEY, weights);
  saveDreamDataRaw(DAILY_DREAM_CONTENT_KEY, content);
}

/** 讀取今日夢境權重 */
export function loadDailyDreamWeights(): Record<number, number> | null {
  try {
    const raw = loadDreamDataRaw(DAILY_DREAM_WEIGHTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** 取得今日夢境內容 */
export function loadDailyDreamContent(): string {
  return loadDreamDataRaw(DAILY_DREAM_CONTENT_KEY) || '';
}

/** 清除今日夢境權重 */
export function clearDailyDreamWeights(): void {
  removeDreamDataRaw(DAILY_DREAM_WEIGHTS_KEY);
  removeDreamDataRaw(DAILY_DREAM_CONTENT_KEY);
}
