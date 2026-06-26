// ============================================================
// V10.5 命理掛法計算引擎 - 10種方法
// ============================================================

export interface DivinationResult {
  method: string;
  data: string;
  dominantElement: string;
  luckyTails: number[];
  avoidTails: number[];
  recommendedNumbers: number[];
  score: number;
  description: string;
  entertainmentNote: string;
  enabled: boolean;
}

export interface BirthData {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: '男' | '女';
  isLunar: boolean;
}

// 天干地支
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ZODIAC = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
const ELEMENT_MAP: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土',
  '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

function getLuckyByElement(el: string): number[] {
  const map: Record<string, number[]> = {
    '金': [4, 9, 14, 19, 24, 29, 34, 39, 49],
    '木': [3, 8, 13, 18, 23, 28, 33, 38],
    '水': [1, 6, 11, 16, 21, 26, 31, 36],
    '火': [2, 7, 12, 17, 22, 27, 32, 37],
    '土': [5, 10, 15, 20, 25, 30, 35, 40],
  };
  return map[el] || [];
}

function yearToGanZhi(year: number): [string, string] {
  const gan = TIAN_GAN[(year - 4) % 10];
  const zhi = DI_ZHI[(year - 4) % 12];
  return [gan, zhi];
}

/** 1. 梅花易數 */
export function calcMeiHua(birth: BirthData): DivinationResult {
  const [gan, zhi] = yearToGanZhi(birth.year);
  const seed = birth.year + birth.month + birth.day + birth.hour;
  const upper = (seed % 8) || 8;
  const lower = ((seed + birth.month) % 8) || 8;
  const yao = (seed % 6) || 6;
  const element = ELEMENT_MAP[TIAN_GAN[(birth.year - 4) % 10]] || '木';
  const lucky = getLuckyByElement(element);

  return {
    method: '梅花易數',
    data: `上卦${upper}下卦${lower}動爻${yao}（${gan}${zhi}年）`,
    dominantElement: element,
    luckyTails: lucky.map(n => n % 10),
    avoidTails: [(lucky[0] || 1) % 10 + 5],
    recommendedNumbers: lucky.slice(0, 8),
    score: 75,
    description: `梅花易數顯示「${gan}${zhi}」之年，主氣為${element}。動爻${yao}暗示號碼需微調。`,
    entertainmentNote: '本功能為娛樂性質，僅供個人化權重參考',
    enabled: true,
  };
}

/** 2. 六爻 */
export function calcLiuYao(birth: BirthData): DivinationResult {
  const seed = birth.year * 100 + birth.month * 10 + birth.day + birth.hour;
  const yaoList = Array.from({ length: 6 }, (_, i) => ((seed >> i) + i) % 2);
  const yang = yaoList.filter(y => y === 1).length;
  const yin = 6 - yang;
  const tendency = yang >= 4 ? '偏陽' : yin >= 4 ? '偏陰' : '中和';
  const element = yang > yin ? '火' : yin > yang ? '水' : '土';
  const lucky = getLuckyByElement(element);

  return {
    method: '六爻',
    data: `六爻：${yang}陽${yin}陰（${tendency}）`,
    dominantElement: element,
    luckyTails: lucky.map(n => n % 10),
    avoidTails: tendency === '偏陽' ? [1, 6] : [2, 7],
    recommendedNumbers: lucky.slice(0, 8),
    score: 70,
    description: `六爻顯示${yang}陽${yin}陰，屬性${tendency}。建議選擇${element}性號碼。`,
    entertainmentNote: '本功能為娛樂性質，六爻簡化計算僅供參考',
    enabled: true,
  };
}

