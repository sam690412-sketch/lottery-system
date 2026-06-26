// ============================================================
// P0-PAY-01 / TASK A: Server-side authoritative price table
// 後端權威價格表 — 付款金額的唯一真相來源。
// 前端傳入的 amount / price / totalAmount / durationDays 一律忽略。
// 本檔為純模組（無外部 import），可獨立進行單元測試。
// 注意：未改動 webhook / ecpayCrypto / ECPay Provider / 會員系統。
// ============================================================

export type PlanId = "monthly" | "quarterly" | "yearly";

export interface PlanPrice {
  /** 金額（新台幣），伺服器權威值 */
  amount: number;
  /** 訂閱天數（供後續使用；本工單不改動 webhook 開通邏輯） */
  durationDays: number;
}

/** 固定方案表 — 唯一可信的金額來源 */
export const PLAN_PRICE_TABLE: Record<PlanId, PlanPrice> = {
  monthly: { amount: 299, durationDays: 30 },
  quarterly: { amount: 799, durationDays: 90 },
  yearly: { amount: 2999, durationDays: 365 },
};

/** 型別守衛：plan 是否為合法方案 */
export function isValidPlan(plan: string): plan is PlanId {
  return Object.prototype.hasOwnProperty.call(PLAN_PRICE_TABLE, plan);
}

/** 取得方案價格；plan 不存在時回傳 null（呼叫端應據此 throw BAD_REQUEST） */
export function getPlanPrice(plan: string): PlanPrice | null {
  return isValidPlan(plan) ? PLAN_PRICE_TABLE[plan] : null;
}
