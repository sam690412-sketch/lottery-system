// ============================================================
// 威力彩13層選號漏斗 - 5種卦象系統
// ============================================================

import { TRIGRAMS, FIVE_ELEMENT_NUMBERS } from './lottery';
import type { HexagramSet, HexagramResult, SixYaoResult, FiveElementsResult, UserHexResult } from '@/types';

/** 1. 時間起卦 - 以年月日時建立卦象 */
export function generateTimeHexagram(dateStr: string, timeStr: string): HexagramResult {
  const dt = new Date(`${dateStr}T${timeStr}`);
  const year = dt.getFullYear();
  const month = dt.getMonth() + 1;
  const day = dt.getDate();
  const hour = dt.getHours();

  // 農曆轉換簡化版
  const lunarYear = year;
  const lunarMonth = month;
  const lunarDay = day;

  // 時辰索引
  const hourZhi = Math.floor((hour + 1) % 24 / 2);

  // 上卦 = (年+月+日) % 8
  const upperGua = ((lunarYear % 12) + lunarMonth + lunarDay) % 8 || 8;
  // 下卦 = (年+月+日+時) % 8
  const lowerGua = ((lunarYear % 12) + lunarMonth + lunarDay + hourZhi) % 8 || 8;
  // 動爻
  const yao = ((lunarYear % 12) + lunarMonth + lunarDay + hourZhi) % 6 || 6;

  const ug = TRIGRAMS[upperGua];
  const lg = TRIGRAMS[lowerGua];

  // 本卦六爻
  const benYao = [...lg.yao, ...ug.yao];
  // 變卦
  const bianYao = [...benYao];
  bianYao[yao - 1] = 1 - bianYao[yao - 1];

  // 互卦
  const huUpper = benYao.slice(2, 5);
  const huLower = benYao.slice(1, 4);

  const mainName = `${ug.name}${lg.name}`;

  // 判斷變卦名稱
  const findGua = (yao3: number[]) => {
    for (let i = 1; i <= 8; i++) {
      if (TRIGRAMS[i].yao.every((y, idx) => y === yao3[idx])) return TRIGRAMS[i].name;
    }
    return '?';
  };

  const huUName = findGua(huUpper);
  const huLName = findGua(huLower);
  const bianLName = findGua(bianYao.slice(0, 3));
  const bianUName = findGua(bianYao.slice(3, 6));

  // 五行分析
  const elements = [ug.element, lg.element];
  const dominant = elements[0]; // 上卦為主

  const adviceMap: Record<string, string> = {
    '金': '今日金氣旺盛，適合選擇尾數4、9的號碼',
    '木': '今日木氣旺盛，適合選擇尾數3、8的號碼',
    '水': '今日水氣旺盛，適合選擇尾數1、6的號碼',
    '火': '今日火氣旺盛，適合選擇尾數2、7的號碼',
    '土': '今日土氣旺盛，適合選擇尾數5、0的號碼',
  };

  return {
    name: `${mainName}卦`,
    mainHex: `${ug.symbol}${lg.symbol} ${ug.name}${lg.name}(${ug.nature}上${lg.nature}下)`,
    huHex: `${huUName}${huLName}卦`,
    bianHex: `${bianUName}${bianLName}卦`,
    element: `${ug.element}+${lg.element}`,
    advice: `【時間卦】${ug.name}${lg.name}卦(${ug.nature}上${lg.nature}下)。${adviceMap[dominant] || ''}動爻在第${yao}爻，暗示核心號碼需調整。`,
  };
}