/** 3. 奇門遁甲簡化 */
export function calcQiMen(birth: BirthData): DivinationResult {
  const palaces = ['休門', '生門', '傷門', '杜門', '景門', '死門', '驚門', '開門'];
  const palace = palaces[(birth.year + birth.month + birth.day) % 8];
  const elements: Record<string, string> = {
    '休門': '水', '生門': '土', '傷門': '木', '杜門': '木',
    '景門': '火', '死門': '土', '驚門': '金', '開門': '金',
  };
  const element = elements[palace] || '土';
  const lucky = getLuckyByElement(element);

  return {
    method: '奇門遁甲',
    data: `值使門：${palace}`,
    dominantElement: element,
    luckyTails: lucky.map(n => n % 10),
    avoidTails: palace === '死門' || palace === '傷門' ? [4, 9] : [],
    recommendedNumbers: lucky.slice(0, 8),
    score: 65,
    description: `奇門遁甲簡化盤顯示值使${palace}，五行屬${element}。此門象徵${palace === '生門' ? '財運亨通' : palace === '開門' ? '事業開展' : '需謹慎應對'}。`,
    entertainmentNote: '奇門遁甲為簡化娛樂版本，非專業排盤',
    enabled: false,
  };
}

/** 4. 八字五行 */
export function calcBaZi(birth: BirthData): DivinationResult {
  const [yearGan, yearZhi] = yearToGanZhi(birth.year);
  const monthGan = TIAN_GAN[(birth.year - 4 + birth.month) % 10];
  const dayGan = TIAN_GAN[(birth.year * 5 + birth.month * 2 + birth.day) % 10];
  const hourZhi = DI_ZHI[Math.floor(birth.hour / 2) % 12];

  const elements = [yearGan, yearZhi, monthGan, dayGan, hourZhi].map(gz => ELEMENT_MAP[gz] || '木');
  const counts: Record<string, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  elements.forEach(e => counts[e]++);
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const weakest = Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0];
  const lucky = getLuckyByElement(dominant);

  return {
    method: '八字五行',
    data: `年柱${yearGan}${yearZhi} 月柱${monthGan}${DI_ZHI[birth.month % 12]} 日柱${dayGan}${DI_ZHI[birth.day % 12]} 時柱${TIAN_GAN[birth.hour % 10]}${hourZhi}`,
    dominantElement: dominant,
    luckyTails: lucky.map(n => n % 10),
    avoidTails: getLuckyByElement(weakest).slice(0, 2).map(n => n % 10),
    recommendedNumbers: lucky.slice(0, 8),
    score: 85,
    description: `八字五行分析：${dominant}氣最旺(${counts[dominant]}個)，${weakest}氣最弱(${counts[weakest]}個)。建議補強${dominant}行號碼。`,
    entertainmentNote: '八字為簡化計算，非專業命盤分析，僅供娛樂參考',
    enabled: true,
  };
}

/** 5. 紫微斗數簡化 */
export function calcZiWei(birth: BirthData): DivinationResult {
  const mingZhu = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'];
  const star = mingZhu[(birth.year + birth.month * 2 + birth.day) % mingZhu.length];
  const starElements: Record<string, string> = {
    '紫微': '土', '天機': '木', '太陽': '火', '武曲': '金', '天同': '水',
    '廉貞': '火', '天府': '土', '太陰': '水', '貪狼': '木', '巨門': '水',
    '天相': '水', '天梁': '土', '七殺': '金', '破軍': '水',
  };
  const element = starElements[star] || '土';
  const lucky = getLuckyByElement(element);

  return {
    method: '紫微斗數',
    data: `命宮主星：${star}`,
    dominantElement: element,
    luckyTails: lucky.map(n => n % 10),
    avoidTails: star === '七殺' || star === '破軍' ? [3, 8] : [],
    recommendedNumbers: lucky.slice(0, 8),
    score: 72,
    description: `紫微斗數簡化分析，命宮主星為${star}，五行屬${element}。此星象徵${star === '紫微' ? '尊貴領導' : star === '武曲' ? '財富事業' : '多變機遇'}。`,
    entertainmentNote: '紫微斗數為極度簡化版本，僅供娛樂參考',
    enabled: false,
  };
}

