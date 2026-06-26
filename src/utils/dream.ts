// ============================================================
// 夢境符號引擎
// ============================================================

export interface DreamSymbol {
  symbol: string;
  element: '金' | '木' | '水' | '火' | '土';
  numbers: number[];
  luckyTails: number[];
  avoidTails: number[];
}

export const DREAM_SYMBOLS: DreamSymbol[] = [
  { symbol: '蛇', element: '火', numbers: [3, 6, 9, 13, 18, 27, 36], luckyTails: [3, 6, 9], avoidTails: [1, 5] },
  { symbol: '龍', element: '土', numbers: [1, 5, 8, 16, 21, 28, 35], luckyTails: [1, 5, 8], avoidTails: [4, 7] },
  { symbol: '鳳凰', element: '火', numbers: [2, 7, 12, 19, 22, 29, 33], luckyTails: [2, 7, 9], avoidTails: [3, 8] },
  { symbol: '虎', element: '木', numbers: [4, 10, 14, 20, 23, 30, 34], luckyTails: [4, 0], avoidTails: [2, 7] },
  { symbol: '魚', element: '水', numbers: [1, 6, 11, 17, 24, 26, 31], luckyTails: [1, 6], avoidTails: [5, 0] },
  { symbol: '水', element: '水', numbers: [1, 6, 11, 16, 21, 26, 31, 36], luckyTails: [1, 6], avoidTails: [5, 0] },
  { symbol: '火', element: '火', numbers: [2, 7, 12, 17, 22, 27, 32, 37], luckyTails: [2, 7], avoidTails: [1, 6] },
  { symbol: '山', element: '土', numbers: [5, 10, 15, 20, 25, 30, 35], luckyTails: [5, 0], avoidTails: [3, 8] },
  { symbol: '路', element: '土', numbers: [1, 4, 7, 10, 13, 16, 19, 22], luckyTails: [1, 4, 7], avoidTails: [] },
  { symbol: '錢', element: '金', numbers: [8, 18, 28, 38, 6, 16, 26], luckyTails: [6, 8], avoidTails: [4, 9] },
  { symbol: '花', element: '木', numbers: [3, 9, 15, 21, 27, 33], luckyTails: [3, 9], avoidTails: [7] },
  { symbol: '雨', element: '水', numbers: [1, 4, 7, 11, 14, 17], luckyTails: [1, 4, 7], avoidTails: [5] },
  { symbol: '樹', element: '木', numbers: [3, 8, 13, 18, 23, 28, 33, 38], luckyTails: [3, 8], avoidTails: [4, 9] },
  { symbol: '房子', element: '土', numbers: [1, 5, 10, 15, 20, 25, 30], luckyTails: [0, 5], avoidTails: [2] },
  { symbol: '飛', element: '金', numbers: [7, 14, 21, 28, 35], luckyTails: [7, 4], avoidTails: [0] },
  { symbol: '跑', element: '火', numbers: [2, 5, 8, 11, 14], luckyTails: [2, 5, 8], avoidTails: [] },
  { symbol: '人', element: '土', numbers: [1, 2, 3, 4, 5], luckyTails: [1, 2, 3], avoidTails: [] },
  { symbol: '光', element: '火', numbers: [1, 8, 11, 18, 21, 28], luckyTails: [1, 8], avoidTails: [4] },
  { symbol: '雲', element: '水', numbers: [2, 6, 12, 16, 22, 26, 32, 36], luckyTails: [2, 6], avoidTails: [5] },
  { symbol: '海', element: '水', numbers: [1, 6, 11, 16, 21, 26, 31, 36], luckyTails: [1, 6], avoidTails: [5] },
];

export const POPULAR_DREAM_SYMBOLS = DREAM_SYMBOLS.map(s => s.symbol);

export function findDreamSymbol(name: string): DreamSymbol | undefined {
  return DREAM_SYMBOLS.find(s => s.symbol === name);
}
