// ============================================================
// V19.0.4: CheckMacValue Test Utilities
// 正確計算 ECPay CheckMacValue 用於測試
// ============================================================

import { Hono } from "hono";
import { generateCheckMacValue } from "@/payment/ecpayCrypto";
import { getECPayConfig } from "@/payment/ecpayConfig";

const testCrypto = new Hono();

/** 產生正確的 CheckMacValue */
testCrypto.post("/api/test/generate-cmv", async (c) => {
  const body = await c.req.parseBody();
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key !== "CheckMacValue") {
      params[key] = String(value);
    }
  }

  const config = getECPayConfig();
  const cmv = generateCheckMacValue(params, config.hashKey, config.hashIV);

  return c.json({
    checkMacValue: cmv,
    params,
    config: {
      merchantId: config.merchantId,
      isSandbox: config.isSandbox,
    },
  });
});

export default testCrypto;
