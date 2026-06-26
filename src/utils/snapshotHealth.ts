// ============================================================
// Batch 3d-2b (T04l-4) — BackendAuthSnapshot 健康/觀察統計（純函式）
// 僅供顯示與觀察；不參與任何 gating。可離線測試。
// ============================================================

import type { BackendAuthSnapshot } from "@/utils/backendAuthSnapshot";

export interface SnapshotHealth {
  snapshotAgeSeconds: number | null; // 距 checkedAt 的秒數；無 checkedAt → null
  snapshotHealthy: boolean;          // ready && error===null && checkedAt 存在
  status: "Healthy" | "Degraded" | "Loading";
  roleSource: "Backend";
  vipSource: "subscription" | "payment_pending" | "none" | "unknown";
}

/**
 * 由 snapshot 計算健康/觀察資訊（純函式）。
 * @param snap 後端權威快照
 * @param now 目前時間（ms），預設 Date.now()
 */
export function computeSnapshotHealth(
  snap: BackendAuthSnapshot,
  now: number = Date.now(),
): SnapshotHealth {
  const checkedMs = snap.checkedAt ? new Date(snap.checkedAt).getTime() : null;
  const snapshotAgeSeconds =
    checkedMs !== null && !Number.isNaN(checkedMs)
      ? Math.max(0, Math.floor((now - checkedMs) / 1000))
      : null;

  const snapshotHealthy =
    snap.ready === true && snap.error === null && !!snap.checkedAt;

  let status: SnapshotHealth["status"];
  if (!snap.ready || snap.authLoading || snap.vipLoading) {
    status = "Loading";
  } else if (snap.error !== null) {
    status = "Degraded";
  } else {
    status = snapshotHealthy ? "Healthy" : "Degraded";
  }

  return {
    snapshotAgeSeconds,
    snapshotHealthy,
    status,
    roleSource: "Backend",
    vipSource: snap.vipSource,
  };
}
