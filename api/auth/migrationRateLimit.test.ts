// ============================================================
// T04a-1 — migration rate limit tests
// 執行：npm test（vitest）。注入 now() 控制時間窗。
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import {
  checkMigrationRateLimit,
  __resetRateLimit,
  resolveClientIp,
  RATE_LIMIT_CONFIG,
} from "./migrationRateLimit";

beforeEach(() => __resetRateLimit());

const t0 = 1_000_000;

describe("T04a-1 migration rate limit", () => {
  it("1) same IP+email: 5 allowed", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkMigrationRateLimit("1.1.1.1", "a@b.com", t0 + i).allowed).toBe(true);
    }
  });

  it("2) 6th same IP+email → blocked", () => {
    for (let i = 0; i < 5; i++) checkMigrationRateLimit("1.1.1.1", "a@b.com", t0 + i);
    const r = checkMigrationRateLimit("1.1.1.1", "a@b.com", t0 + 6);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("ip+email");
  });

  it("3) same IP across many emails → IP cap (20) blocks", () => {
    // 20 distinct emails, ≤5 each, total 20 hits on the IP
    for (let i = 0; i < 20; i++) {
      expect(checkMigrationRateLimit("2.2.2.2", `u${i}@b.com`, t0 + i).allowed).toBe(true);
    }
    const r = checkMigrationRateLimit("2.2.2.2", "u999@b.com", t0 + 21);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("ip");
  });

  it("4) different IPs do not affect each other", () => {
    for (let i = 0; i < 5; i++) checkMigrationRateLimit("3.3.3.3", "a@b.com", t0 + i);
    expect(checkMigrationRateLimit("3.3.3.3", "a@b.com", t0 + 6).allowed).toBe(false);
    expect(checkMigrationRateLimit("4.4.4.4", "a@b.com", t0 + 6).allowed).toBe(true);
  });

  it("5) after window passes, allowed again", () => {
    for (let i = 0; i < 5; i++) checkMigrationRateLimit("5.5.5.5", "a@b.com", t0 + i);
    expect(checkMigrationRateLimit("5.5.5.5", "a@b.com", t0 + 6).allowed).toBe(false);
    const later = t0 + RATE_LIMIT_CONFIG.WINDOW_MS + 1;
    expect(checkMigrationRateLimit("5.5.5.5", "a@b.com", later).allowed).toBe(true);
  });

  it("6) blocked requests do not accumulate (peek-before-record)", () => {
    for (let i = 0; i < 5; i++) checkMigrationRateLimit("6.6.6.6", "a@b.com", t0 + i);
    // many blocked attempts
    for (let i = 0; i < 10; i++) checkMigrationRateLimit("6.6.6.6", "a@b.com", t0 + 6 + i);
    // right after window from the 5 real hits, should allow again (blocked ones didn't extend)
    const later = t0 + 4 + RATE_LIMIT_CONFIG.WINDOW_MS + 1;
    expect(checkMigrationRateLimit("6.6.6.6", "a@b.com", later).allowed).toBe(true);
  });

  it("resolveClientIp prefers x-forwarded-for first hop", () => {
    const h = (m: Record<string, string>) => ({ get: (k: string) => m[k.toLowerCase()] ?? null });
    expect(resolveClientIp(h({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
    expect(resolveClientIp(h({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    expect(resolveClientIp(h({}))).toBe("unknown");
  });
});