/** 6. 河洛理數 */
export function calcHeLuo(birth: BirthData): DivinationResult {
  const heLuoNumbers: Record<string, number> = {
    '水': 1, '火': 2, '木': 3, '金': 4, '土': 5,
    '水2': 6, '火2': 7, '木2': 8, '金2': 9, '土2': 10,
  };
  const [yearGan] = yearToGanZhi(birth.year);
  const element = ELEMENT_MAP[yearGan] || '木';
  const baseNum = heLuoNumbers[element] || 3;
  const lucky = [baseNum, baseNum + 10, baseNum + 20, baseNum + 30].filter(n => n <= 49);

  return {
    method: '河洛理數',
    data: `年干${yearGan} → 河洛數${baseNum}`,
    dominantElement: element,
    luckyTails: lucky.map(n => n % 10),
    avoidTails: [(baseNum + 5) % 10],
    recommendedNumbers: lucky,
    score: 60,
    description: `河洛理數以年干${yearGan}換算，基數為${baseNum}。延伸尾數${lucky.map(n => n % 10).join('、')}為吉。`,
    entertainmentNote: '河洛理數為簡化娛樂版本',
    enabled: false,
  };
}

/** 7. 玄空飛星 */
export function calcXuanKong(birth: BirthData): DivinationResult {
  const star = ((birth.year - 4) % 9) + 1;
  const starElements: Record<number, string> = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };
  const element = starElements[star] || '土';
  const lucky = getLuckyByElement(element);

  return {
    method: '玄空飛星',
    data: `流年飛星：${star}紫白星`,
    dominantElement: element,
    luckyTails: lucky.map(n => n % 10),
    avoidTails: star === 5 ? [2, 5, 8] : [],
    recommendedNumbers: lucky.slice(0, 8),
    score: 68,
    description: `玄空飛星九宮：${star}星入中宮，五行屬${element}。${star === 8 || star === 9 ? '當旺之星' : star === 5 ? '五黃廉貞需避' : '平穩運行'}。`,
    entertainmentNote: '玄空飛星為簡化娛樂版本',
    enabled: false,
  };
}

/** 8. 生肖流年 */
export function calcShengXiao(birth: BirthData): DivinationResult {
  const zodiacIdx = (birth.year - 4) % 12;
  const animal = ZODIAC[zodiacIdx];
  const zodiacElements: Record<string, string> = {
    '鼠': '水', '牛': '土', '虎': '木', '兔': '木', '龍': '土',
    '蛇': '火', '馬': '火', '羊': '土', '猴': '金', '雞': '金', '狗': '土', '豬': '水',
  };
  const element = zodiacElements[animal] || '土';
  const lucky = getLuckyByElement(element);

  // 貴人生肖
  const guiRen = ['牛', '龍', '猴', '雞', '狗', '豬'];
  const hasGuiRen = guiRen.includes(animal);

  return {
    method: '生肖流年',
    data: `${birth.year}年屬${animal}（${element}）`,
    dominantElement: element,
    luckyTails: lucky.map(n => n % 10),
    avoidTails: animal === '蛇' || animal === '豬' ? [3, 9] : [],
    recommendedNumbers: lucky.slice(0, 8),
    score: 78,
    description: `${birth.year}年生肖屬${animal}，五行${element}${hasGuiRen ? '，逢貴人星' : ''}。宜選${element}行尾數號碼。`,
    entertainmentNote: '生肖流年為傳統娛樂參考，無預測能力',
    enabled: true,
  };
}

/** 9. 九星氣學 */
export function calcJiuXing(birth: BirthData): DivinationResult {
  const jiuXing = ['一白', '二黑', '三碧', '四綠', '五黃', '六白', '七赤', '八白', '九紫'];
  const idx = (birth.year + birth.month) % 9;
  const star = jiuXing[idx];
  const element = star.includes('白') ? '水' : star.includes('黑') ? '土' : star.includes('碧') || star.includes('綠') ? '木' : star.includes('黃') ? '土' : star.includes('赤') ? '金' : '火';
  const lucky = getLuckyByElement(element);

  return {
    method: '九星氣學',
    data: `本命星：${star}`,
    dominantElement: element,
    luckyTails: lucky.map(n => n % 10),
    avoidTails: star === '五黃' || star === '二黑' ? [2, 5, 8] : [],
    recommendedNumbers: lucky.slice(0, 8),
    score: 62,
    description: `九星氣學本命星為${star}，五行屬${element}。${star === '八白' || star === '一白' ? '吉星高照' : star === '五黃' ? '需低調保守' : '平穩發展'}。`,
    entertainmentNote: '九星氣學為娛樂簡化版本',
    enabled: false,
  };
}

