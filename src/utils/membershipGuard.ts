// ============================================================
// Batch 3d-5b — membership VIP 判定後端化（純函式）
// isVip/isAdmin/isTester 可灰度讀 BackendAuthSnapshot。flag 預設 localStorage（行為不變）。
// 鐵則：backend 模式不 fallback localStorage；error/未 ready/payment_pending/fake → 全 false。
// ============================================================
import type { BackendAuthSnapshot } from "@/utils/backendAuthSnapshot";

export type MembershipGuardSource = "backend" | "localStorage";

/** 灰度來源。僅接受 backend/localStorage，預設 localStorage。 */
export function getMembershipGuardSource(
  env: { VITE_MEMBERSHIP_GUARD_SOURCE?: string } = (import.meta as any).env ?? {},
): MembershipGuardSource {
  return env?.VITE_MEMBERSHIP_GUARD_SOURCE === "backend" ? "backend" : "localStorage";
}

export interface MembershipFlags {
  isVip: boolean;
  isVipByRole: boolean;
  isAdmin: boolean;
  isTester: boolean;
  source: MembershipGuardSource;
  reason: string;
}

export interface MembershipInput {
  source: MembershipGuardSource;
  localRole?: string;
  localSubscription?: { status?: string; expiresAt?: string | Date } | null;
  snapshot?: BackendAuthSnapshot | null;
}

const NONE = { isVip: false, isVipByRole: false, isAdmin: false, isTester: false };

/**
 * 計算會員旗標。
 * localStorage 模式：維持現有行為（isVip 含訂閱；isVipByRole 純 role：vip/admin/tester）。
 * backend 模式：只看 snapshot；error/未 ready/缺 snapshot/payment_pending/fake → 全 false。
 */
export function computeMembershipFlags(input: MembershipInput): MembershipFlags {
  if (input.source === "backend") {
    const s = input.snapshot;
    if (!s) return { ...NONE, source: "backend", reason: "no_snapshot" };
    if (s.ready !== true) return { ...NONE, source: "backend", reason: "not_ready" };
    if (s.error !== null) return { ...NONE, source: "backend", reason: "backend_error" }; // 不 fallback localStorage
    const isAdmin = s.backendRole === "admin";
    const isTester = s.backendRole === "tester";
    const isVipByRole = s.backendIsVip === true || isAdmin || isTester;
    const isVip = isVipByRole;
    // payment_pending / free / guest / fake localStorage → backendIsVip 必為 false → 全 false（除非 admin/tester）
    return { isVip, isVipByRole, isAdmin, isTester, source: "backend", reason: s.vipSource ?? "backend" };
  }

  // localStorage 模式（維持現況）
  const role = input.localRole;
  const isAdmin = role === "admin";
  const isTester = role === "tester";
  const isVipByRole = isAdmin || isTester || role === "vip";
  let isVip = isVipByRole;
  if (!isVip && input.localSubscription) {
    const sub = input.localSubscription;
    const expires = sub.expiresAt ? new Date(sub.expiresAt).getTime() : 0;
    if (sub.status === "active" && expires > Date.now()) isVip = true;
  }
  return { isVip, isVipByRole, isAdmin, isTester, source: "localStorage", reason: "localStorage" };
}
