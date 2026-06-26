// ============================================================
// Batch 3b — adminGuard tests (pure logic; no DOM)
// 執行：npm test（vitest）。
// ============================================================

import { describe, it, expect } from "vitest";
import { computeBackendIsAdmin } from "./adminGuard";

describe("Batch 3b computeBackendIsAdmin", () => {
  it("authenticated admin → true", () => {
    expect(computeBackendIsAdmin(true, "admin")).toBe(true);
  });
  it("authenticated free/vip/tester/guest → false", () => {
    for (const r of ["free", "vip", "tester", "guest"]) {
      expect(computeBackendIsAdmin(true, r)).toBe(false);
    }
  });
  it("NOT authenticated but role=admin (forged) → false", () => {
    expect(computeBackendIsAdmin(false, "admin")).toBe(false);
  });
  it("not authenticated guest → false", () => {
    expect(computeBackendIsAdmin(false, "guest")).toBe(false);
  });
});
