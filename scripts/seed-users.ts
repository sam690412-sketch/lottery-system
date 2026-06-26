// ============================================================
// T03a — Admin / Tester server seed
// upsert admin/tester 到 users 表（scrypt 雜湊，密碼來自 env 或隨機產生）。
// 執行：npm run seed:users   （或 node --experimental-strip-types scripts/seed-users.ts）
//
// 規則：
//   - username 來源：SEED_ADMIN_USER / SEED_TESTER_USER（預設 admin / tester）
//   - password 來源：SEED_ADMIN_PASSWORD / SEED_TESTER_PASSWORD；未設 → 隨機產生
//   - 嚴禁使用 admin123 / tester123 或任何寫死預設密碼
//   - passwordHash 用 hashPassword()（scrypt）；forcePasswordChange=true；isActive=true
//   - 以 email(=username) 為鍵 upsert，重跑不重複
//
// 本檔不改 schema、不碰 ECPay/Webhook/付款/前端/gating。
// 注意：DB 寫入只在「作為主程式執行」時進行；被 import（測試）時不執行。
// ============================================================

import { randomBytes } from "node:crypto";
import { hashPassword } from "../api/auth/password";

export type SeedRole = "admin" | "tester";

export interface SeedSpec {
  role: SeedRole;
  email: string; // username 承載於 email 欄（users 表無獨立 username 欄）
  password: string;
  generated: boolean; // 密碼是否為隨機產生（需於 log 提示並強制改密）
}

const FORBIDDEN_PASSWORDS = new Set(["admin123", "tester123"]);

/** 產生強隨機密碼（base64url，~24 字元）。 */
export function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

/** 由 env 解析 seed 規格（純函式，無 DB；可離線測試）。 */
export function resolveSeedSpecs(env: NodeJS.ProcessEnv = process.env): SeedSpec[] {
  const specs: Array<{ role: SeedRole; userKey: string; passKey: string; defUser: string }> = [
    { role: "admin", userKey: "SEED_ADMIN_USER", passKey: "SEED_ADMIN_PASSWORD", defUser: "admin" },
    { role: "tester", userKey: "SEED_TESTER_USER", passKey: "SEED_TESTER_PASSWORD", defUser: "tester" },
  ];

  return specs.map(({ role, userKey, passKey, defUser }) => {
    const email = (env[userKey] || defUser).trim();
    let password = env[passKey];
    let generated = false;
    if (!password) {
      password = generatePassword();
      generated = true;
    }
    // 安全閘：禁止寫死的弱預設密碼
    if (FORBIDDEN_PASSWORDS.has(password)) {
      throw new Error(
        `Refusing to seed ${role}: password must not be a known default (${password}).`,
      );
    }
    return { role, email, password, generated };
  });
}

/** 將一筆 spec 轉成 DB row（含 scrypt 雜湊）。 */
export function toUserRow(spec: SeedSpec) {
  return {
    id: `seed-${spec.role}-${randomBytes(6).toString("hex")}`,
    email: spec.email,
    nickname: spec.email,
    passwordHash: hashPassword(spec.password),
    role: spec.role,
    forcePasswordChange: true,
    isActive: true,
  };
}

/** 實際 DB upsert（只在主程式執行時呼叫；動態載入 DB 相依以利離線測試）。 */
async function run(): Promise<void> {
  const specs = resolveSeedSpecs();

  const { getDb } = await import("../api/queries/connection");
  const { users } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");
  const db = getDb();

  for (const spec of specs) {
    const row = toUserRow(spec);
    const existing = await db.select().from(users).where(eq(users.email, spec.email)).limit(1);

    if (existing[0]) {
      // 更新：passwordHash / role / forcePasswordChange / isActive（保留既有 id）
      await db
        .update(users)
        .set({
          passwordHash: row.passwordHash,
          role: row.role,
          forcePasswordChange: true,
          isActive: true,
        })
        .where(eq(users.email, spec.email));
      console.log(`[seed] updated ${spec.role}: ${spec.email}`);
    } else {
      await db.insert(users).values(row);
      console.log(`[seed] inserted ${spec.role}: ${spec.email}`);
    }

    if (spec.generated) {
      console.log(
        `[seed] ⚠️ generated password for ${spec.email} (${spec.role}): ${spec.password}` +
          `  — store it securely; forcePasswordChange is set.`,
      );
    }
  }
  console.log("[seed] done. Users must change password on first login (forcePasswordChange=true).");
}

// 僅在「作為主程式執行」時跑 DB；被 import（測試）時不執行。
const invokedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (invokedDirectly) {
  run().then(
    () => process.exit(0),
    (err) => {
      console.error("[seed] failed:", err?.message || err);
      process.exit(1);
    },
  );
}
