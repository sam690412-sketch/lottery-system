// ============================================================
// Batch 3d-2c — Auth Coverage & Snapshot Health 統計（純函式聚合）
// 由「實際蒐集到的 snapshot 樣本陣列」計算覆蓋率/健康度/分布。
// 不產生假數據：無樣本 → 回 sampleCount=0 並標記「待收集」。
// 不讀/寫 localStorage、不碰權限/付款。
// ============================================================
import type { BackendAuthSnapshot } from "@/utils/backendAuthSnapshot";
import { computeSnapshotHealth } from "@/utils/snapshotHealth";

export interface AuthCoverageStats {
  sampleCount: number;
  collected: boolean;        // 是否有任何樣本（false → 待收集）
  readyRate: number;         // ready===true 比例 0-1
  errorRate: number;         // error!==null 比例
  loadingRate: number;       // authLoading||vipLoading 比例
  backendRoleCoverage: number;   // backendRole 非空且非 'unknown' 比例
  backendIsVipCoverage: number;  // ready 且能判定 isVip 的比例（= readyRate 的子集）
  backendIsAdminCoverage: number;
  roleDistribution: Record<string, number>;   // role → count
  vipSourceDistribution: Record<string, number>;
  healthDistribution: Record<string, number>; // Healthy/Degraded/Loading → count
}

function emptyStats(): AuthCoverageStats {
  return {
    sampleCount: 0, collected: false,
    readyRate: 0, errorRate: 0, loadingRate: 0,
    backendRoleCoverage: 0, backendIsVipCoverage: 0, backendIsAdminCoverage: 0,
    roleDistribution: {}, vipSourceDistribution: {}, healthDistribution: {},
  };
}

/**
 * 聚合 snapshot 樣本。samples 必須是「真實蒐集」的資料。
 * 無樣本 → collected=false（待收集），所有比率為 0（非捏造）。
 */
export function computeAuthCoverage(samples: BackendAuthSnapshot[]): AuthCoverageStats {
  const n = samples.length;
  if (n === 0) return emptyStats();

  const s = emptyStats();
  s.sampleCount = n;
  s.collected = true;

  let ready = 0, error = 0, loading = 0, roleCov = 0, vipCov = 0, adminCov = 0;
  for (const snap of samples) {
    if (snap.ready === true) ready++;
    if (snap.error !== null) error++;
    if (snap.authLoading || snap.vipLoading) loading++;
    if (snap.backendRole && snap.backendRole !== "unknown") roleCov++;
    if (snap.ready === true && snap.error === null) vipCov++; // 能可靠判定 isVip 的樣本
    if (snap.ready === true && snap.error === null) adminCov++;

    const role = snap.backendRole || "unknown";
    s.roleDistribution[role] = (s.roleDistribution[role] || 0) + 1;
    const vs = snap.vipSource || "unknown";
    s.vipSourceDistribution[vs] = (s.vipSourceDistribution[vs] || 0) + 1;
    const health = computeSnapshotHealth(snap).status;
    s.healthDistribution[health] = (s.healthDistribution[health] || 0) + 1;
  }

  s.readyRate = ready / n;
  s.errorRate = error / n;
  s.loadingRate = loading / n;
  s.backendRoleCoverage = roleCov / n;
  s.backendIsVipCoverage = vipCov / n;
  s.backendIsAdminCoverage = adminCov / n;
  return s;
}

/** 灰度放行門檻判定（依真實樣本）。無樣本 → 不可放行。 */
export function coverageGateDecision(stats: AuthCoverageStats, threshold = 0.98): {
  canGray: boolean;
  reason: string;
} {
  if (!stats.collected) return { canGray: false, reason: "no_samples_collected" };
  if (stats.readyRate < threshold) return { canGray: false, reason: `ready_rate_below_${threshold}` };
  if (stats.errorRate > 1 - threshold) return { canGray: false, reason: "error_rate_too_high" };
  return { canGray: true, reason: "coverage_ok" };
}
