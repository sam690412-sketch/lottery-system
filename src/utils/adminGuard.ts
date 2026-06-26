// ============================================================
// Batch 3b — Admin 外層守衛（後端權威）
// computeBackendIsAdmin：僅依後端 /api/auth/me 的 authenticated + role 判定。
// ⚠️ 不得回退 localStorage role。loading 期間回 false（呼叫端須先處理 loading）。
// 純函式，可離線測試。
// ============================================================

export type AdminGuardSource = "backend" | "localStorage";

/** 灰度來源（預設 backend）。回滾：設為 'localStorage' 或還原 App.tsx 來源。 */
export function getAdminGuardSource(
  env: { VITE_ADMIN_GUARD_SOURCE?: string } = (import.meta as any).env ?? {},
): AdminGuardSource {
  return env?.VITE_ADMIN_GUARD_SOURCE === "localStorage" ? "localStorage" : "backend";
}

/**
 * 後端 admin 判定：必須「已通過後端驗證」且「後端 role === 'admin'」。
 * @param authenticated useAuth().authenticated（來自 /api/auth/me）
 * @param backendRole useAuth().role（後端權威）
 */
export function computeBackendIsAdmin(
  authenticated: boolean,
  backendRole: string,
): boolean {
  return authenticated === true && backendRole === "admin";
}
