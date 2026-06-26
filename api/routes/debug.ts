// V19.0.5: Debug helper
import { Hono } from "hono";
import { verifyCheckMacValue } from "@/payment/ecpayCrypto";
import { getECPayConfig } from "@/payment/ecpayConfig";
import { createHash } from "node:crypto";

const debug = new Hono();

debug.post("/api/debug/verify-cmv", async (c) => {
  const body = await c.req.parseBody();
  const payload: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) payload[k] = String(v);

  const config = getECPayConfig();
  const received = payload.CheckMacValue;
  
  // Re-compute
  const sortedKeys = Object.keys(payload).filter(k => k !== 'CheckMacValue').sort();
  const paramStr = sortedKeys.map(k => `${k}=${payload[k]}`).join('&');
  const raw = `HashKey=${config.hashKey}&${paramStr}&HashIV=${config.hashIV}`;
  const encoded = encodeURIComponent(raw).toLowerCase()
    .replace(/%2d/g, '-').replace(/%5f/g, '_').replace(/%2e/g, '.')
    .replace(/%21/g, '!').replace(/%2a/g, '*').replace(/%28/g, '(').replace(/%29/g, ')')
    .replace(/%20/g, '+');
  const computed = createHash('sha256').update(encoded).digest('hex').toUpperCase();

  return c.json({
    received: received?.substring(0, 16) + '...',
    computed: computed.substring(0, 16) + '...',
    match: received === computed,
    paramCount: sortedKeys.length,
    params: sortedKeys,
  });
});

export default debug;
