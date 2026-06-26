// ============================================================
// V10.5 夢境符號資料庫 - 80個符號完整分類
// ============================================================

export interface DreamSymbol {
  symbol: string;
  category: string;
  element: '金' | '木' | '水' | '火' | '土';
  luckyDigits: number[];
  avoidDigits: number[];
  meaning: string;
  weight: number;
}

export interface DreamRecord {
  id: string;
  date: string;
  content: string;
  emotion: '吉' | '普通' | '不安' | '驚醒';
  symbols: string[];
  dreamNumbers: number[];
  note: string;
  luckyTails: number[];
  avoidTails: number[];
  suggestedNumbers: number[];
}

// 80個夢境符號
export const DREAM_SYMBOLS: DreamSymbol[] = [
  // ===== 動物類 (1-12) =====
  { symbol: '龍', category: '動物', element: '土', luckyDigits: [1,5,8,16,21,28,35], avoidDigits: [4,9], meaning: '祥瑞之象，權勢財富', weight: 9 },
  { symbol: '蛇', category: '動物', element: '火', luckyDigits: [3,6,9,13,18,27,36], avoidDigits: [1,8], meaning: '轉機蛻變，防小人', weight: 7 },
  { symbol: '虎', category: '動物', element: '木', luckyDigits: [4,10,14,20,23,30,34], avoidDigits: [6,12], meaning: '勇氣果斷，有貴人', weight: 8 },
  { symbol: '鳥', category: '動物', element: '金', luckyDigits: [2,7,12,19,22,29,33], avoidDigits: [5,10], meaning: '消息將至，自由之兆', weight: 6 },
  { symbol: '魚', category: '動物', element: '水', luckyDigits: [1,6,11,17,24,26,31], avoidDigits: [3,9], meaning: '財運亨通，年年有餘', weight: 9 },
  { symbol: '貓', category: '動物', element: '木', luckyDigits: [3,8,15,21,28,32,37], avoidDigits: [7,13], meaning: '靈性守護，獨立自主', weight: 5 },
  { symbol: '狗', category: '動物', element: '土', luckyDigits: [5,10,15,20,25,30,35], avoidDigits: [2,11], meaning: '忠誠友誼，貴人相助', weight: 6 },
  { symbol: '馬', category: '動物', element: '火', luckyDigits: [2,7,14,22,27,33,38], avoidDigits: [4,19], meaning: '事業奔馳，馬到成功', weight: 7 },
  { symbol: '龜', category: '動物', element: '水', luckyDigits: [1,6,11,16,21,26,31], avoidDigits: [8,18], meaning: '長壽穩健，以靜制動', weight: 8 },
  { symbol: '蜘蛛', category: '動物', element: '金', luckyDigits: [4,9,14,19,24,29,34], avoidDigits: [1,7], meaning: '網路良機，防暗算', weight: 4 },
  { symbol: '蝴蝶', category: '動物', element: '木', luckyDigits: [3,8,13,18,23,28,33], avoidDigits: [6,16], meaning: '美好蛻變，戀愛運', weight: 7 },
  { symbol: '蝙蝠', category: '動物', element: '水', luckyDigits: [1,5,11,17,26,29,36], avoidDigits: [2,12], meaning: '福到臨門，轉運之兆', weight: 5 },

  // ===== 自然類 (13-24) =====
  { symbol: '水', category: '自然', element: '水', luckyDigits: [1,6,11,16,21,26,31,36], avoidDigits: [5,10], meaning: '財運流動，智慧清澈', weight: 8 },
  { symbol: '火', category: '自然', element: '火', luckyDigits: [2,7,12,17,22,27,32,37], avoidDigits: [1,6], meaning: '熱情動力，需防衝動', weight: 7 },
  { symbol: '山', category: '自然', element: '土', luckyDigits: [5,10,15,20,25,30,35], avoidDigits: [2,8], meaning: '穩重靠山，堅持到底', weight: 8 },
  { symbol: '海', category: '自然', element: '水', luckyDigits: [1,6,11,16,21,26,31,36], avoidDigits: [4,9], meaning: '格局宏大，機會無限', weight: 9 },
  { symbol: '路', category: '自然', element: '土', luckyDigits: [1,4,7,10,13,16,19,22], avoidDigits: [8,18], meaning: '前程方向，新的開始', weight: 7 },
  { symbol: '雨', category: '自然', element: '水', luckyDigits: [1,4,7,11,14,17,21], avoidDigits: [3,13], meaning: '洗滌更新，甘霖之兆', weight: 6 },
  { symbol: '太陽', category: '自然', element: '火', luckyDigits: [2,7,12,17,22,27,32,37], avoidDigits: [4,14], meaning: '光明前景，能量充沛', weight: 9 },
  { symbol: '月亮', category: '自然', element: '水', luckyDigits: [1,6,11,16,21,26,31,36], avoidDigits: [5,15], meaning: '內在直覺，陰性能量', weight: 7 },
  { symbol: '樹', category: '自然', element: '木', luckyDigits: [3,8,13,18,23,28,33,38], avoidDigits: [1,11], meaning: '成長茁壯，根基穩固', weight: 8 },
  { symbol: '花', category: '自然', element: '木', luckyDigits: [3,9,15,21,27,33], avoidDigits: [6,16], meaning: '美好綻放，人緣桃花', weight: 7 },
  { symbol: '雪', category: '自然', element: '水', luckyDigits: [1,6,11,16,21,26], avoidDigits: [3,13], meaning: '純淨洗禮，靜待時機', weight: 5 },
  { symbol: '風', category: '自然', element: '木', luckyDigits: [3,8,14,20,26,32], avoidDigits: [5,15], meaning: '變動轉機，順勢而為', weight: 6 },

  // ===== 人物類 (25-32) =====
  { symbol: '小孩', category: '人物', element: '木', luckyDigits: [3,8,13,18,23,28], avoidDigits: [7,17], meaning: '新計畫開始，純真力量', weight: 7 },
  { symbol: '親人', category: '人物', element: '土', luckyDigits: [5,10,15,20,25,30], avoidDigits: [2,12], meaning: '家庭支持，祖蔭庇佑', weight: 8 },
  { symbol: '陌生人', category: '人物', element: '金', luckyDigits: [4,9,14,19,24,29], avoidDigits: [1,11], meaning: '新機緣出現，貴人暗藏', weight: 6 },
  { symbol: '老師', category: '人物', element: '金', luckyDigits: [4,9,14,19,24,29], avoidDigits: [3,13], meaning: '學習成長，智慧指引', weight: 7 },
  { symbol: '醫生', category: '人物', element: '水', luckyDigits: [1,6,11,16,21,26], avoidDigits: [5,15], meaning: '健康轉好，療癒能量', weight: 7 },
  { symbol: '皇帝', category: '人物', element: '土', luckyDigits: [5,10,15,20,25,30,35], avoidDigits: [2,8], meaning: '權力地位，領導氣場', weight: 8 },
  { symbol: '乞丐', category: '人物', element: '水', luckyDigits: [1,6,11,16,21], avoidDigits: [9,19], meaning: '放下包袱，簡單是福', weight: 4 },
  { symbol: '新娘', category: '人物', element: '火', luckyDigits: [2,7,12,17,22,27], avoidDigits: [4,14], meaning: '喜慶之事，美好結合', weight: 8 },

  // ===== 交通類 (33-38) =====
  { symbol: '車', category: '交通', element: '金', luckyDigits: [4,9,14,19,24,29,34], avoidDigits: [1,7], meaning: '事業前進，掌控方向', weight: 7 },
  { symbol: '飛機', category: '交通', element: '金', luckyDigits: [4,9,14,19,24,29,34], avoidDigits: [3,13], meaning: '格局提升，遠方機會', weight: 8 },
  { symbol: '船', category: '交通', element: '水', luckyDigits: [1,6,11,16,21,26,31], avoidDigits: [4,14], meaning: '順流航行，穩健前行', weight: 7 },
  { symbol: '火車', category: '交通', element: '火', luckyDigits: [2,7,12,17,22,27,32], avoidDigits: [5,15], meaning: '按部就班，持續前進', weight: 6 },
  { symbol: '自行車', category: '交通', element: '木', luckyDigits: [3,8,13,18,23,28], avoidDigits: [6,16], meaning: '穩健踏實，量力而行', weight: 5 },
  { symbol: '電梯', category: '交通', element: '金', luckyDigits: [4,9,14,19,24,29], avoidDigits: [2,8], meaning: '升降機運，把握時機', weight: 6 },

  // ===== 建築類 (39-46) =====
  { symbol: '房子', category: '建築', element: '土', luckyDigits: [5,10,15,20,25,30,35], avoidDigits: [2,8], meaning: '根基安全，歸屬感', weight: 8 },
  { symbol: '廟宇', category: '建築', element: '土', luckyDigits: [5,10,15,20,25,30,35], avoidDigits: [1,7], meaning: '神明庇佑，心靈寄託', weight: 9 },
  { symbol: '橋', category: '建築', element: '水', luckyDigits: [1,6,11,16,21,26], avoidDigits: [4,14], meaning: '連結轉換，跨越困難', weight: 7 },
  { symbol: '塔', category: '建築', element: '金', luckyDigits: [4,9,14,19,24,29], avoidDigits: [3,13], meaning: '目標遠大，登高望遠', weight: 6 },
  { symbol: '學校', category: '建築', element: '木', luckyDigits: [3,8,13,18,23,28], avoidDigits: [6,16], meaning: '學習考運，知識增長', weight: 7 },
  { symbol: '醫院', category: '建築', element: '水', luckyDigits: [1,6,11,16,21,26], avoidDigits: [5,15], meaning: '健康警示，療癒需要', weight: 4 },
  { symbol: '墓地', category: '建築', element: '土', luckyDigits: [5,10,15,20], avoidDigits: [2,7,12], meaning: '結束重生，放下過去', weight: 3 },
  { symbol: '城堡', category: '建築', element: '土', luckyDigits: [5,10,15,20,25,30], avoidDigits: [3,13], meaning: '防護堡壘，地位穩固', weight: 7 },

  // ===== 財物類 (47-54) =====
  { symbol: '錢', category: '財物', element: '金', luckyDigits: [8,18,28,38,6,16,26], avoidDigits: [1,11], meaning: '財運將至，物質豐盛', weight: 9 },
  { symbol: '黃金', category: '財物', element: '金', luckyDigits: [4,9,14,19,24,29,34], avoidDigits: [2,8], meaning: '財富增值，貴重機會', weight: 10 },
  { symbol: '鑽石', category: '財物', element: '金', luckyDigits: [4,9,14,19,24,29], avoidDigits: [3,12], meaning: '珍稀良機，閃耀成就', weight: 9 },
  { symbol: '衣服', category: '財物', element: '木', luckyDigits: [3,8,13,18,23,28], avoidDigits: [5,15], meaning: '形象改變，外在提升', weight: 5 },
  { symbol: '書', category: '財物', element: '木', luckyDigits: [3,8,13,18,23,28], avoidDigits: [6,16], meaning: '知識寶藏，考運亨通', weight: 7 },
  { symbol: '手機', category: '財物', element: '金', luckyDigits: [4,9,14,19,24,29], avoidDigits: [1,10], meaning: '消息連結，科技助力', weight: 5 },
  { symbol: '鑰匙', category: '財物', element: '金', luckyDigits: [4,9,14,19,24,29], avoidDigits: [2,7], meaning: '開啟新局，解決方案', weight: 8 },
  { symbol: '鏡子', category: '財物', element: '金', luckyDigits: [4,9,14,19,24,29], avoidDigits: [3,8], meaning: '自我認知，反射真相', weight: 5 },

  // ===== 宗教類 (55-60) =====
  { symbol: '神明', category: '宗教', element: '土', luckyDigits: [5,10,15,20,25,30,35], avoidDigits: [1,6], meaning: '天佑福至，大吉之兆', weight: 10 },
  { symbol: '佛像', category: '宗教', element: '土', luckyDigits: [5,10,15,20,25,30,35], avoidDigits: [2,7], meaning: '慈悲智慧，心靈平靜', weight: 9 },
  { symbol: '十字架', category: '宗教', element: '金', luckyDigits: [4,9,14,19,24,29], avoidDigits: [3,13], meaning: '救贖重生，信仰力量', weight: 8 },
  { symbol: '念珠', category: '宗教', element: '土', luckyDigits: [5,10,15,20,25,30], avoidDigits: [1,8], meaning: '修行精進，內在平靜', weight: 7 },
  { symbol: '香爐', category: '宗教', element: '火', luckyDigits: [2,7,12,17,22,27], avoidDigits: [4,14], meaning: '祈福祭祀，誠心感應', weight: 8 },
  { symbol: '符咒', category: '宗教', element: '木', luckyDigits: [3,8,13,18,23,28], avoidDigits: [5,15], meaning: '護身避邪，轉運能量', weight: 7 },

  // ===== 情緒類 (61-66) =====
  { symbol: '喜悅', category: '情緒', element: '火', luckyDigits: [2,7,12,17,22,27], avoidDigits: [4,14], meaning: '好運將至，心情舒暢', weight: 8 },
  { symbol: '哭泣', category: '情緒', element: '水', luckyDigits: [1,6,11,16,21,26], avoidDigits: [3,13], meaning: '情緒釋放，雨過天晴', weight: 5 },
  { symbol: '恐懼', category: '情緒', element: '水', luckyDigits: [1,6,11,16,21], avoidDigits: [8,18], meaning: '面對恐懼，勇者無懼', weight: 3 },
  { symbol: '憤怒', category: '情緒', element: '火', luckyDigits: [2,7,12,17], avoidDigits: [1,11], meaning: '能量爆發，需冷靜', weight: 3 },
  { symbol: '平靜', category: '情緒', element: '土', luckyDigits: [5,10,15,20,25,30], avoidDigits: [3,13], meaning: '心平氣和，最佳狀態', weight: 9 },
  { symbol: '驚訝', category: '情緒', element: '金', luckyDigits: [4,9,14,19,24], avoidDigits: [2,8], meaning: '意外驚喜，變化來臨', weight: 6 },

  // ===== 事件類 (67-76) =====
  { symbol: '結婚', category: '事件', element: '火', luckyDigits: [2,7,12,17,22,27], avoidDigits: [4,14], meaning: '喜慶圓滿，合作良機', weight: 9 },
  { symbol: '考試', category: '事件', element: '木', luckyDigits: [3,8,13,18,23,28], avoidDigits: [5,15], meaning: '考驗機會，實力展現', weight: 7 },
  { symbol: '考試', category: '事件', element: '木', luckyDigits: [3,8,13,18,23,28], avoidDigits: [5,15], meaning: '考驗機會，實力展現', weight: 7 },
  { symbol: '死亡', category: '事件', element: '水', luckyDigits: [1,6,11], avoidDigits: [8,18,28], meaning: '結束重生，放下轉化', weight: 2 },
  { symbol: '逃亡', category: '事件', element: '水', luckyDigits: [1,6,11,16], avoidDigits: [9,19], meaning: '逃避現實，需要面對', weight: 2 },
  { symbol: '追逐', category: '事件', element: '火', luckyDigits: [2,7,12,17,22], avoidDigits: [4,14], meaning: '目標明確，努力追求', weight: 6 },
  { symbol: '飛翔', category: '事件', element: '金', luckyDigits: [4,9,14,19,24,29], avoidDigits: [1,6], meaning: '自由突破，超越自我', weight: 9 },
  { symbol: '墜落', category: '事件', element: '水', luckyDigits: [1,6,11], avoidDigits: [8,18], meaning: '失去控制，需要警惕', weight: 2 },
  { symbol: '迷路', category: '事件', element: '水', luckyDigits: [1,6,11,16], avoidDigits: [3,13], meaning: '方向迷茫，需找指引', weight: 3 },
  { symbol: '遲到', category: '事件', element: '火', luckyDigits: [2,7,12], avoidDigits: [5,15], meaning: '時間壓力，趕緊把握', weight: 4 },
  { symbol: '懷孕', category: '事件', element: '木', luckyDigits: [3,8,13,18,23,28], avoidDigits: [6,16], meaning: '新生命新計畫，孕育希望', weight: 8 },

  // ===== 數字類 (77-82) =====
  { symbol: '數字0', category: '數字', element: '土', luckyDigits: [10,20,30], avoidDigits: [], meaning: '圓滿輪迴，無限可能', weight: 7 },
  { symbol: '數字1', category: '數字', element: '水', luckyDigits: [1,11,21,31], avoidDigits: [], meaning: '開始獨立，領導之數', weight: 8 },
  { symbol: '數字3', category: '數字', element: '木', luckyDigits: [3,13,23,33], avoidDigits: [], meaning: '生生不息，創造之數', weight: 8 },
  { symbol: '數字6', category: '數字', element: '水', luckyDigits: [6,16,26,36], avoidDigits: [], meaning: '順利和諧，財富之數', weight: 9 },
  { symbol: '數字7', category: '數字', element: '火', luckyDigits: [7,17,27,37], avoidDigits: [], meaning: '神秘靈性，幸運之數', weight: 8 },
  { symbol: '數字8', category: '數字', element: '土', luckyDigits: [8,18,28,38], avoidDigits: [], meaning: '發財興旺，富貴之數', weight: 10 },
  { symbol: '數字9', category: '數字', element: '金', luckyDigits: [9,19,29], avoidDigits: [], meaning: '長久圓滿，極致之數', weight: 9 },
  { symbol: '數字重複', category: '數字', element: '火', luckyDigits: [11,22,33], avoidDigits: [], meaning: '天使數字，宇宙訊息', weight: 9 },
];

