// ============================================================
// T04a — Member credential migration service
// migrateMemberCredential：把「email + 原文密碼」遷入 users 表（scrypt）。
// 鐵則：role 一律 free；不接受/不遷移 role/plan/vip/subscription/trial/daily/admin/tester。
// 純邏輯，DB 存取以注入的 repo 介面完成 → 可離線單元測試。
// 不觸及 ECPay/Webhook/付款/前端/gating。
// ============================================================

import { hashPassword } from "./password";

export interface MigrateInput {
  email: string;
  password: string;
}

export interface MigrateResult {
  migrated: boolean;
  alreadyExisted: boolean;
  userId?: string;
}

/** 注入式 user 倉儲（實際以 DB 實作；測試以 mock）。 */
export interface MigrationUserRepo {
  findByEmail: (email: string) => Promise<{ id: string } | null>;
  insertFreeUser: (row: {
    id: string;
    email: string;
    nickname: string;
    passwordHash: string;
    role: "free";
    isActive: true;
    forcePasswordChange: false;
  }) => Promise<void>;
}

/** request body 中一律禁止的權限相關欄位（出現即拒絕）。 */
export const FORBIDDEN_FIELDS = [
  "role",
  "plan",
  "vip",
  "isVip",
  "subscription",
  "paymentStatus",
  "isAdmin",
  "isTester",
  "trial",
  "vipTrialRemaining",
  "dailyGenerateCount",
  "dailyCountDate",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;

export class MigrationError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** 檢查 raw body 是否夾帶禁止欄位（TASK E）。 */
export function assertNoForbiddenFields(body: Record<string, unknown>): void {
  for (const f of FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body ?? {}, f)) {
      throw new MigrationError(400, `Field not allowed: ${f}`);
    }
  }
}

/** 驗證 input（email 格式、密碼長度）。 */
export function validateInput(body: Record<string, unknown>): MigrateInput {
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) throw new MigrationError(400, "email and password required");
  if (!EMAIL_RE.test(email)) throw new MigrationError(400, "invalid email format");
  if (password.length < MIN_PASSWORD_LEN)
    throw new MigrationError(400, `password must be at least ${MIN_PASSWORD_LEN} chars`);
  return { email, password };
}

/** 產生 user id（避免相依外部）。 */
function genId(): string {
  return "usr-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * 主流程：驗證 → 拒絕禁止欄位 → 冪等檢查 → 建立 free user（scrypt）。
 * @param rawBody 原始 request body（用於禁止欄位檢查）
 * @param repo 注入的倉儲
 */
export async function migrateMemberCredential(
  rawBody: Record<string, unknown>,
  repo: MigrationUserRepo,
): Promise<MigrateResult> {
  assertNoForbiddenFields(rawBody);
  const { email, password } = validateInput(rawBody);

  // 冪等：已存在 → 不覆蓋任何欄位
  const existing = await repo.findByEmail(email);
  if (existing) {
    return { migrated: false, alreadyExisted: true, userId: existing.id };
  }

  const id = genId();
  await repo.insertFreeUser({
    id,
    email,
    nickname: email.split("@")[0],
    passwordHash: hashPassword(password), // scrypt
    role: "free", // 強制 free（不信任任何 client role）
    isActive: true,
    forcePasswordChange: false,
  });

  return { migrated: true, alreadyExisted: false, userId: id };
}
