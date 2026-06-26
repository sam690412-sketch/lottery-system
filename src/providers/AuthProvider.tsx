// ============================================================
// T03b-1 — AuthProvider / AuthContext
// 前端權威身份載體：身份來自後端 /api/auth/me（透過 authClient）。
// ⚠️ 不使用 localStorage role 作為權威；fallback 一律 anonymous(guest)。
// 本版只「建立」，不被任何頁面消費、不改任何 gating。
// 不觸及 ECPay/Webhook/付款流程/permissions/auth.ts/authSession.ts。
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  getStoredToken,
  clearStoredToken,
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  type AuthUserDTO,
} from "@/api/authClient";
// Batch 3d-1: 後端權威快照（只填，不被 gating 消費）
import { trpc } from "@/providers/trpc";
import {
  setBackendAuthSnapshot,
  clearBackendAuthSnapshot,
  deriveBackendAuthSnapshot,
} from "@/utils/backendAuthSnapshot";
// Batch 3d-2d: 記憶體樣本收集（不寫 DB/localStorage/API、不參與 gating）
import { recordAuthSnapshotSample } from "@/utils/authCoverageSink";

export type Role = AuthUserDTO["role"]; // 'guest'|'free'|'vip'|'tester'|'admin'

export interface AuthContextValue {
  user: AuthUserDTO | null;
  role: Role;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

interface AuthState {
  user: AuthUserDTO | null;
  role: Role;
  authenticated: boolean;
}

const ANONYMOUS: AuthState = { user: null, role: "guest", authenticated: false };

/** 純函式：把 /api/auth/me 結果映射為狀態（可離線單元測試）。 */
export function meToState(me: { authenticated: boolean; user: AuthUserDTO | null }): AuthState {
  if (me && me.authenticated && me.user) {
    return { user: me.user, role: me.user.role, authenticated: true };
  }
  return ANONYMOUS;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(ANONYMOUS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    setError(null);
    // 無 token：不呼叫 /api/auth/me，直接 anonymous
    const token = getStoredToken();
    if (!token) {
      setState(ANONYMOUS);
      setLoading(false);
      return;
    }
    try {
      const me = await getCurrentUser(); // GET /api/auth/me（authClient 帶 Bearer）
      const next = meToState(me);
      setState(next);
      // token 無效 → 清除，避免反覆失敗
      if (!next.authenticated) clearStoredToken();
    } catch (e) {
      // 網路錯誤：保留 token、標記 error，降級 anonymous（不讀 localStorage role）
      setState(ANONYMOUS);
      setError("auth check failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // 掛載時執行啟動流程一次
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (username: string, password: string) => {
      setError(null);
      const res = await apiLogin(username, password); // 成功會 setStoredToken
      if (!res.success) {
        setError(res.error || "login failed");
        return { success: false, error: res.error };
      }
      await refreshUser(); // 以後端 /me 為權威重新整理
      return { success: true };
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    await apiLogout(); // 清 token
    setState(ANONYMOUS);
    setError(null);
  }, []);

  const value: AuthContextValue = {
    user: state.user,
    role: state.role,
    authenticated: state.authenticated,
    loading,
    error,
    refreshUser,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      <BackendAuthSnapshotSync />
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Batch 3d-1: 在 AuthProvider 子樹內，依 useAuth + getMyVipAuthority 注入後端快照。
 * ⚠️ 只填 snapshot；不被任何 gating 消費、不改 useAuth 介面、不讀 localStorage。
 * 短期與 AuthStatusCard/PremiumAI 的查詢重複，本版可接受（避免擴大改動）。
 */
function BackendAuthSnapshotSync() {
  const { role, authenticated, loading, error } = useAuth();
  const vip = trpc.payment.getMyVipAuthority.useQuery(undefined, {
    enabled: authenticated,
    retry: false,
  });

  useEffect(() => {
    const derived = deriveBackendAuthSnapshot({
      authLoading: loading,
      authenticated,
      role,
      authError: error,
      vipEnabled: authenticated,
      vipLoading: vip.isLoading,
      vipError: !!vip.error,
      vipIsVip: vip.data?.isVip,
      vipSource: vip.data?.source,
      vipPlan: vip.data?.plan,
      vipExpiresAt: vip.data?.expiresAt,
      vipCheckedAt: vip.data?.checkedAt,
    });
    setBackendAuthSnapshot(derived);
    // Batch 3d-2d: 記錄真實 snapshot 樣本（僅記憶體，不寫 DB/localStorage/API；不參與 gating）
    recordAuthSnapshotSample(derived);
  }, [role, authenticated, loading, error, vip.isLoading, vip.error, vip.data]);

  // logout / 卸載時重置
  useEffect(() => {
    return () => {
      if (!authenticated) clearBackendAuthSnapshot();
    };
  }, [authenticated]);

  return null;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