// 情緒加權
export const EMOTION_WEIGHTS: Record<string, { multiplier: number; tailBoost: number[] }> = {
  '吉': { multiplier: 1.3, tailBoost: [3, 6, 8, 9] },
  '普通': { multiplier: 1.0, tailBoost: [1, 4, 7, 10] },
  '不安': { multiplier: 0.8, tailBoost: [2, 5, 12, 15] },
  '驚醒': { multiplier: 0.7, tailBoost: [1, 6, 11] },
};

// 解析夢境
export function parseDream(symbols: string[], emotion: string, dreamNumbers: number[], maxNum: number = 38): { luckyTails: number[]; avoidTails: number[]; suggestedNumbers: number[]; elementWeights: Record<string, number> } {
  const luckyTails: number[] = [];
  const avoidTails: number[] = [];
  const elementWeights: Record<string, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };

  symbols.forEach(s => {
    const sym = DREAM_SYMBOLS.find(ds => ds.symbol === s);
    if (sym) {
      luckyTails.push(...sym.luckyDigits);
      avoidTails.push(...sym.avoidDigits);
      elementWeights[sym.element] += sym.weight;
    }
  });

  // 情緒加權
  const emo = EMOTION_WEIGHTS[emotion] || EMOTION_WEIGHTS['普通'];
  emo.tailBoost.forEach(t => luckyTails.push(t));

  // 夢中數字
  dreamNumbers.forEach(n => luckyTails.push(n));

  // 去重並限制範圍
  const uniqueLucky = [...new Set(luckyTails)].filter(n => n >= 1 && n <= maxNum);
  const uniqueAvoid = [...new Set(avoidTails)].filter(n => n >= 1 && n <= maxNum);

  return { luckyTails: uniqueLucky, avoidTails: uniqueAvoid, suggestedNumbers: uniqueLucky.slice(0, 12), elementWeights };
}

// localStorage 管理（使用 userStorage 隔離）
import { userGetItem, userSetItem } from './userStorage';
const DREAM_STORAGE_KEY = 'lottery-dream-records-v10.5';

export function loadDreamRecords(): DreamRecord[] {
  try { return JSON.parse(userGetItem(DREAM_STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function saveDreamRecords(records: DreamRecord[]) {
  try { userSetItem(DREAM_STORAGE_KEY, JSON.stringify(records)); }
  catch { /* ignore */ }
}
