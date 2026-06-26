// ============================================================
// Batch 3d-1 (T04l-2) — BackendAuthSnapshot
// 後端權威的同步可讀快照載體。由 AuthProvider 注入；本版「只填，不被 gating 消費」。
// 鐵則：不 import permissions/auth；不讀/寫 localStorage；error/未 ready → 非 VIP/非 admin。
// ============================================================

export type Role = "guest" | "free" | "vip" | "tester" | "admin";

export interface BackendAuthSnapshot {
  ready: boolean;
  authenticated: boolean;
  backendRole: Role;
  backendIsAdmin: boolean;
  backendIsTester: boolean;
  backendIsVip: boolean;
  vipSource: "subscription" | "payment_pending" | "none" | "unknown";
  vipPlan?: string;
  vipExpiresAt?: string;
  authLoading: boolean;
  vipLoading: boolean;
  error: string | null;
  checkedAt: string | null;
}

export const DEFAULT_BACKEND_AUTH_SNAPSHOT: BackendAuthSnapshot = {
  ready: false,
  authenticated: false,
  backendRole: "guest",
  backendIsAdmin: false,
  backendIsTester: false,
  backendIsVip: false,
  vipSource: "unknown",
  authLoading: true,
  vipLoading: false,
  error: null,
  checkedAt: null,
};

// 模組級單例（同步可讀）+ 觀察者
let current: BackendAuthSnapshot = { ...DEFAULT_BACKEND_AUTH_SNAPSHOT };
const listeners = new Set<() => void>();

/** 同步讀取當前快照。 */
export function getBackendAuthSnapshot(): BackendAuthSnapshot {
  return current;
}

/** 設定快照（完整或 patch）。設定後通知 subscriber。 */
export function setBackendAuthSnapshot(
  next: BackendAuthSnapshot | Partial<BackendAuthSnapshot>,
): void {
  current = { ...current, ...next };
  listeners.forEach((l) => l());
}

/** 重置回 DEFAULT（logout/重置）。 */
export function clearBackendAuthSnapshot(): void {
  current = { ...DEFAULT_BACKEND_AUTH_SNAPSHOT };
  listeners.forEach((l) => l());
}

/** 訂閱變更，回傳 unsubscribe。 */
export function subscribeBackendAuthSnapshot(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface DeriveInput {
  authLoading: boolean;
  authenticated: boolean;
  role: Role;
  authError?: string | null;
  vipEnabled: boolean; // 是否會查 VIP（= authenticated）
  vipLoading: boolean;
  vipError: boolean;
  vipIsVip?: boolean;
  vipSource?: "subscription" | "payment" | "payment_pending" | "none";
  vipPlan?: string;
  vipExpiresAt?: string;
  vipCheckedAt?: string;
}

/**
 * 純函式：由 useAuth + getMyVipAuthority 狀態衍生快照。
 * 安全規則：error / 未 ready → backendIsVip=false、backendIsAdmin=false。不讀 localStorage。
 */
export function deriveBackendAuthSnapshot(input: DeriveInput): BackendAuthSnapshot {
  // 1) auth 仍載入中 → 尚未 ready
  if (input.authLoading) {
    return {
      ...DEFAULT_BACKEND_AUTH_SNAPSHOT,
      ready: false,
      authLoading: true,
      error: input.authError ?? null,
    };
  }

  // 2) 未登入 → ready，但一律非 VIP/非 admin
  if (!input.authenticated) {
    return {
      ready: true,
      authenticated: false,
      backendRole: "guest",
      backendIsAdmin: false,
      backendIsTester: false,
      backendIsVip: false,
      vipSource: "none",
      authLoading: false,
      vipLoading: false,
      error: input.authError ?? null,
      checkedAt: input.vipCheckedAt ?? null,
    };
  }

  // 已登入：admin/tester 由後端 role 決定（與 VIP 查詢無關）
  const backendIsAdmin = input.role === "admin";
  const backendIsTester = input.role === "tester";

  // 3) VIP 查詢仍載入中 → 尚未 ready（不解鎖）
  if (input.vipEnabled && input.vipLoading) {
    return {
      ready: false,
      authenticated: true,
      backendRole: input.role,
      backendIsAdmin,
      backendIsTester,
      backendIsVip: false,
      vipSource: "unknown",
      authLoading: false,
      vipLoading: true,
      error: input.authError ?? null,
      checkedAt: null,
    };
  }

  // 7) VIP 查詢錯誤 → 安全降級（非 VIP），但 admin/tester 仍依 role
  if (input.vipEnabled && input.vipError) {
    return {
      ready: true,
      authenticated: true,
      backendRole: input.role,
      backendIsAdmin,
      backendIsTester,
      backendIsVip: false,
      vipSource: "unknown",
      authLoading: false,
      vipLoading: false,
      error: "vip_query_failed",
      checkedAt: input.vipCheckedAt ?? null,
    };
  }

  // 4/5/6) 有 VIP 結果
  const isVip = input.vipIsVip === true;
  const src = (input.vipSource ?? "none") as BackendAuthSnapshot["vipSource"];
  return {
    ready: true,
    authenticated: true,
    backendRole: input.role,
    backendIsAdmin,
    backendIsTester,
    backendIsVip: isVip,
    vipSource: src === "payment" ? "payment_pending" : src,
    vipPlan: input.vipPlan,
    vipExpiresAt: input.vipExpiresAt,
    authLoading: false,
    vipLoading: false,
    error: input.authError ?? null,
    checkedAt: input.vipCheckedAt ?? null,
  };
}
