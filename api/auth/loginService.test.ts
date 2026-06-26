// ============================================================
// V19.1 Auth Integration — login/token regression tests
// 執行：npm test（vitest）。不連 DB、不碰 ECPay/Webhook。
// ============================================================

import { describe, it, expect, beforeAll } from "vitest";
import { performLogin, type CredentialVerifier } from "./loginService";
import { verifySession } from "./session";
import { hashPassword, verifyPassword } from "./password";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-key";
});

// 假 verifier：依帳號回傳對應角色
const fakeVerify: CredentialVerifier = async (u, p) => {
  if (p !== "correct") return null;
  if (u === "admin") return { id: "a1", username: "admin", email: "admin@x", role: "admin" };
  if (u === "tester") return { id: "t1", username: "tester", email: "tester@x", role: "tester" };
  if (u === "user") return { id: "u1", username: "user", email: "user@x", role: "free" };
  return null;
};

describe("V19.1 login token issuance", () => {
  it("1) admin login → signed token with admin role", async () => {
    const r = await performLogin("admin", "correct", fakeVerify);
    expect(r.status).toBe(200);
    const token = (r.body as any).token;
    expect(verifySession(token)!.role).toBe("admin");
    expect((r.body as any).user.role).toBe("admin");
  });

  it("2) tester login → signed token with tester role", async () => {
    const r = await performLogin("tester", "correct", fakeVerify);
    expect(r.status).toBe(200);
    expect(verifySession((r.body as any).token)!.role).toBe("tester");
  });

  it("3) user login → signed token with free role", async () => {
    const r = await performLogin("user", "correct", fakeVerify);
    expect(r.status).toBe(200);
    expect(verifySession((r.body as any).token)!.role).toBe("free");
  });

  it("4) wrong password → 401", async () => {
    const r = await performLogin("admin", "wrong", fakeVerify);
    expect(r.status).toBe(401);
  });

  it("4b) missing fields → 400", async () => {
    expect((await performLogin("", "", fakeVerify)).status).toBe(400);
  });

  it("5) forged token → verifySession null (/me would be authenticated:false)", () => {
    expect(verifySession("forged.token")).toBeNull();
  });

  it("6) valid token → verifySession returns user (/me authenticated:true)", async () => {
    const r = await performLogin("admin", "correct", fakeVerify);
    const u = verifySession((r.body as any).token);
    expect(u).not.toBeNull();
    expect(u!.id).toBe("a1");
  });

  it("password hash round-trips and rejects wrong password", () => {
    const h = hashPassword("s3cret");
    expect(verifyPassword("s3cret", h)).toBe(true);
    expect(verifyPassword("nope", h)).toBe(false);
    expect(verifyPassword("x", "not-a-hash")).toBe(false);
  });
});
