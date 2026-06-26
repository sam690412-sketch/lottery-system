// ============================================================
// Batch 3d-6a — permissionsGuard tests. 執行：npm test（vitest）。
// ============================================================
import { describe, it, expect } from "vitest";
import { getPermissionsGuardSource, computeBackendRoleForPermissions, computeBackendPermissions } from "./permissionsGuard";
import { DEFAULT_BACKEND_AUTH_SNAPSHOT } from "./backendAuthSnapshot";

const snap = (o: any) => ({ ...DEFAULT_BACKEND_AUTH_SNAPSHOT, ready: true, authenticated: true, backendRole: "free", error: null, checkedAt: "t", ...o });
const PERMS: any = {
  guest: { canUseMetaphysics: false, canUseAllMode: false, maxDailyGenerations: 3, label: "訪客" },
  free: { canUseMetaphysics: false, canUseAllMode: false, maxDailyGenerations: 10, label: "免費" },
  vip: { canUseMetaphysics: true, canUseAllMode: true, maxDailyGenerations: 999, label: "VIP" },
  tester: { canUseMetaphysics: true, canUseAllMode: true, maxDailyGenerations: 999, label: "測試" },
  admin: { canUseMetaphysics: true, canUseAllMode: true, maxDailyGenerations: 999, label: "管理" },
};
const R = (s: any) => computeBackendRoleForPermissions(s);
const P = (s: any) => computeBackendPermissions(s, PERMS);

describe("Batch 3d-6a permissionsGuard", () => {
  it("1 default env → localStorage", () => expect(getPermissionsGuardSource({})).toBe("localStorage"));
  it("2 invalid env → localStorage", () => expect(getPermissionsGuardSource({ VITE_PERMISSIONS_GUARD_SOURCE: "xx" })).toBe("localStorage"));
  it("3 backend active VIP → role vip", () => expect(R(snap({ backendIsVip: true, vipSource: "subscription" }))).toBe("vip"));
  it("4 backend free → role free", () => expect(R(snap({}))).toBe("free"));
  it("5 backend guest/unauth → role guest", () => expect(R(snap({ authenticated: false, backendRole: "guest" }))).toBe("guest"));
  it("6 backend admin → role admin", () => expect(R(snap({ backendRole: "admin" }))).toBe("admin"));
  it("7 backend tester → role tester", () => expect(R(snap({ backendRole: "tester" }))).toBe("tester"));
  it("8 payment_pending → role free", () => expect(R(snap({ vipSource: "payment_pending" }))).toBe("free"));
  it("9 backend error → guest (not vip)", () => expect(R(snap({ error: "x" }))).toBe("guest"));
  it("10 backend not-ready → guest (not admin)", () => expect(R(snap({ ready: false, backendRole: "admin" }))).toBe("guest"));
  it("11 fake localStorage vip + backend free → free", () => expect(R(snap({ backendIsVip: false }))).toBe("free"));
  it("12 fake localStorage admin + backend free → free", () => expect(R(snap({ backendRole: "free" }))).toBe("free"));
  it("13 computeBackendPermissions active VIP has VIP perms", () => expect(P(snap({ backendIsVip: true })).canUseMetaphysics).toBe(true));
  it("14 computeBackendPermissions free no VIP perms", () => expect(P(snap({})).canUseMetaphysics).toBe(false));
  it("15 computeBackendPermissions admin has admin perms", () => expect(P(snap({ backendRole: "admin" })).canUseAllMode).toBe(true));
  it("16 computeBackendPermissions error → guest minimal", () => { const r = P(snap({ error: "x" })); expect(r.label === "訪客" && r.canUseMetaphysics === false).toBe(true); });
  it("17 null snapshot → guest", () => { expect(R(null)).toBe("guest"); expect(P(null).label).toBe("訪客"); });
});
