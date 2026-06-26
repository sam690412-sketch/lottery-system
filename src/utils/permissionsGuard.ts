// ============================================================
// Batch 3d-6a — permissions 匯流點後端模式骨架（純函式）
// 不讀/寫 localStorage、不 import auth/membershipState；只讀 snapshot 入參。
// flag 預設 localStorage。鐵則：error/未 ready/未登入 → guest；backend 不 fallback localStorage。
// ============================================================
import type { BackendAuthSnapshot } from "@/utils/backendAuthSnapshot";

export type PermissionsGuardSource = "backend" | "localStorage";

/** 灰度來源。僅接受 backend/localStorage，預設 localStorage。 */
export function getPermissionsGuardSource(
  env: { VITE_PERMISSIONS_GUARD_SOURCE?: string } = (import.meta as any).env ?? {},
): PermissionsGuardSource {
  return env?.VITE_PERMISSIONS_GUARD_SOURCE === "backend" ? "backend" : "localStorage";
}

/**
 * backend 模式下由 snapshot 決定 permissions 用的 role。
 * 安全降級：缺 snapshot / 未 ready / error / 未登入 → guest。
 * payment_pending / fake localStorage → 不會變 vip/admin/tester（只看 snapshot 真值）。
 */
export function computeBackendRoleForPermissions(snapshot?: BackendAuthSnapshot | null): string {
  const s = snapshot;
  if (!s) return "guest";
  if (s.ready !== true) return "guest";
  if (s.error !== null) return "guest"; // 不 fallback localStorage
  if (s.authenticated !== true) return "guest";
  if (s.backendRole === "admin") return "admin";
  if (s.backendRole === "tester") return "tester";
  if (s.backendIsVip === true) return "vip"; // payment_pending → backendIsVip=false → 不會到這
  return s.backendRole || "free";
}

/**
 * backend 模式 permissions：以 snapshot 推得 role，取 PERMISSIONS[role]。
 * PERMISSIONS 表已含正確的 per-role 權限（vip 行即 VIP 權限），故不手改鍵值。
 * ready=false/error/未登入 → role=guest → 最小權限。
 */
export function computeBackendPermissions<T>(
  snapshot: BackendAuthSnapshot | null | undefined,
  permissionsTable: Record<string, T>,
): T {
  const role = computeBackendRoleForPermissions(snapshot);
  return permissionsTable[role] ?? permissionsTable["guest"];
}
