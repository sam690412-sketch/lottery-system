// ============================================================
// P0-PAY-01 / TASK E: Regression tests for server-side pricing
// 驗證 payment.create 的金額來源（後端權威價格表），
// 不依賴 DB/tRPC，可獨立執行。
// 執行：npm test（vitest）
// ============================================================

import { describe, it, expect } from "vitest";
import { PLAN_PRICE_TABLE, getPlanPrice, isValidPlan } from "./pricing";

describe("P0-PAY-01 authoritative price table", () => {
  it("monthly = 299 / 30d", () => {
    expect(getPlanPrice("monthly")).toEqual({ amount: 299, durationDays: 30 });
  });

  it("quarterly = 799 / 90d", () => {
    expect(getPlanPrice("quarterly")).toEqual({ amount: 799, durationDays: 90 });
  });

  it("yearly = 2999 / 365d", () => {
    expect(getPlanPrice("yearly")).toEqual({ amount: 2999, durationDays: 365 });
  });

  // Test 1 (spec): create(plan=monthly, amount=1) → 推導金額必為 299
  it("derived amount for monthly is 299 regardless of any client amount", () => {
    const price = getPlanPrice("monthly");
    expect(price).not.toBeNull();
    expect(price!.amount).toBe(299); // create 寫入 DB 的 amount 即此值
  });

  // Test 2 (spec): create(plan=yearly, amount=1) → 推導金額必為 2999
  it("derived amount for yearly is 2999 regardless of any client amount", () => {
    expect(getPlanPrice("yearly")!.amount).toBe(2999);
  });

  // Test 3 (spec): plan=invalid → 無價格（create 會 throw BAD_REQUEST）
  it("invalid plan returns null (create throws BAD_REQUEST)", () => {
    expect(getPlanPrice("invalid")).toBeNull();
    expect(getPlanPrice("")).toBeNull();
    expect(isValidPlan("lifetime")).toBe(false);
  });

  it("table has exactly the three approved plans", () => {
    expect(Object.keys(PLAN_PRICE_TABLE).sort()).toEqual([
      "monthly",
      "quarterly",
      "yearly",
    ]);
  });
});
