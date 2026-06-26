// ============================================================
// T03b-1 — AuthProvider pure helper tests (no DOM render needed)
// 執行：npm test（vitest）。驗證 /me → state 映射（boot 決策核心）。
// ============================================================

import { describe, it, expect } from "vitest";
import { meToState } from "./AuthProvider";

describe("T03b-1 meToState (boot decision)", () => {
  it("authenticated + user → role from backend", () => {
    const s = meToState({ authenticated: true, user: { id: "u1", username: "a", role: "vip" } });
    expect(s).toEqual({
      user: { id: "u1", username: "a", role: "vip" },
      role: "vip",
      authenticated: true,
    });
  });

  it("admin user maps to admin role", () => {
    const s = meToState({ authenticated: true, user: { id: "a", username: "admin", role: "admin" } });
    expect(s.role).toBe("admin");
    expect(s.authenticated).toBe(true);
  });

  it("authenticated:false → anonymous(guest)", () => {
    expect(meToState({ authenticated: false, user: null })).toEqual({
      user: null,
      role: "guest",
      authenticated: false,
    });
  });

  it("authenticated true but no user → anonymous (defensive)", () => {
    expect(meToState({ authenticated: true, user: null }).role).toBe("guest");
  });

  it("garbage input → anonymous", () => {
    // @ts-expect-error testing defensive path
    expect(meToState(null).role).toBe("guest");
  });
});
