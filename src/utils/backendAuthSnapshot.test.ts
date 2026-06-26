// ============================================================
// Batch 3d-1 (T04l-2) — backendAuthSnapshot tests (pure; no DOM)
// 執行：npm test（vitest）。
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_BACKEND_AUTH_SNAPSHOT,
  getBackendAuthSnapshot,
  setBackendAuthSnapshot,
  clearBackendAuthSnapshot,
  subscribeBackendAuthSnapshot,
  deriveBackendAuthSnapshot,
} from "./backendAuthSnapshot";

beforeEach(() => clearBackendAuthSnapshot());

const authed = (role: any) => ({
  authLoading: false, authenticated: true, role, vipEnabled: true,
  vipLoading: false, vipError: false,
});

describe("Batch 3d-1 backendAuthSnapshot", () => {
  it("1) default snapshot", () => {
    expect(getBackendAuthSnapshot()).toEqual(DEFAULT_BACKEND_AUTH_SNAPSHOT);
    expect(DEFAULT_BACKEND_AUTH_SNAPSHOT.ready).toBe(false);
    expect(DEFAULT_BACKEND_AUTH_SNAPSHOT.backendIsVip).toBe(false);
  });

  it("2) unauthenticated → ready, guest, isVip false", () => {
    const s = deriveBackendAuthSnapshot({ authLoading: false, authenticated: false, role: "guest", vipEnabled: false, vipLoading: false, vipError: false });
    expect(s).toMatchObject({ ready: true, authenticated: false, backendRole: "guest", backendIsVip: false, vipSource: "none" });
  });

  it("3) admin → backendIsAdmin true", () => {
    const s = deriveBackendAuthSnapshot({ ...authed("admin"), vipIsVip: false, vipSource: "none" });
    expect(s.backendIsAdmin).toBe(true);
    expect(s.backendIsTester).toBe(false);
  });

  it("4) tester → backendIsTester true", () => {
    const s = deriveBackendAuthSnapshot({ ...authed("tester"), vipIsVip: false, vipSource: "none" });
    expect(s.backendIsTester).toBe(true);
    expect(s.backendIsAdmin).toBe(false);
  });

  it("5) active VIP → isVip true / subscription", () => {
    const s = deriveBackendAuthSnapshot({ ...authed("free"), vipIsVip: true, vipSource: "subscription", vipPlan: "monthly" });
    expect(s.backendIsVip).toBe(true);
    expect(s.vipSource).toBe("subscription");
    expect(s.ready).toBe(true);
  });

  it("6) non-VIP → isVip false", () => {
    const s = deriveBackendAuthSnapshot({ ...authed("free"), vipIsVip: false, vipSource: "none" });
    expect(s.backendIsVip).toBe(false);
  });

  it("7) payment_pending → isVip false / payment_pending", () => {
    const s = deriveBackendAuthSnapshot({ ...authed("free"), vipIsVip: false, vipSource: "payment_pending" });
    expect(s.backendIsVip).toBe(false);
    expect(s.vipSource).toBe("payment_pending");
  });

  it("8) vip query error → does NOT keep true", () => {
    const s = deriveBackendAuthSnapshot({ ...authed("free"), vipError: true });
    expect(s.backendIsVip).toBe(false);
    expect(s.error).toBe("vip_query_failed");
    expect(s.ready).toBe(true);
  });

  it("loading → ready false", () => {
    const s = deriveBackendAuthSnapshot({ authLoading: true, authenticated: false, role: "guest", vipEnabled: false, vipLoading: false, vipError: false });
    expect(s.ready).toBe(false);
    expect(s.authLoading).toBe(true);
  });

  it("9) logout clear → default", () => {
    setBackendAuthSnapshot({ backendIsVip: true, authenticated: true, ready: true });
    clearBackendAuthSnapshot();
    expect(getBackendAuthSnapshot()).toEqual(DEFAULT_BACKEND_AUTH_SNAPSHOT);
  });

  it("10) set / subscribe / unsubscribe", () => {
    let count = 0;
    const unsub = subscribeBackendAuthSnapshot(() => count++);
    setBackendAuthSnapshot({ ready: true });
    expect(count).toBe(1);
    unsub();
    setBackendAuthSnapshot({ ready: false });
    expect(count).toBe(1); // not notified after unsubscribe
  });
});
