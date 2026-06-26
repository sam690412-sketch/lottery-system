// ============================================================
// T02 Auth Foundation — session layer tests
// 執行：npm test（vitest）。不依賴 DB/tRPC/ECPay。
// ============================================================

import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession, extractToken, getCurrentUser } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-key";
});

function makeReq(headers: Record<string, string>): Request {
  return new Request("https://example.com/api/trpc/x", { headers });
}

describe("T02 session layer", () => {
  it("sign → verify round trip preserves identity", () => {
    const token = signSession({ sub: "u1", email: "a@b.c", role: "vip" });
    const user = verifySession(token);
    expect(user).not.toBeNull();
    expect(user!.id).toBe("u1");
    expect(user!.role).toBe("vip");
    expect(user!.email).toBe("a@b.c");
  });

  it("tampered token is rejected", () => {
    const token = signSession({ sub: "u1", email: "a@b.c", role: "admin" });
    const tampered = token.slice(0, -2) + (token.slice(-2) === "aa" ? "bb" : "aa");
    expect(verifySession(tampered)).toBeNull();
  });

  it("payload swap (privilege escalation attempt) is rejected", () => {
    const token = signSession({ sub: "u1", email: "a@b.c", role: "free" });
    const [, sig] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: "u1", email: "a@b.c", role: "admin", iat: 1, exp: 9999999999 }),
    ).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(verifySession(`${forgedPayload}.${sig}`)).toBeNull();
  });

  it("expired token is rejected", () => {
    const token = signSession({ sub: "u1", email: "a@b.c", role: "vip" }, -10);
    expect(verifySession(token)).toBeNull();
  });

  it("invalid role is rejected", () => {
    // 手動造一個 role 非法的 token（用相同 secret 簽，但 role 不合法）
    const token = signSession({ sub: "u1", email: "a@b.c", role: "superuser" as never });
    expect(verifySession(token)).toBeNull();
  });

  it("null / garbage tokens return null", () => {
    expect(verifySession(null)).toBeNull();
    expect(verifySession("")).toBeNull();
    expect(verifySession("not-a-token")).toBeNull();
    expect(verifySession("a.b.c")).toBeNull();
  });

  it("extractToken reads Bearer and cookie", () => {
    expect(extractToken(makeReq({ authorization: "Bearer abc123" }))).toBe("abc123");
    expect(extractToken(makeReq({ cookie: "x=1; session=tok99; y=2" }))).toBe("tok99");
    expect(extractToken(makeReq({}))).toBeNull();
  });

  it("getCurrentUser resolves from request header", () => {
    const token = signSession({ sub: "u9", email: "z@z.z", role: "tester" });
    const user = getCurrentUser(makeReq({ authorization: `Bearer ${token}` }));
    expect(user!.id).toBe("u9");
    expect(user!.role).toBe("tester");
    expect(getCurrentUser(makeReq({}))).toBeNull();
  });
});
