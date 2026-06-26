// ============================================================
// T03a — seed-users regression tests (pure logic; no DB)
// 執行：npm test（vitest）。
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import { resolveSeedSpecs, generatePassword, toUserRow } from "./seed-users";
import { verifyPassword } from "../api/auth/password";

describe("T03a seed-users", () => {
  it("defaults to admin/tester usernames when env unset", () => {
    const specs = resolveSeedSpecs({} as NodeJS.ProcessEnv);
    expect(specs.map((s) => s.role)).toEqual(["admin", "tester"]);
    expect(specs[0].email).toBe("admin");
    expect(specs[1].email).toBe("tester");
  });

  it("generates random passwords when not provided (never default)", () => {
    const specs = resolveSeedSpecs({} as NodeJS.ProcessEnv);
    for (const s of specs) {
      expect(s.generated).toBe(true);
      expect(s.password).not.toBe("admin123");
      expect(s.password).not.toBe("tester123");
      expect(s.password.length).toBeGreaterThanOrEqual(16);
    }
  });

  it("uses env credentials when provided", () => {
    const specs = resolveSeedSpecs({
      SEED_ADMIN_USER: "root@x",
      SEED_ADMIN_PASSWORD: "Str0ng#Pass",
      SEED_TESTER_USER: "qa@x",
      SEED_TESTER_PASSWORD: "An0ther#Pass",
    } as any);
    expect(specs[0].email).toBe("root@x");
    expect(specs[0].password).toBe("Str0ng#Pass");
    expect(specs[0].generated).toBe(false);
  });

  it("refuses known default passwords", () => {
    expect(() => resolveSeedSpecs({ SEED_ADMIN_PASSWORD: "admin123" } as any)).toThrow();
    expect(() => resolveSeedSpecs({ SEED_TESTER_PASSWORD: "tester123" } as any)).toThrow();
  });

  it("toUserRow produces scrypt hash, correct role, forcePasswordChange + isActive", () => {
    const specs = resolveSeedSpecs({ SEED_ADMIN_PASSWORD: "Abc#1234" } as any);
    const row = toUserRow(specs[0]);
    expect(row.role).toBe("admin");
    expect(row.forcePasswordChange).toBe(true);
    expect(row.isActive).toBe(true);
    expect(row.passwordHash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("Abc#1234", row.passwordHash)).toBe(true);
    expect(verifyPassword("wrong", row.passwordHash)).toBe(false);
  });

  it("generatePassword returns distinct strong values", () => {
    const a = generatePassword(), b = generatePassword();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(16);
  });
});
