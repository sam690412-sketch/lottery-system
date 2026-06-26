// ============================================================
// Batch 3d-5 — quotaGuard tests. 執行：npm test（vitest）。
// ============================================================
import { describe, it, expect } from "vitest";
import { getQuotaGuardSource, computeGenerationLimit } from "./quotaGuard";
import { DEFAULT_BACKEND_AUTH_SNAPSHOT } from "./backendAuthSnapshot";

const snap = (o: any) => ({ ...DEFAULT_BACKEND_AUTH_SNAPSHOT, ready: true, authenticated: true, backendRole: "free", error: null, checkedAt: "t", ...o });

describe("Batch 3d-5 quotaGuard", () => {
  it("1 localStorage vip → 999", () => expect(computeGenerationLimit({ source: "localStorage", localRole: "vip" })).toBe(999));
  it("2 localStorage free → 10", () => expect(computeGenerationLimit({ source: "localStorage", localRole: "free" })).toBe(10));
  it("3 backend active VIP → 999", () => expect(computeGenerationLimit({ source: "backend", snapshot: snap({ backendIsVip: true, vipSource: "subscription" }) })).toBe(999));
  it("4 backend admin → 999", () => expect(computeGenerationLimit({ source: "backend", snapshot: snap({ backendRole: "admin" }) })).toBe(999));
  it("5 backend tester → 999", () => expect(computeGenerationLimit({ source: "backend", snapshot: snap({ backendRole: "tester" }) })).toBe(999));
  it("6 backend free → 10", () => expect(computeGenerationLimit({ source: "backend", snapshot: snap({}) })).toBe(10));
  it("7 backend guest → 10", () => expect(computeGenerationLimit({ source: "backend", snapshot: snap({ authenticated: false, backendRole: "guest" }) })).toBe(10));
  it("8 backend payment_pending → 10", () => expect(computeGenerationLimit({ source: "backend", snapshot: snap({ vipSource: "payment_pending" }) })).toBe(10));
  it("9 backend error + localRole vip → 10", () => expect(computeGenerationLimit({ source: "backend", localRole: "vip", snapshot: snap({ error: "vip_query_failed" }) })).toBe(10));
  it("10 backend not ready + localRole vip → 10", () => expect(computeGenerationLimit({ source: "backend", localRole: "vip", snapshot: snap({ ready: false }) })).toBe(10));
  it("11 backend null snapshot + localRole vip → 10", () => expect(computeGenerationLimit({ source: "backend", localRole: "vip", snapshot: null })).toBe(10));
  it("12 invalid env → localStorage", () => expect(getQuotaGuardSource({ VITE_QUOTA_GUARD_SOURCE: "xx" })).toBe("localStorage"));
  it("CRITICAL backend fake-vip → 10", () => expect(computeGenerationLimit({ source: "backend", localRole: "vip", snapshot: snap({ backendIsVip: false }) })).toBe(10));
});
