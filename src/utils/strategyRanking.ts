// ============================================================
// V16 AI策略排行榜聚合引擎 - strategyRanking.ts
// 純讀取 V15.1 驗證數據，實時聚合
// ============================================================

import { loadStrategyDataRaw } from '@/repositories/businessDataStorage';

export interface RankingParams {
  userId: string;
  days: 7 | 30 | 90;
  sortBy: 'hitRate' | 'roi' | 'winCount' | 'avgMatchCount';
}

export interface StrategyRanking {
  rank: number;
  strategyId: string;
  strategyName: string;
  icon: string;
  color: string;
  hitRate: number;
  roi: number;
  winCount: number;
  totalCount: number;
  avgMatchCount: number;
  prizeDistribution: Record<string, number>;
  totalCost: number;
  totalPrize: number;
  maxConsecutiveHits: number;
  maxConsecutiveMisses: number;
  bestSingleResult?: { date: string; matchMain: number; prize: string; prizeAmount: number };
}

const STRATEGY_META: Record<string, { name: string; icon: string; color: string }> = {
  conservative: { name: '保守組', icon: '🛡️', color: 'text-blue-400' },
  balanced:     { name: '平衡組', icon: '⚖️', color: 'text-green-400' },
  aggressive:   { name: '爆發組', icon: '🔥', color: 'text-red-400' },
  dream:        { name: '夢境組', icon: '🌙', color: 'text-purple-400' },
  meta:         { name: '命理組', icon: '☯️', color: 'text-amber-400' },
  manual:       { name: '手動產號', icon: '✏️', color: 'text-gray-400' },
};

function calcStreaks(results: { matchMain: number; matchSpecial: boolean }[]): { maxHits: number; maxMisses: number } {
  let maxHits = 0, maxMisses = 0, curHits = 0, curMisses = 0;
  for (const v of results) {
    if (v.matchMain > 0 || v.matchSpecial) {
      curHits++; curMisses = 0; maxHits = Math.max(maxHits, curHits);
    } else {
      curMisses++; curHits = 0; maxMisses = Math.max(maxMisses, curMisses);
    }
  }
  return { maxHits, maxMisses };
}

/** 生成策略排行榜（純實時聚合，不存儲） */
export function generateStrategyRanking(params: RankingParams): StrategyRanking[] {
  // 讀取 V15.1 數據源
  const recKey = `lottery-recommend-records:${params.userId}`;
  const vrfKey = `lottery-verify-results:${params.userId}`;
  
  let records: any[] = [];
  let results: any[] = [];
  
  try {
    const r = loadStrategyDataRaw(recKey);
    if (r) records = JSON.parse(r);
  } catch { /* ignore */ }
  
  try {
    const v = loadStrategyDataRaw(vrfKey);
    if (v) results = JSON.parse(v);
  } catch { /* ignore */ }
  
  if (results.length === 0) return [];
  
  // 時間窗口過濾
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - params.days);
  const filteredResults = results.filter((v: any) => new Date(v.drawDate || v.verifiedAt) >= cutoff);
  
  if (filteredResults.length === 0) return [];
  
  // 按 comboId 分組
  const groups: Record<string, any[]> = {};
  for (const v of filteredResults) {
    const rec = records.find((r: any) => r.id === v.recommendId);
    const sid = rec?.comboId || 'manual';
    (groups[sid] ||= []).push(v);
  }
  
  // 計算各策略指標
  const rankings: StrategyRanking[] = [];
  for (const [sid, group] of Object.entries(groups)) {
    const total = group.length;
    if (total === 0) continue;
    
    const hitCount = group.filter((v: any) => v.matchMain > 0 || v.matchSpecial).length;
    const winCount = group.filter((v: any) => v.prize && v.prize !== 'none').length;
    const totalPrize = group.reduce((s: number, v: any) => s + (v.prizeAmount || 0), 0);
    const totalCost = group.reduce((s: number, v: any) => s + (v.cost || 0), 0);
    const totalMatch = group.reduce((s: number, v: any) => s + (v.matchMain || 0), 0);
    
    const { maxHits, maxMisses } = calcStreaks(group);
    
    const best = group.reduce((best: any, v: any) =>
      (v.prizeAmount || 0) > (best?.prizeAmount || 0) ? v : best, group[0]);
    
    const meta = STRATEGY_META[sid] || STRATEGY_META.manual;
    
    rankings.push({
      rank: 0,
      strategyId: sid,
      strategyName: meta.name,
      icon: meta.icon,
      color: meta.color,
      hitRate: total > 0 ? Math.round((hitCount / total) * 1000) / 10 : 0,
      roi: totalCost > 0 ? Math.round(((totalPrize - totalCost) / totalCost) * 1000) / 10 : 0,
      winCount,
      totalCount: total,
      avgMatchCount: total > 0 ? Math.round((totalMatch / total) * 100) / 100 : 0,
      prizeDistribution: group.reduce((dist: Record<string, number>, v: any) => {
        const p = v.prize || 'none';
        dist[p] = (dist[p] || 0) + 1;
        return dist;
      }, {} as Record<string, number>),
      totalCost,
      totalPrize,
      maxConsecutiveHits: maxHits,
      maxConsecutiveMisses: maxMisses,
      bestSingleResult: best ? {
        date: best.drawDate || best.verifiedAt?.split('T')[0] || '',
        matchMain: best.matchMain || 0,
        prize: best.prize || 'none',
        prizeAmount: best.prizeAmount || 0,
      } : undefined,
    });
  }
  
  // 排序
  rankings.sort((a, b) => {
    switch (params.sortBy) {
      case 'hitRate': return b.hitRate - a.hitRate;
      case 'roi': return b.roi - a.roi;
      case 'winCount': return b.winCount - a.winCount;
      case 'avgMatchCount': return b.avgMatchCount - a.avgMatchCount;
      default: return b.hitRate - a.hitRate;
    }
  });
  
  rankings.forEach((r, i) => { r.rank = i + 1; });
  return rankings;
}

/** 獲取當前用戶ID */
export function getCurrentUserId(): string {
  try {
    const session = loadStrategyDataRaw('lottery-v13-session');
    if (session) {
      const s = JSON.parse(session);
      return s.userId || 'guest';
    }
  } catch { /* ignore */ }
  return 'guest';
}
