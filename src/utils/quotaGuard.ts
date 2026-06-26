// ============================================================
// Batch 3d-5 (T04…) — quota 後端化（純函式）
// 每日產號額度可灰度讀 BackendAuthSnapshot。flag 預設 localStorage（行為不變）。
// 鐵則：backend 模式不 fallback localStorage；error/未 ready/payment_pending → 10。
// ============================================================
import type { BackendAuthSnapshot } from "@/utils/backendAuthSnapshot";

export type QuotaGuardSource = "backend" | "localStorage";

export const VIP_DAILY_LIMIT = 999;
export const FREE_DAILY_LIMIT = 10;

/** 灰度來源。僅接受 backend/localStorage，預設 localStorage。 */
export function getQuotaGuardSource(
  env: { VITE_QUOTA_GUARD_SOURCE?: string } = (import.meta as any).env ?? {},
): QuotaGuardSource {
  return env?.VITE_QUOTA_GUARD_SOURCE === "backend" ? "backend" : "localStorage";
}

export interface QuotaInput {
  source: QuotaGuardSource;
  localRole?: string;
  snapshot?: BackendAuthSnapshot | null;
}

/**
 * 計算每日產號上限。
 * localStorage 模式：維持現況（vip/admin/tester → 999，其餘 10）。
 * backend 模式：只看 snapshot；error/未 ready/缺 snapshot/payment_pending/fake → 10。
 */
export function computeGenerationLimit(input: QuotaInput): number {
  if (input.source === "backend") {
    const s = input.snapshot;
    if (!s) return FREE_DAILY_LIMIT;
    if (s.ready !== true) return FREE_DAILY_LIMIT;
    if (s.error !== null) return FREE_DAILY_LIMIT; // 不 fallback localStorage
    if (s.backendIsVip === true) return VIP_DAILY_LIMIT;
    if (s.backendRole === "admin") return VIP_DAILY_LIMIT;
    if (s.backendRole === "tester") return VIP_DAILY_LIMIT;
    // payment_pending / free / guest / fake localStorage vip → free
    return FREE_DAILY_LIMIT;
  }

  // localStorage 模式（維持現況）
  const r = input.localRole;
  if (r === "vip" || r === "admin" || r === "tester") return VIP_DAILY_LIMIT;
  return FREE_DAILY_LIMIT;
}
