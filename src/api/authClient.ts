// ============================================================
// V19.1 Auth Integration — frontend auth client (Phase 1)
// 封裝 login / logout / getCurrentUser 與 token 儲存。
//
// ⚠️ 重要：localStorage 在此「僅作為 token 儲存」，
//    token 本身是後端簽章的；role 權威來自後端 /api/auth/me（解析 token），
//    不得用 localStorage 內容作為 role 權威。
//
// 本版（Phase 1）此模組「不接到任何頁面/元件」；Phase 2 再把請求接上 token。
// ============================================================

const TOKEN_KEY = "auth-token-v191";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

/** TASK F: 供未來 API 請求附帶 token（本版只建立 helper，不大規模接線）。 */
export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface AuthUserDTO {
  id: string;
  username: string;
  role: "guest" | "free" | "vip" | "tester" | "admin";
}

export async function login(
  username: string,
  password: string,
): Promise<{ success: boolean; user?: AuthUserDTO; error?: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.token) {
      return { success: false, error: data?.error || `Login failed (${res.status})` };
    }
    setStoredToken(data.token);
    return { success: true, user: data.user };
  } catch (e) {
    return { success: false, error: "Network error" };
  }
}

export async function getCurrentUser(): Promise<{
  authenticated: boolean;
  user: AuthUserDTO | null;
}> {
  try {
    const res = await fetch("/api/auth/me", { headers: { ...getAuthHeaders() } });
    const data = await res.json().catch(() => ({ authenticated: false, user: null }));
    return { authenticated: !!data?.authenticated, user: data?.user ?? null };
  } catch {
    return { authenticated: false, user: null };
  }
}

export async function logout(): Promise<{ success: boolean }> {
  try {
    await fetch("/api/auth/logout", { method: "POST", headers: { ...getAuthHeaders() } });
  } catch {
    /* ignore network error on logout */
  } finally {
    clearStoredToken();
  }
  return { success: true };
}

/** 遷移錯誤（含 HTTP 狀態，供 UI 區分 429 等）。 */
export class MigrateError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * T04e-1: 會員憑證遷移。POST /api/auth/migrate。
 * body 僅含 { email, password }——嚴禁夾帶 role/vip/plan/subscription 等。
 * 200 → 回 result；400/429/500 → throw MigrateError。
 */
export async function migrateMember(
  email: string,
  password: string,
): Promise<{ migrated: boolean; alreadyExisted: boolean; userId?: string }> {
  let res: Response;
  try {
    res = await fetch("/api/auth/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 只送 email/password（不得帶入任何 localStorage 衍生欄位）
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new MigrateError(0, "Network error");
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    return {
      migrated: !!data?.migrated,
      alreadyExisted: !!data?.alreadyExisted,
      userId: data?.userId,
    };
  }
  if (res.status === 429) throw new MigrateError(429, data?.error || "Too many attempts");
  throw new MigrateError(res.status, data?.error || `Migrate failed (${res.status})`);
}
