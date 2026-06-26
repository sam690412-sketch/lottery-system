// ============================================================
// 威力彩13層選號漏斗 - 類型定義
// ============================================================

/** 卦象類型 */
export interface Hexagram {
  name: string;
  symbol: string;
  element: '金' | '木' | '水' | '火' | '土';
  nature: string;
  yao: number[]; // 陽=1, 陰=0 (從下到上)
}

/** 五種卦象結果 */
export interface HexagramSet {
  timeHex: HexagramResult;
  plumHex: HexagramResult;
  sixYao: SixYaoResult;
  fiveElements: FiveElementsResult;
  userHex: UserHexResult;
}

export interface HexagramResult {
  name: string;
  mainHex: string;
  huHex: string;
  bianHex: string;
  element: string;
  advice: string;
}

export interface SixYaoResult {
  yaoList: number[];
  advice: string;
  tendency: '偏大' | '偏小' | '均衡';
  oddEven: '偏奇' | '偏偶' | '均衡';
}

export interface FiveElementsResult {
  weights: Record<string, number[]>;
  dominant: string;
  luckyTails: number[];
  avoidTails: number[];
}

export interface UserHexResult {
  keep: number[];
  replace: number[];
  advice: string;
}

/** 號碼評分 */
export interface NumberScore {
  number: number;
  total: number;
  grade: 'A' | 'B' | 'C' | 'D';
  layers: Record<string, number>;
  sourceScores?: Record<string, number>;
  isRecommended: boolean;
  isUserNumber: boolean;
}

/** 推薦組合 */
export interface Combination {
  id: string;
  name: string;
  zone1: number[];
  zone2: number;
  score: number;
  reason: string;
  riskWarning: string;
  style: '保守' | '平衡' | '進取';
}

/** 追蹤結果 */
export interface TrackResult {
  date: string;
  combinationId: string;
  comboName: string;
  myZone1: number[];
  myZone2: number;
  drawZone1: number[];
  drawZone2: number;
  matchCount: number;
  matchZone2: boolean;
  prize: string;
  prizeAmount: number;
  cost: number;
}

/** 應用狀態 */
export interface AppState {
  userZone1: number[];
  userZone2: number;
  date: string;
  time: string;
  enableHexagram: boolean;
  strategy: string;
  comboCount: 2 | 3;
  scores: NumberScore[];
  hexagrams: HexagramSet | null;
  combinations: Combination[];
  trackResults: TrackResult[];
}

// Re-export from personal types for components
export type { PersonalPool } from './types/personal';

/** 歷史開獎數據 */
export interface DrawRecord {
  date: string;
  period: number;
  zone1: number[];
  zone2: number;
}
