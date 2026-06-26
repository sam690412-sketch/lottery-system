// ============================================================
// V19.1 Phase 2a — token header wiring tests
// 執行：npm test（vitest）。驗證 getAuthHeaders 與 header 合併行為。
// 不連網、不碰 ECPay/Webhook/付款。
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";

// 最小 localStorage stub（authClient 使用 localStorage 作 token 儲存）
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

beforeEach(() => {
  (globalThis as any).localStorage = new MemStorage();
});

// 動態 import 以確保使用上面注入的 localStorage
async function client() {
  return await import("./authClient");
}

// 模擬 trpc.tsx 的 header 合併邏輯（與實作一致）
function mergeHeaders(initHeaders: Record<string, string>, authHeaders: Record<string, string>) {
  return { ...initHeaders, ...authHeaders };
}

describe("V19.1 Phase 2a tRPC token wiring", () => {
  it("1) no token → getAuthHeaders returns {} (no Authorization)", async () => {
    const { getAuthHeaders } = await client();
    expect(getAuthHeaders()).toEqual({});
    const merged = mergeHeaders({ "Content-Type": "application/json" }, getAuthHeaders());
    expect(merged.Authorization).toBeUndefined();
  });

  it("2) with token → Authorization: Bearer <token>", async () => {
    const { setStoredToken, getAuthHeaders } = await client();
    setStoredToken("tok123");
    expect(getAuthHeaders()).toEqual({ Authorization: "Bearer tok123" });
    const merged = mergeHeaders({ "Content-Type": "application/json" }, getAuthHeaders());
    expect(merged.Authorization).toBe("Bearer tok123");
    expect(merged["Content-Type"]).toBe("application/json"); // 既有 header 不被覆蓋
  });

  it("3) logout/clear → header reverts to {}", async () => {
    const { setStoredToken, clearStoredToken, getAuthHeaders } = await client();
    setStoredToken("tok123");
    clearStoredToken();
    expect(getAuthHeaders()).toEqual({});
  });

  it("4) token storage round-trip", async () => {
    const { setStoredToken, getStoredToken } = await client();
    setStoredToken("abc");
    expect(getStoredToken()).toBe("abc");
  });
});
