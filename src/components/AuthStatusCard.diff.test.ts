// ============================================================
// T04f-1 — computeAuthDiff tests (pure logic; no DOM)
// 執行：npm test（vitest）。
// ============================================================

import { describe, it, expect } from "vitest";
import { computeAuthDiff } from "./AuthStatusCard";

describe("T04f-1 computeAuthDiff", () => {
  it("1) free/free/false → consistent", () => {
    expect(computeAuthDiff("free", "free", false).status).toBe("consistent");
  });

  it("2) local vip + backend not vip → fake_vip", () => {
    const d = computeAuthDiff("vip", "free", false);
    expect(d.status).toBe("fake_vip");
    expect(d.message).toContain("本機顯示 VIP");
  });

  it("3) local admin + backend not admin → fake_admin", () => {
    const d = computeAuthDiff("admin", "free", false);
    expect(d.status).toBe("fake_admin");
    expect(d.message).toContain("本機顯示 Admin");
  });

  it("4) backendVip true (and roles equal) → vip_valid", () => {
    expect(computeAuthDiff("free", "free", true).status).toBe("vip_valid");
  });

  it("5) role mismatch (non-fake) → mismatch", () => {
    expect(computeAuthDiff("free", "tester", false).status).toBe("mismatch");
  });

  it("fake_admin takes priority over vip checks", () => {
    expect(computeAuthDiff("admin", "free", true).status).toBe("fake_admin");
  });

  it("real vip: local vip + backend free but backendVip true → vip_valid (not fake)", () => {
    // users.role 常為 free，VIP 由 DB 認定；此時不應誤報 fake_vip
    expect(computeAuthDiff("vip", "free", true).status).toBe("mismatch");
  });
});
