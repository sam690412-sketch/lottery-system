// ============================================================
// Batch 3c (T04j-1) — vipGuard tests (pure logic; no DOM)
// 執行：npm test（vitest）。
// ============================================================

import { describe, it, expect } from "vitest";
import { computePremiumAIUnlock, getVipGuardSource } from "./vipGuard";

const base = {
  source: "backend" as const,
  localRole: "free",
  authenticated: true,
  authLoading: false,
  backendRole: "free",
  vipLoading: false,
  vipError: false,
  backendIsVip: false,
  backendVipSource: "none",
};

describe("Batch 3c computePremiumAIUnlock", () => {
  it("1) localStorage vip → unlock", () => {
    expect(computePremiumAIUnlock({ ...base, source: "localStorage", localRole: "vip" }).state).toBe("unlock");
  });
  it("2) localStorage admin → unlock", () => {
    expect(computePremiumAIUnlock({ ...base, source: "localStorage", localRole: "admin" }).state).toBe("unlock");
  });
  it("3) localStorage free → lock", () => {
    expect(computePremiumAIUnlock({ ...base, source: "localStorage", localRole: "free" }).state).toBe("lock");
  });
  it("4) backend active VIP → unlock", () => {
    expect(computePremiumAIUnlock({ ...base, backendIsVip: true, backendVipSource: "subscription" }).state).toBe("unlock");
  });
  it("5) backend free → lock", () => {
    expect(computePremiumAIUnlock({ ...base }).state).toBe("lock");
  });
  it("6) backend mode: fake localStorage vip + backendIsVip=false → lock", () => {
    expect(computePremiumAIUnlock({ ...base, localRole: "vip", backendIsVip: false }).state).toBe("lock");
  });
  it("7) backend unauthenticated → lock not_authenticated", () => {
    const r = computePremiumAIUnlock({ ...base, authenticated: false });
    expect(r.state).toBe("lock");
    expect(r.reason).toBe("not_authenticated");
  });
  it("8) backend loading → loading", () => {
    expect(computePremiumAIUnlock({ ...base, vipLoading: true }).state).toBe("loading");
    expect(computePremiumAIUnlock({ ...base, authLoading: true }).state).toBe("loading");
  });
  it("9) backend error → not unlock (error)", () => {
    const r = computePremiumAIUnlock({ ...base, vipError: true });
    expect(r.state).not.toBe("unlock");
    expect(r.state).toBe("error");
  });
  it("10) payment_pending → lock + message", () => {
    const r = computePremiumAIUnlock({ ...base, backendVipSource: "payment_pending" });
    expect(r.state).toBe("lock");
    expect(r.reason).toBe("payment_pending");
    expect(r.message).toContain("付款確認中");
  });
  it("11) backend admin → unlock (product decision)", () => {
    expect(computePremiumAIUnlock({ ...base, backendRole: "admin" }).state).toBe("unlock");
  });
  it("12) illegal env → localStorage", () => {
    expect(getVipGuardSource({ VITE_VIP_GUARD_SOURCE: "garbage" })).toBe("localStorage");
    expect(getVipGuardSource({})).toBe("localStorage");
    expect(getVipGuardSource({ VITE_VIP_GUARD_SOURCE: "backend" })).toBe("backend");
  });

  it("backend error never falls back to localStorage vip", () => {
    const r = computePremiumAIUnlock({ ...base, localRole: "vip", vipError: true });
    expect(r.state).not.toBe("unlock");
  });
});
