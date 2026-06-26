// ============================================================
// Batch 3d-2d — Auth snapshot 樣本收集器（僅記憶體）
// 收集真實 snapshot 樣本供 authCoverage 聚合。
// 鐵則：不寫 localStorage、不寫 DB、不送 API；不參與任何 gating。
// ============================================================
import type { BackendAuthSnapshot } from "@/utils/backendAuthSnapshot";
import { computeAuthCoverage, coverageGateDecision, type AuthCoverageStats } from "@/utils/authCoverage";

const MAX_SAMPLES = 500;
// 僅記憶體陣列（模組級）；頁面重新整理即清空。不持久化。
let samples: BackendAuthSnapshot[] = [];

/** 記錄一筆 snapshot 樣本（只在記憶體；超過 500 筆丟最舊）。 */
export function recordAuthSnapshotSample(snapshot: BackendAuthSnapshot): void {
  // 只收集「已 ready 或有意義」的樣本；loading 中也記錄以計 loadingRate。
  samples.push(snapshot);
  if (samples.length > MAX_SAMPLES) {
    samples = samples.slice(samples.length - MAX_SAMPLES);
  }
}

/** 取得目前樣本（複本，避免外部變更）。 */
export function getAuthCoverageSamples(): BackendAuthSnapshot[] {
  return samples.slice();
}

/** 清空樣本。 */
export function clearAuthCoverageSamples(): void {
  samples = [];
}

/** 取得聚合統計（沿用 3d-2c authCoverage）。 */
export function getAuthCoverageStats(): AuthCoverageStats {
  return computeAuthCoverage(samples);
}

/** 取得灰度門檻判定（沿用 3d-2c）。 */
export function getAuthCoverageGate(threshold = 0.98) {
  return coverageGateDecision(getAuthCoverageStats(), threshold);
}

/** 測試/觀察用：目前樣本數。 */
export function getAuthCoverageSampleCount(): number {
  return samples.length;
}