/** 2. 梅花易數 - 上下卦+動爻 */
export function generatePlumHexagram(dateStr: string): HexagramResult {
  const dt = new Date(dateStr);
  const y = dt.getFullYear();
  const m = dt.getMonth() + 1;
  const d = dt.getDate();

  const upperGua = (y + m + d) % 8 || 8;
  const lowerGua = (y + m + d + 1) % 8 || 8;
  const yao = (y + m + d + 2) % 6 || 6;

  const ug = TRIGRAMS[upperGua];
  const lg = TRIGRAMS[lowerGua];

  const mainName = `${ug.name}${lg.name}`;
  const guaMeaning: Record<string, string> = {
    '乾坤': '天地交泰，適合大小號均衡搭配',
    '離坎': '水火既濟，適合冷熱號混搭',
    '震巽': '雷風相薄，適合相鄰號碼組合',
    '艮兌': '山澤通氣，適合對稱號碼',
  };

  return {
    name: `${mainName}卦`,
    mainHex: `${ug.symbol}${lg.symbol} ${ug.name}${lg.name}`,
    huHex: `${TRIGRAMS[(upperGua % 8) + 1]?.name || '乾'}${TRIGRAMS[(lowerGua % 8) + 1]?.name || '坤'}`,
    bianHex: `${ug.name}${lg.name}`,
    element: `${ug.element}+${lg.element}`,
    advice: `【梅花易數】${ug.name}${lg.name}卦。${guaMeaning[mainName] || '陰陽調和，適合均衡選號'}。動爻${yao}，今日強勢尾數為${(m * d) % 10}、${(y + m) % 10}。`,
  };
}

/** 3. 六爻簡化版 */
export function generateSixYao(userInputs?: number[]): SixYaoResult {
  const yaoList: number[] = [];

  if (userInputs && userInputs.length >= 6) {
    // 用戶輸入
    for (let i = 0; i < 6; i++) {
      yaoList.push(userInputs[i] % 2); // 奇為陽(1)，偶為陰(0)
    }
  } else {
    // 隨機生成
    const dt = new Date();
    const seed = dt.getTime();
    for (let i = 0; i < 6; i++) {
      yaoList.push(((seed >> i) + i * 7) % 2);
    }
  }

  // 分析傾向
  const yangCount = yaoList.filter(y => y === 1).length;
  const yinCount = 6 - yangCount;

  const tendency: '偏大' | '偏小' | '均衡' =
    yangCount >= 4 ? '偏大' : yangCount <= 2 ? '偏小' : '均衡';

  const oddEven: '偏奇' | '偏偶' | '均衡' =
    yangCount >= 4 ? '偏奇' : yangCount <= 2 ? '偏偶' : '均衡';

  const advice = `六爻顯示${yangCount}陽${yinCount}陰，今日傾向${tendency}號、${oddEven}數。${yangCount >= 4 ? '大號(20-38)與奇數較旺' : yangCount <= 2 ? '小號(1-19)與偶數較旺' : '大小奇偶均衡為宜'}。`;

  return { yaoList, advice, tendency, oddEven };
}

/** 4. 五行數字法 */
export function generateFiveElements(dateStr: string): FiveElementsResult {
  const dt = new Date(dateStr);
  const year = dt.getFullYear();
  const month = dt.getMonth() + 1;
  const day = dt.getDate();

  // 日干決定五行
  const dayStem = (year + month + day) % 10;
  const stems = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  const dominant = stems[dayStem];

  // 今日權重
  const weights: Record<string, number[]> = { ...FIVE_ELEMENT_NUMBERS };

  // 強勢尾數和忌用尾數
  const elementTails: Record<string, number[]> = {
    '水': [1, 6], '火': [2, 7], '木': [3, 8], '金': [4, 9], '土': [5, 0],
  };

  const luckyTails = elementTails[dominant] || [1, 6];
  const avoidElement = {
    '水': '土', '火': '水', '木': '金', '金': '火', '土': '木',
  }[dominant] || '水';
  const avoidTails = elementTails[avoidElement] || [5, 0];

  return {
    weights,
    dominant,
    luckyTails,
    avoidTails,
  };
}

