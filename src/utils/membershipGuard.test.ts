// ============================================================
// Batch 3d-5b — membershipGuard tests. 執行：npm test（vitest）。
// ============================================================
import { describe, it, expect } from "vitest";
import { getMembershipGuardSource, computeMembershipFlags } from "./membershipGuard";
import { DEFAULT_BACKEND_AUTH_SNAPSHOT } from "./backendAuthSnapshot";

const snap = (o: any) => ({ ...DEFAULT_BACKEND_AUTH_SNAPSHOT, ready: true, authenticated: true, backendRole: "free", error: null, checkedAt: "t", ...o });
const future = new Date(Date.now() + 864e5).toISOString();
const past = new Date(Date.now() - 864e5).toISOString();
const L = (o: any) => computeMembershipFlags({ source: "localStorage", ...o });
const B = (o: any) => computeMembershipFlags({ source: "backend", ...o });

describe("Batch 3d-5b membershipGuard", () => {
  it("1 localStorage vip → isVip", () => expect(L({ localRole: "vip" }).isVip).toBe(true));
  it("2 localStorage admin → isVip+isAdmin", () => { const r = L({ localRole: "admin" }); expect(r.isVip && r.isAdmin).toBe(true); });
  it("3 localStorage tester → isVip+isTester", () => { const r = L({ localRole: "tester" }); expect(r.isVip && r.isTester).toBe(true); });
  it("4 localStorage active sub → isVip", () => expect(L({ localRole: "free", localSubscription: { status: "active", expiresAt: future } }).isVip).toBe(true));
  it("5 localStorage expired sub → false", () => expect(L({ localRole: "free", localSubscription: { status: "active", expiresAt: past } }).isVip).toBe(false));
  it("6 backend active VIP → isVip", () => expect(B({ snapshot: snap({ backendIsVip: true, vipSource: "subscription" }) }).isVip).toBe(true));
  it("7 backend admin → isVip+isAdmin", () => { const r = B({ snapshot: snap({ backendRole: "admin" }) }); expect(r.isVip && r.isAdmin).toBe(true); });
  it("8 backend tester → isVip+isTester", () => { const r = B({ snapshot: snap({ backendRole: "tester" }) }); expect(r.isVip && r.isTester).toBe(true); });
  it("9 backend free → false", () => expect(B({ snapshot: snap({}) }).isVip).toBe(false));
  it("10 backend guest → false", () => expect(B({ snapshot: snap({ authenticated: false, backendRole: "guest" }) }).isVip).toBe(false));
  it("11 backend payment_pending → false", () => expect(B({ snapshot: snap({ vipSource: "payment_pending" }) }).isVip).toBe(false));
  it("12 backend error + localRole vip → false", () => expect(B({ localRole: "vip", snapshot: snap({ error: "x" }) }).isVip).toBe(false));
  it("13 backend not ready + localRole vip → false", () => expect(B({ localRole: "vip", snapshot: snap({ ready: false }) }).isVip).toBe(false));
  it("14 backend null snapshot + localRole vip → false", () => expect(B({ localRole: "vip", snapshot: null }).isVip).toBe(false));
  it("15 invalid env → localStorage", () => expect(getMembershipGuardSource({ VITE_MEMBERSHIP_GUARD_SOURCE: "xx" })).toBe("localStorage"));
  it("CRITICAL backend fake-vip → false", () => expect(B({ localRole: "vip", snapshot: snap({ backendIsVip: false }) }).isVip).toBe(false));

  // --- Batch 3d-5c: role helpers (isVipByRole/isAdmin/isTester) ---
  it("c1 localStorage vip → isVipByRole", () => expect(L({ localRole: "vip" }).isVipByRole).toBe(true));
  it("c2 localStorage admin → isVipByRole+isAdmin", () => { const r = L({ localRole: "admin" }); expect(r.isVipByRole && r.isAdmin).toBe(true); });
  it("c3 localStorage tester → isVipByRole+isTester", () => { const r = L({ localRole: "tester" }); expect(r.isVipByRole && r.isTester).toBe(true); });
  it("c4 localStorage free → all false", () => { const r = L({ localRole: "free" }); expect(r.isVipByRole || r.isAdmin || r.isTester).toBe(false); });
  it("c5 backend admin → isAdmin", () => expect(B({ snapshot: snap({ backendRole: "admin" }) }).isAdmin).toBe(true));
  it("c6 backend tester → isTester", () => expect(B({ snapshot: snap({ backendRole: "tester" }) }).isTester).toBe(true));
  it("c7 backend payment_pending → isVipByRole false", () => expect(B({ snapshot: snap({ vipSource: "payment_pending" }) }).isVipByRole).toBe(false));
  it("c8 backend error + localRole admin → isAdmin false", () => expect(B({ localRole: "admin", snapshot: snap({ error: "x" }) }).isAdmin).toBe(false));
  it("c9 backend not ready + localRole tester → isTester false", () => expect(B({ localRole: "tester", snapshot: snap({ ready: false }) }).isTester).toBe(false));
  it("c10 backend null + localRole admin → all false", () => { const r = B({ localRole: "admin", snapshot: null }); expect(r.isVipByRole || r.isAdmin).toBe(false); });
  it("c11 CRITICAL fake localStorage admin + backend free → isAdmin false", () => expect(B({ localRole: "admin", snapshot: snap({ backendRole: "free" }) }).isAdmin).toBe(false));
  it("c12 CRITICAL fake localStorage vip + backend free → isVipByRole false", () => expect(B({ localRole: "vip", snapshot: snap({ backendIsVip: false }) }).isVipByRole).toBe(false));
  it("c13 flags include source+reason", () => { const r = B({ snapshot: snap({}) }); expect(r.source === "backend" && typeof r.reason === "string").toBe(true); });
});
