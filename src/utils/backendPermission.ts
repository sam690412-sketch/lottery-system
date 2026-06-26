// ============================================================
// Batch 3d-3a (T04m-1) — 後端權限灰度（命理/玄學等 VIP 功能頁）
// 純函式：依 BackendAuthSnapshot 決定功能可用性。可離線測試。
// 鐵則：backend 模式不讀 localStorage；error/loading 不 allow；不 fallback。
// ============================================================

import type { BackendAuthSnapshot } from "@/utils/backendAuthSnapshot";

export type PermGuardSource = "backend" | "localStorage";
export type PermFeature = "metaphysics" | "xuanxue" | "aiRecommend" | "trend";

/** 灰度來源。僅接受 backend/localStorage，預設 localStorage（首版不切換）。 */
export function getPermGuardSource(
  env: { VITE_PERM_GUARD_SOURCE?: string } = (import.meta as any).env ?? {},
): PermGuardSource {
  return env?.VITE_PERM_GUARD_SOURCE === "backend" ? "backend" : "localStorage";
}

export type PermState = "loading" | "allow" | "deny" | "error";

export interface PermResult {
  state: PermState;
  reason: string;
  message?: string;
}

/**
 * backend 模式：依後端快照決定功能可用性。
 * 產品決策：VIP 或 admin 可用命理/玄學（與既有 PERMISSIONS 對齊）。
 */
export function computeBackendPermission(
  snap: BackendAuthSnapshot,
  _feature: PermFeature,
): PermResult {
  if (!snap.ready || snap.authLoading || snap.vipLoading) {
    return { state: "loading", reason: "loading" };
  }
  if (!snap.authenticated) {
    return { state: "deny", reason: "not_authenticated", message: "請先登入後再使用此功能" };
  }
  if (snap.error !== null) {
    // 安全降級：不 allow、不 fallback localStorage
    return { state: "error", reason: "backend_error", message: "無法驗證會員狀態，請重新登入或稍後再試" };
  }
  if (snap.backendIsVip === true) {
    return { state: "allow", reason: "backend_vip" };
  }
  if (snap.backendRole === "admin") {
    return { state: "allow", reason: "backend_admin" };
  }
  if (snap.vipSource === "payment_pending") {
    return { state: "deny", reason: "payment_pending", message: "付款確認中，請稍後再試或聯絡客服" };
  }
  return { state: "deny", reason: "not_vip" };
}