/** 5. 養號卦 */
export function generateUserHexagram(userZone1: number[]): UserHexResult {
  const sum = userZone1.reduce((a, b) => a + b, 0);
  const tail = sum % 10;
  const span = Math.max(...userZone1) - Math.min(...userZone1);
  const oddCount = userZone1.filter(n => n % 2 === 1).length;

  // 基於真實統計的頻率
  const freqMap: Record<number, number> = {
    9: 282, 14: 271, 11: 254, 38: 248, 34: 244, 32: 232, 7: 216,
    20: 206, 35: 204, 8: 202, 15: 198, 16: 196, 29: 193, 4: 185,
    6: 184, 17: 183, 27: 178, 31: 177, 22: 172, 3: 171, 36: 170,
    1: 169, 33: 169, 18: 166, 28: 163, 10: 161, 19: 159, 12: 159,
    25: 156, 21: 153, 26: 150, 5: 140, 13: 137, 24: 133, 23: 116,
    2: 110, 30: 100,
  };

  const scored = userZone1.map(n => ({
    num: n,
    score: freqMap[n] || 100,
    distance: Math.abs(n - tail * 4),
  }));

  scored.sort((a, b) => b.score - a.score);

  const keep = scored.slice(0, 4).map(s => s.num);
  const replace = scored.slice(4).map(s => s.num);

  const advice = `養號總和${sum}，尾數${tail}，跨度${span}，奇偶比${oddCount}:${6 - oddCount}。建議保留：${keep.join('、')}；可替換：${replace.join('、')}。${span > 25 ? '跨度偏大，建議加入中間區號碼' : '跨度適中，結構穩定'}。`;

  return { keep, replace, advice };
}

/** 綜合產出5種卦象 */
export function generateAllHexagrams(dateStr: string, timeStr: string, userZone1: number[]): HexagramSet {
  return {
    timeHex: generateTimeHexagram(dateStr, timeStr),
    plumHex: generatePlumHexagram(dateStr),
    sixYao: generateSixYao(),
    fiveElements: generateFiveElements(dateStr),
    userHex: generateUserHexagram(userZone1),
  };
}

/** 卦象轉權重 */
export function hexagramToWeights(hexSet: HexagramSet): Record<number, number> {
  const weights: Record<number, number> = {};
  for (let i = 1; i <= 38; i++) weights[i] = 10; // 基礎10分

  // 時間卦 - 五行加成
  const timeEls = hexSet.timeHex.element.split('+');
  timeEls.forEach(el => {
    const nums = FIVE_ELEMENT_NUMBERS[el] || [];
    nums.forEach(n => { if (n <= 38) weights[n] += 8; });
  });

  // 梅花易數 - 尾數加成
  const plumEls = hexSet.plumHex.element.split('+');
  plumEls.forEach(el => {
    const nums = FIVE_ELEMENT_NUMBERS[el] || [];
    nums.forEach(n => { if (n <= 38) weights[n] += 5; });
  });

  // 六爻 - 大小/奇偶加成
  if (hexSet.sixYao.tendency === '偏大') {
    for (let i = 20; i <= 38; i++) weights[i] += 6;
  } else if (hexSet.sixYao.tendency === '偏小') {
    for (let i = 1; i <= 19; i++) weights[i] += 6;
  }
  if (hexSet.sixYao.oddEven === '偏奇') {
    for (let i = 1; i <= 38; i += 2) weights[i] += 4;
  } else if (hexSet.sixYao.oddEven === '偏偶') {
    for (let i = 2; i <= 38; i += 2) weights[i] += 4;
  }

  // 五行數字法 - 主導五行加成
  const fe = hexSet.fiveElements;
  const domNums = FIVE_ELEMENT_NUMBERS[fe.dominant] || [];
  domNums.forEach(n => { if (n <= 38) weights[n] += 10; });
  // 忌用減分
  const avoidEl = {
    '水': '土', '火': '水', '木': '金', '金': '火', '土': '木',
  }[fe.dominant] || '土';
  (FIVE_ELEMENT_NUMBERS[avoidEl] || []).forEach(n => {
    if (n <= 38) weights[n] -= 3;
  });

  // 養號卦 - 保留號碼加成
  hexSet.userHex.keep.forEach(n => { weights[n] += 12; });

  // 幸運尾數加成
  fe.luckyTails.forEach(t => {
    for (let i = 1; i <= 38; i++) {
      if (i % 10 === t) weights[i] += 3;
    }
  });

  return weights;
}
