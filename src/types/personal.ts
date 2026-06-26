// ============================================================
// 會員個人化選號系統 - 類型定義
// ============================================================

export type SourceType = 'birthday' | 'license' | 'phone' | 'anniversary' | 'dream' | 'lucky';

export interface PersonalSource {
  id: string;
  type: SourceType;
  name: string;
  enabled: boolean;
  importance: 1 | 2 | 3 | 4 | 5;
  createdAt?: string;
}

export interface BirthdaySource extends PersonalSource {
  type: 'birthday';
  relation: string;
  date: string;
  note: string;
}

export interface LicenseSource extends PersonalSource {
  type: 'license';
  licensePlate: string;
  ownerName: string;
  note: string;
}

export interface PhoneSource extends PersonalSource {
  type: 'phone';
  last4: string;
  userName: string;
  note: string;
}

export interface AnniversarySource extends PersonalSource {
  type: 'anniversary';
  eventName: string;
  date: string;
  importance: 1 | 2 | 3 | 4 | 5;
  note: string;
}

export interface DreamSource extends PersonalSource {
  type: 'dream';
  description: string;
  date: string;
  emotion: '吉' | '普通' | '不安';
  mainSymbol: string;
}

export interface LuckySource extends PersonalSource {
  type: 'lucky';
  number: number;
  reason: string;
  isCore: boolean;
}

export type AnyPersonalSource = BirthdaySource | LicenseSource | PhoneSource | AnniversarySource | DreamSource | LuckySource;

export interface PersonalNumberEntry {
  number: number;
  sources: { sourceId: string; sourceName: string; sourceType: SourceType; reason: string; weight: number }[];
  totalWeight: number;
}

export interface PersonalPool {
  entries: PersonalNumberEntry[];
  numbers: number[];
  bySource: Record<string, number[]>;
  overlapsWithUser: number[];
}

export interface PersonalConfig {
  sources: AnyPersonalSource[];
}

export type StrategyV6 = '保守' | '平衡' | '進取' | '夢境強化' | '卦象強化' | '純統計';

export interface StrategyWeights {
  stats: number;
  structure: number;
  personal: number;
  userKeep: number;
  hexagram: number;
  dream: number;
}

export const STRATEGY_PRESETS: Record<StrategyV6, StrategyWeights> = {
  '保守':     { stats: 40, structure: 20, personal: 15, userKeep: 15, hexagram: 5,  dream: 5 },
  '平衡':     { stats: 35, structure: 20, personal: 18, userKeep: 12, hexagram: 8,  dream: 7 },
  '進取':     { stats: 45, structure: 20, personal: 10, userKeep: 10, hexagram: 10, dream: 5 },
  '夢境強化': { stats: 30, structure: 20, personal: 15, userKeep: 10, hexagram: 5,  dream: 20 },
  '卦象強化': { stats: 30, structure: 20, personal: 10, userKeep: 10, hexagram: 20, dream: 10 },
  '純統計':   { stats: 60, structure: 25, personal: 0,  userKeep: 15, hexagram: 0,  dream: 0 },
};
