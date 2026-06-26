// ============================================================
// T04b — getVipAuthority regression tests (pure logic; no DB)
// 執行：npm test（vitest）。
// 端對端（authed query / UNAUTHORIZED）由 T02 authed 機制 + V19.0.8c IDOR 測涵蓋。
// ============================================================

import { describe, it, expect } from "vitest";
import { getVipAuthority } from "./payment";

const NOW = 1_000_000_000_000;
const future = new Date(NOW + 86_400_000).toISOString();
const past = new Date(NOW - 86_400_000).toISOString();

describe("T04b getVipAuthority", () => {
  it("2) free user, no subscription → isVip=false/none", () => {
    const r = getVipAuthority({ subs: [], hasPaidPayment: false }, NOW);
    expect(r.isVip).toBe(false);
    expect(r.source).toBe("none");
  });

  it("3) active subscription not expired → isVip=true/subscription", () => {
    const r = getVipAuthority(
      { subs: [{ status: "active", expiresAt: future, plan: "monthly" }], hasPaidPayment: true },
      NOW,
    );
    expect(r.isVip).toBe(true);
    expect(r.source).toBe("subscription");
    expect(r.plan).toBe("monthly");
    expect(r.expiresAt).toBeDefined();
  });

  it("4) active row but expired → isVip=false", () => {
    const r = getVipAuthority(
      { subs: [{ status: "active", expiresAt: past, plan: "monthly" }], hasPaidPayment: false },
      NOW,
    );
    expect(r.isVip).toBe(false);
  });

  it("5) canceled subscription → isVip=false", () => {
    const r = getVipAuthority(
      { subs: [{ status: "canceled", expiresAt: future, plan: "monthly" }], hasPaidPayment: false },
      NOW,
    );
    expect(r.isVip).toBe(false);
    expect(r.source).toBe("none");
  });

  it("6) paid payment but no active sub → isVip=false, source=payment_pending", () => {
    const r = getVipAuthority({ subs: [], hasPaidPayment: true }, NOW);
    expect(r.isVip).toBe(false);
    expect(r.source).toBe("payment_pending");
  });

  it("8) localStorage role cannot influence (function ignores any client role)", () => {
    // getVipAuthority 只吃 DB 來源；無 role 參數可傳
    const r = getVipAuthority({ subs: [], hasPaidPayment: false }, NOW);
    expect(r.isVip).toBe(false);
  });

  it("checkedAt is ISO", () => {
    const r = getVipAuthority({ subs: [], hasPaidPayment: false }, NOW);
    expect(() => new Date(r.checkedAt).toISOString()).not.toThrow();
  });
});
