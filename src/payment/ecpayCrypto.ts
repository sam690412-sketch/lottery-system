// ============================================================
// V19.0 PHASE A: ECPay CheckMacValue 計算
// SHA256 加密 - 僅 Sandbox 測試使用
// ============================================================

/**
 * 產生 CheckMacValue (ECPay 標準算法)
 * 1. 參數按字母排序
 * 2. 拼接成 key1=value1&key2=value2... 格式
 * 3. 前後加上 HashKey 和 HashIV
 * 4. URL encode
 * 5. SHA256 加密
 * 6. 轉大寫
 */
export function generateCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIV: string
): string {
  // 1. 按字母排序參數
  const sortedKeys = Object.keys(params)
    .filter(k => k !== 'CheckMacValue')
    .sort();

  // 2. 拼接
  const paramStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&');

  // 3. 前後加上 HashKey/HashIV
  const raw = `HashKey=${hashKey}&${paramStr}&HashIV=${hashIV}`;

  // 4. URL encode (遵循 ECPay 規範)
  const encoded = encodeURIComponent(raw)
    .toLowerCase()
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%20/g, '+');

  // 5. SHA256
  const hash = sha256(encoded);

  // 6. 轉大寫
  return hash.toUpperCase();
}

/**
 * 驗證 CheckMacValue
 */
export function verifyCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIV: string
): boolean {
  const received = params.CheckMacValue;
  if (!received) return false;

  const computed = generateCheckMacValue(params, hashKey, hashIV);
  return received === computed;
}

/** 真正的 SHA256 (V19.0.5: Node.js crypto 優先，瀏覽器 fallback) */
function sha256(message: string): string {
  // Node.js environment (backend)
  if (typeof require !== 'undefined') {
    try {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(message).digest('hex');
    } catch { /* fall through */ }
  }
  // Fallback: check if crypto is available globally (some bundlers)
  if (typeof (globalThis as any).crypto !== 'undefined' && (globalThis as any).crypto.subtle) {
    throw new Error('SHA256 requires Node.js crypto. Web Crypto API is async-only.');
  }
  throw new Error('SHA256 not available: crypto module required');
}

/** 產生 MerchantTradeNo */
export function generateTradeNo(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${dateStr}${timeStr}${random}`;
}
