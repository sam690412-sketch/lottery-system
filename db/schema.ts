// ============================================================
// V19.0.2 PHASE C: Supabase Payment Tables
// payments, subscriptions, payment_logs, webhook_logs
// ============================================================

import {
  mysqlTable,
  serial,
  varchar,
  int,
  timestamp,
  text,
  mysqlEnum,
  json,
  index,
  boolean,
} from "drizzle-orm/mysql-core";

// ---- Payments Table ----
export const payments = mysqlTable("payments", {
  id: serial("id").primaryKey(),
  paymentNo: varchar("payment_no", { length: 64 }).notNull().unique(),
  tradeNo: varchar("trade_no", { length: 64 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  plan: mysqlEnum("plan", ["monthly", "quarterly", "yearly"]).notNull(),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", [
    "pending",
    "paid",
    "failed",
    "cancelled",
    "refunded",
    "expired",
  ]).notNull().default("pending"),
  provider: varchar("provider", { length: 32 }).notNull().default("ecpay"),
  paymentMethod: varchar("payment_method", { length: 32 }),
  providerRef: varchar("provider_ref", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  refundReason: text("refund_reason"),
}, (table) => [
  index("idx_payments_user").on(table.userId),
  index("idx_payments_status").on(table.status),
  index("idx_payments_trade_no").on(table.tradeNo),
]);

// ---- Subscriptions Table ----
export const subscriptions = mysqlTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  paymentId: varchar("payment_id", { length: 64 }),
  plan: mysqlEnum("plan", ["monthly", "quarterly", "yearly"]).notNull(),
  status: mysqlEnum("status", [
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "paused",
    "expired",
  ]).notNull().default("active"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  canceledAt: timestamp("canceled_at"),
  cancelAtPeriodEnd: varchar("cancel_at_period_end", { length: 8 }).notNull().default("false"),
  autoRenew: varchar("auto_renew", { length: 8 }).notNull().default("true"),
  nextBillingAt: timestamp("next_billing_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_subs_user").on(table.userId),
  index("idx_subs_status").on(table.status),
]);

// ---- Payment Logs Table ----
export const paymentLogs = mysqlTable("payment_logs", {
  id: serial("id").primaryKey(),
  paymentId: varchar("payment_id", { length: 64 }),
  tradeNo: varchar("trade_no", { length: 64 }),
  userId: varchar("user_id", { length: 255 }),
  action: mysqlEnum("action", [
    "create",
    "pay",
    "fail",
    "cancel",
    "refund",
    "expire",
    "activate",
    "downgrade",
  ]).notNull(),
  fromStatus: varchar("from_status", { length: 32 }),
  toStatus: varchar("to_status", { length: 32 }),
  detail: text("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_logs_trade_no").on(table.tradeNo),
  index("idx_logs_user").on(table.userId),
]);

// ---- Webhook Logs Table ----
export const webhookLogs = mysqlTable("webhook_logs", {
  id: serial("id").primaryKey(),
  type: mysqlEnum("type", ["ecpay_return", "ecpay_client_back", "ecpay_order_result", "mock"]).notNull(),
  tradeNo: varchar("trade_no", { length: 64 }),
  userId: varchar("user_id", { length: 255 }),
  status: mysqlEnum("status", [
    "verified",
    "invalid_signature",
    "amount_mismatch",
    "duplicate",
    "failed",
    "processed",
  ]).notNull(),
  payload: json("payload"),
  verifyChecks: json("verify_checks"),
  ip: varchar("ip", { length: 64 }),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_webhook_trade_no").on(table.tradeNo),
  index("idx_webhook_type").on(table.type),
]);

// ---- Audit Log Table ----
export const auditLogs = mysqlTable("audit_logs", {
  id: serial("id").primaryKey(),
  type: mysqlEnum("type", [
    "webhook_received",
    "webhook_processed",
    "state_transition",
    "vip_activated",
    "vip_blocked",
  ]).notNull(),
  tradeNo: varchar("trade_no", { length: 64 }),
  paymentId: varchar("payment_id", { length: 64 }),
  userId: varchar("user_id", { length: 255 }),
  ip: varchar("ip", { length: 64 }),
  status: varchar("status", { length: 32 }),
  error: text("error"),
  fromStatus: varchar("from_status", { length: 32 }),
  toStatus: varchar("to_status", { length: 32 }),
  detail: text("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_audit_trade_no").on(table.tradeNo),
  index("idx_audit_user").on(table.userId),
  index("idx_audit_type").on(table.type),
]);

// ============================================================
// V19.3.6 REAL OFFICIAL DATA PIPELINE
// Draw History + Sync Log + Validation Log
// ============================================================

export const drawHistory = mysqlTable("draw_history", {
  id: serial("id").primaryKey(),
  lotteryType: mysqlEnum("lottery_type", ["power", "lotto649", "daily539"]).notNull(),
  period: int("period").notNull(),
  drawDate: varchar("draw_date", { length: 16 }).notNull(),
  zone1: json("zone1").notNull(),
  zone2: int("zone2").notNull().default(0),
  source: mysqlEnum("source", ["official", "seed", "manual"]).notNull().default("seed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_draw_type").on(table.lotteryType),
  index("idx_draw_period").on(table.period),
  index("idx_draw_date").on(table.drawDate),
]);

export const drawSyncLog = mysqlTable("draw_sync_log", {
  id: serial("id").primaryKey(),
  lotteryType: mysqlEnum("lottery_type", ["power", "lotto649", "daily539"]).notNull(),
  syncTime: timestamp("sync_time").notNull().defaultNow(),
  newRecords: int("new_records").notNull().default(0),
  status: mysqlEnum("status", ["success", "partial", "failed", "skipped"]).notNull(),
  message: text("message"),
}, (table) => [
  index("idx_sync_type").on(table.lotteryType),
  index("idx_sync_time").on(table.syncTime),
]);

export const drawValidationLog = mysqlTable("draw_validation_log", {
  id: serial("id").primaryKey(),
  lotteryType: mysqlEnum("lottery_type", ["power", "lotto649", "daily539"]).notNull(),
  period: int("period"),
  errorType: mysqlEnum("error_type", [
    "invalid_period", "invalid_date", "wrong_count",
    "out_of_range", "duplicate_numbers", "invalid_special",
    "missing_field", "duplicate_record",
  ]).notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_val_type").on(table.lotteryType),
  index("idx_val_period").on(table.period),
]);

// ============================================================
// T01 (P0-A): Users Table — server-side identity source of truth
// 對應前端 localStorage 'lottery-v13-accounts' 的 UserAccount，
// 供後續 T02 (session/authedProcedure) 與 T03 (LS 帳號遷移) 使用。
// 注意：本表為「新增」，未改動 payments/subscriptions/webhook 等已驗證表。
// 密碼雜湊在 T01 先沿用既有字串欄位；T09 會改為 bcrypt/argon2（不在本版範圍）。
// ============================================================

export const users = mysqlTable("users", {
  // 沿用前端 UserAccount.id (cryptoId)；email 為自然唯一鍵
  id: varchar("id", { length: 64 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  nickname: varchar("nickname", { length: 128 }).notNull().default(""),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["guest", "free", "vip", "tester", "admin"])
    .notNull()
    .default("free"),
  vipTrialRemaining: int("vip_trial_remaining").notNull().default(3),
  dailyGenerateCount: int("daily_generate_count").notNull().default(0),
  dailyCountDate: varchar("daily_count_date", { length: 16 }).notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  forcePasswordChange: boolean("force_password_change").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_users_email").on(table.email),
  index("idx_users_role").on(table.role),
]);
