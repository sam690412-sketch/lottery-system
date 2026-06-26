// ============================================================
// T04a — migrationService regression tests (pure logic; mocked repo)
// 執行：npm test（vitest）。不連 DB、不碰 ECPay/Webhook。
// ============================================================

import { describe, it, expect } from "vitest";
import {
  migrateMemberCredential,
  MigrationError,
  type MigrationUserRepo,
} from "./migrationService";
import { verifyPassword } from "./password";

function makeRepo(seed: Record<string, { id: string }> = {}) {
  const store: Record<string, any> = { ...seed };
  const inserted: any[] = [];
  const repo: MigrationUserRepo = {
    findByEmail: async (email) => store[email] ?? null,
    insertFreeUser: async (row) => {
      store[row.email] = { id: row.id };
      inserted.push(row);
    },
  };
  return { repo, inserted, store };
}

describe("T04a migrateMemberCredential", () => {
  it("1) new email+password → creates free user", async () => {
    const { repo, inserted } = makeRepo();
    const r = await migrateMemberCredential({ email: "a@b.com", password: "secret12" }, repo);
    expect(r.migrated).toBe(true);
    expect(r.alreadyExisted).toBe(false);
    expect(inserted[0].role).toBe("free");
  });

  it("2) passwordHash is scrypt + verifiable", async () => {
    const { repo, inserted } = makeRepo();
    await migrateMemberCredential({ email: "a@b.com", password: "secret12" }, repo);
    expect(inserted[0].passwordHash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("secret12", inserted[0].passwordHash)).toBe(true);
  });

  it("3) role forced to free, no vip/admin flags", async () => {
    const { repo, inserted } = makeRepo();
    await migrateMemberCredential({ email: "a@b.com", password: "secret12" }, repo);
    expect(inserted[0].role).toBe("free");
    expect(inserted[0].forcePasswordChange).toBe(false);
    expect(inserted[0].isActive).toBe(true);
  });

  it("4) existing email → not overwritten", async () => {
    const { repo, inserted } = makeRepo({ "a@b.com": { id: "old-1" } });
    const r = await migrateMemberCredential({ email: "a@b.com", password: "secret12" }, repo);
    expect(r).toEqual({ migrated: false, alreadyExisted: true, userId: "old-1" });
    expect(inserted.length).toBe(0);
  });

  it("5) role=vip in body → 400", async () => {
    const { repo } = makeRepo();
    await expect(
      migrateMemberCredential({ email: "a@b.com", password: "secret12", role: "vip" }, repo),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("6) isAdmin=true → 400", async () => {
    const { repo } = makeRepo();
    await expect(
      migrateMemberCredential({ email: "a@b.com", password: "secret12", isAdmin: true }, repo),
    ).rejects.toBeInstanceOf(MigrationError);
  });

  it("7) subscription in body → 400", async () => {
    const { repo } = makeRepo();
    await expect(
      migrateMemberCredential({ email: "a@b.com", password: "secret12", subscription: {} }, repo),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("8) short password → 400", async () => {
    const { repo } = makeRepo();
    await expect(
      migrateMemberCredential({ email: "a@b.com", password: "short" }, repo),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("9) invalid email → 400", async () => {
    const { repo } = makeRepo();
    await expect(
      migrateMemberCredential({ email: "not-an-email", password: "secret12" }, repo),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("also rejects plan / vipTrialRemaining / dailyGenerateCount", async () => {
    const { repo } = makeRepo();
    for (const bad of [{ plan: "monthly" }, { vipTrialRemaining: 3 }, { dailyGenerateCount: 5 }]) {
      await expect(
        migrateMemberCredential({ email: "a@b.com", password: "secret12", ...bad }, repo),
      ).rejects.toMatchObject({ status: 400 });
    }
  });
});
