// ============================================================
// V16-5 — Builder 最終結果（只依 currentNumberPool 權重排序產生；不重寫 AI、不接 backtest）
// 不呼叫付款/權限/資料庫。confidenceScore 為「展示用」，不代表中獎率。
// ============================================================
import { getConfig, type LotteryType } from '@/utils/lotteryConfig';
import type { BaseNumberPool } from '@/utils/builderStats';

export interface AppliedSources {
  statistics: boolean;
  dream: boolean;
  birthday: boolean;
  metaphysics: boolean;
}

export interface SourceWeight {
  label: string;
  pct: number;
}

export interface NumberExplanation {
  num: number;
  reasons: string[];
}

export interface FinalBuilderResult {
  mainNumbers: number[];
  specialNumber?: number;
  backupNumbers: number[];
  confidenceScore: number;        // 展示用（0-100），非中獎率
  confidenceNote: string;
  sourceWeights: SourceWeight[];
  explanation: NumberExplanation[];
  topReasons: string[];
  summary: string;
}

export interface FusionInput {
  lotteryType: LotteryType;
  currentNumberPool: BaseNumberPool;
  appliedSources: AppliedSources;
}

/**
 * 由 currentNumberPool 權重排序產生最終結果。
 * 純排序/挑選；不重寫任何分析演算法、不呼叫 AI/backtest/付款/權限。
 */
export function buildFinalBuilderResult(input: FusionInput): FinalBuilderResult {
  const { lotteryType, currentNumberPool, appliedSources } = input;
  const cfg = getConfig(lotteryType);
  const mainCount = cfg.mainCount;

  // 依權重降序（穩定：權重相同以號碼小者優先）
  const sorted = [...currentNumberPool.entries].sort((a, b) => b.weight - a.weight || a.num - b.num);

  const mainNumbers = sorted.slice(0, mainCount).map((e) => e.num).sort((a, b) => a - b);

  // 特別號：取未進主號的最高權重者；fallback 用範圍內安全值
  let specialNumber: number | undefined;
  if (cfg.hasSpecial) {
    const rest = sorted.filter((e) => !mainNumbers.includes(e.num));
    const cand = rest.find((e) => e.num >= cfg.specialMin && e.num <= cfg.specialMax);
    specialNumber = cand ? cand.num : cfg.specialMin;
  }

  // 備用號碼：下一批高權重（排除主號與特別號）
  const usedSet = new Set<number>([...mainNumbers, ...(specialNumber != null ? [specialNumber] : [])]);
  const backupNumbers = sorted.filter((e) => !usedSet.has(e.num)).slice(0, mainCount).map((e) => e.num).sort((a, b) => a - b);

  // 來源權重（顯示用，沿用既有規則）
  const sourceWeights: SourceWeight[] = [
    { label: '統計', pct: appliedSources.statistics ? 30 : 0 },
    { label: '夢境', pct: appliedSources.dream ? 15 : 0 },
    { label: '生日', pct: appliedSources.birthday ? 15 : 0 },
    { label: '命理', pct: appliedSources.metaphysics ? 15 : 0 },
    { label: 'AI 融合', pct: 0 }, // 本版不接真正 AI 模型
  ];

  // 展示用信心分數：來源完整度 + 權重集中度（非中獎率）
  const activeSources = [appliedSources.statistics, appliedSources.dream, appliedSources.birthday, appliedSources.metaphysics].filter(Boolean).length;
  const completeness = activeSources / 4; // 0-1
  const topWeights = sorted.slice(0, mainCount).reduce((s, e) => s + Math.max(0, e.weight), 0);
  const allWeights = sorted.reduce((s, e) => s + Math.max(0, e.weight), 0) || 1;
  const concentration = Math.min(1, topWeights / allWeights); // 0-1
  const confidenceScore = Math.round((completeness * 0.5 + concentration * 0.5) * 100);
  const confidenceNote = '此為展示用信心分數（依分析來源完整度與權重集中度計算），不代表中獎率。';

  // 形成原因（取主號 + 特別號的既有 reasons）
  const explainNums = [...mainNumbers, ...(specialNumber != null ? [specialNumber] : [])];
  const explanation: NumberExplanation[] = explainNums.map((n) => {
    const e = currentNumberPool.entries.find((x) => x.num === n);
    return { num: n, reasons: e ? [...new Set(e.reasons)] : [] };
  });

  // top reasons（彙整出現最多的原因）
  const reasonCount = new Map<string, number>();
  currentNumberPool.entries.forEach((e) => e.reasons.forEach((r) => reasonCount.set(r, (reasonCount.get(r) || 0) + 1)));
  const topReasons = [...reasonCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([r]) => r);

  const onlyStats = appliedSources.statistics && !appliedSources.dream && !appliedSources.birthday && !appliedSources.metaphysics;
  const summary = onlyStats
    ? '目前結果主要來自基礎統計分析。你也可以返回加入夢境、生日或命理，讓號碼更有個人感。'
    : '這組號碼是依照你前面加入的統計、夢境、生日與命理分析整合而成。';

  return { mainNumbers, specialNumber, backupNumbers, confidenceScore, confidenceNote, sourceWeights, explanation, topReasons, summary };
}
