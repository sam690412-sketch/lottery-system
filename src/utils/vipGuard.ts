// ============================================================
// Batch 3c (T04j-1) — PremiumAI VIP gating 灰度（預設 localStorage）
// 純函式：決定 PremiumAI 解鎖狀態。可離線測試。
// 安全鐵則：
//   - backend 模式絕不讀 localRole 解鎖。
//   - backend error 絕不 fallback localStorage VIP（只能往「非 VIP」降級）。
// ============================================================

export type VipGuardSource = "backend" | "localStorage";

/** 讀取灰度來源。僅接受 backend/localStorage，預設 localStorage（首版不切換）。 */
export function getVipGuardSource(
  env: { VITE_VIP_GUARD_SOURCE?: string } = (import.meta as any).env ?? {},
): VipGuardSource {
  return env?.VITE_VIP_GUARD_SOURCE === "backend" ? "backend" : "localStorage";
}

export interface PremiumAIUnlockInput {
  source: VipGuardSource;
  localRole: string;
  authenticated: boolean;
  authLoading: boolean;
  backendRole: string;
  vipLoading: boolean;
  vipError: boolean;
  backendIsVip: boolean;
  backendVipSource?: string; // 'subscription' | 'payment' | 'payment_pending' | 'none'
}

export type UnlockState = "loading" | "unlock" | "lock" | "error";

export interface PremiumAIUnlockResult {
  state: UnlockState;
  reason: string;
  message?: string;
}

/**
 * 決定 PremiumAI 是否解鎖。
 * localStorage 模式：沿用舊行為（role vip/admin → unlock）。
 * backend 模式：僅依後端 getMyVipAuthority；不讀 localRole；error 不 fallback。
 */
export function computePremiumAIUnlock(input: PremiumAIUnlockInput): PremiumAIUnlockResult {
  if (input.source === "localStorage") {
    if (input.localRole === "vip" || input.localRole === "admin") {
      return { state: "unlock", reason: "localStorage_vip" };
    }
    return { state: "lock", reason: "localStorage_not_vip" };
  }

  // ---- backend 模式 ----
  if (input.authLoading || input.vipLoading) {
    return { state: "loading", reason: "loading" };
  }
  if (!input.authenticated) {
    return { state: "lock", reason: "not_authenticated", message: "請先登入後再使用 Premium AI" };
  }
  if (input.vipError) {
    // 安全降級：不解鎖、不 fallback localStorage
    return { state: "error", reason: "backend_error", message: "無法驗證會員狀態，請重新登入或稍後再試" };
  }
  if (input.backendIsVip === true) {
    return { state: "unlock", reason: "backend_vip" };
  }
  // 產品決策：admin 視同高權，可使用 PremiumAI（如需嚴格只認 VIP，移除此分支）。
  if (input.backendRole === "admin") {
    return { state: "unlock", reason: "backend_admin" };
  }
  if (input.backendVipSource === "payment_pending") {
    return { state: "lock", reason: "payment_pending", message: "付款確認中，請稍後再試或聯絡客服" };
  }
  return { state: "lock", reason: "backend_not_vip" };
}