/** 10. 塔羅數字 */
export function calcTarot(birth: BirthData): DivinationResult {
  const tarotCards: Record<number, { name: string; element: string; meaning: string }> = {
    1: { name: '魔術師', element: '金', meaning: '開始創造' },
    2: { name: '女祭司', element: '水', meaning: '直覺智慧' },
    3: { name: '皇后', element: '土', meaning: '豐盛滋養' },
    4: { name: '皇帝', element: '火', meaning: '掌控權力' },
    5: { name: '教皇', element: '土', meaning: '傳統指引' },
    6: { name: '戀人', element: '風', meaning: '選擇結合' },
    7: { name: '戰車', element: '水', meaning: '勝利意志' },
    8: { name: '力量', element: '火', meaning: '勇氣耐心' },
    9: { name: '隱者', element: '土', meaning: '內省尋找' },
    10: { name: '命運之輪', element: '火', meaning: '轉變機運' },
    11: { name: '正義', element: '風', meaning: '平衡公正' },
    12: { name: '吊人', element: '水', meaning: '犧牲等待' },
    13: { name: '死神', element: '水', meaning: '結束重生' },
    14: { name: '節制', element: '火', meaning: '調和平衡' },
    15: { name: '惡魔', element: '土', meaning: '欲望束縛' },
    16: { name: '塔', element: '火', meaning: '突變覺醒' },
    17: { name: '星星', element: '風', meaning: '希望啟發' },
    18: { name: '月亮', element: '水', meaning: '幻想直覺' },
    19: { name: '太陽', element: '火', meaning: '成功喜悅' },
    20: { name: '審判', element: '火', meaning: '重生覺醒' },
    21: { name: '世界', element: '土', meaning: '圓滿完成' },
    0: { name: '愚者', element: '風', meaning: '新旅程' },
  };
  const cardNum = (birth.day + birth.month) % 22;
  const card = tarotCards[cardNum] || tarotCards[0];
  const elementMap: Record<string, string> = { '金': '金', '水': '水', '土': '土', '火': '火', '風': '木' };
  const element = elementMap[card.element] || '木';
  const lucky = getLuckyByElement(element);

  return {
    method: '塔羅數字',
    data: `命運牌：${card.name}（${card.meaning}）`,
    dominantElement: element,
    luckyTails: lucky.map(n => n % 10),
    avoidTails: cardNum === 13 || cardNum === 15 || cardNum === 16 ? [4, 9] : [],
    recommendedNumbers: lucky.slice(0, 8),
    score: 55,
    description: `塔羅數字對應「${card.name}」，象徵${card.meaning}。五行屬${element}，適合${element}行尾數號碼。`,
    entertainmentNote: '塔羅數字純為娛樂輔助，無命理預測功能',
    enabled: true,
  };
}

/** 執行全部掛法 */
export function runAllDivinations(birth: BirthData): DivinationResult[] {
  return [
    calcMeiHua(birth),
    calcLiuYao(birth),
    calcQiMen(birth),
    calcBaZi(birth),
    calcZiWei(birth),
    calcHeLuo(birth),
    calcXuanKong(birth),
    calcShengXiao(birth),
    calcJiuXing(birth),
    calcTarot(birth),
  ];
}

/** 綜合玄學權重 */
export function calcMetaphysicsWeights(results: DivinationResult[]): Record<number, number> {
  const weights: Record<number, number> = {};
  const enabled = results.filter(r => r.enabled);

  enabled.forEach(r => {
    r.recommendedNumbers.forEach((n, i) => {
      weights[n] = (weights[n] || 0) + r.score * (1 - i * 0.1);
    });
  });

  // 標準化到 10-100
  const max = Math.max(...Object.values(weights), 1);
  Object.keys(weights).forEach(k => {
    weights[Number(k)] = Math.round(10 + (weights[Number(k)] / max) * 90);
  });

  return weights;
}

// localStorage（使用 userStorage 隔離）
import { userGetItem, userSetItem } from './userStorage';
const BIRTH_KEY = 'lottery-metaphysics-birth';
export function loadBirthData(): BirthData | null {
  try { return JSON.parse(userGetItem(BIRTH_KEY) || 'null'); }
  catch { return null; }
}
export function saveBirthData(data: BirthData) {
  userSetItem(BIRTH_KEY, JSON.stringify(data));
}
