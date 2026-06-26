// ============================================================
// V19.0.7 Render Deployment: ECPay Configuration
// 從環境變量讀取，支援 Render 部署
// ============================================================

import type { ECPayConfig } from './types';

/** 從環境變量取得配置 */
function getEnvVar(key: string, fallback: string): string {
  // Vite 環境變量以 VITE_ 開頭
  // Node 環境變量直接使用
  const viteKey = `VITE_${key}`;
  return import.meta.env?.[viteKey]
    || import.meta.env?.[key]
    || (typeof process !== 'undefined' ? process.env[key] : undefined)
    || fallback;
}

/** 取得 Render 公開網址 */
function getPublicBaseUrl(): string {
  // 優先使用 PUBLIC_BASE_URL (Render 環境變量)
  const fromEnv = typeof process !== 'undefined'
    ? process.env.PUBLIC_BASE_URL
    : undefined;

  if (fromEnv) return fromEnv;

  // 開發環境 fallback
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:3000';
}

/** 取得 MerchantID */
function getMerchantId(): string {
  return getEnvVar('ECPAY_MERCHANT_ID', '2000132');
}

/** 取得 HashKey */
function getHashKey(): string {
  return getEnvVar('ECPAY_HASH_KEY', '5294y06JbISpM5x9');
}

/** 取得 HashIV */
function getHashIV(): string {
  return getEnvVar('ECPAY_HASH_IV', 'v77hoKGq4kWxNNIS');
}

/** 是否為 Sandbox */
function getIsSandbox(): boolean {
  const env = getEnvVar('ECPAY_ENV', 'sandbox');
  return env === 'sandbox';
}

/** 取得 ECPay API URL */
function getApiUrl(): string {
  return getIsSandbox()
    ? 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'
    : 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5';
}

/** 取得 ECPay 配置 */
export function getECPayConfig(): ECPayConfig {
  return {
    merchantId: getMerchantId(),
    hashKey: getHashKey(),
    hashIV: getHashIV(),
    apiUrl: getApiUrl(),
    isSandbox: getIsSandbox(),
  };
}

/** 取得 ReturnURL (後端 Webhook 接收地址) */
export function getReturnUrl(): string {
  const baseUrl = getPublicBaseUrl();
  // 確保沒有尾部斜線
  const clean = baseUrl.replace(/\/$/, '');
  return `${clean}/api/payment/ecpay/return`;
}

/** 取得 ClientBackURL (付款完成後用戶看到的頁面) */
export function getClientBackUrl(): string {
  const baseUrl = getPublicBaseUrl();
  const clean = baseUrl.replace(/\/$/, '');
  return `${clean}/payment/result`;
}

/** 取得 OrderResultURL */
export function getOrderResultUrl(): string {
  const baseUrl = getPublicBaseUrl();
  const clean = baseUrl.replace(/\/$/, '');
  return `${clean}/payment/result`;
}

/** 方案對應的 ECPay 商品名稱 */
export const PLAN_ITEM_NAMES: Record<string, string> = {
  monthly: '威力彩選號系統 - 月費方案',
  quarterly: '威力彩選號系統 - 季費方案',
  yearly: '威力彩選號系統 - 年費方案',
};
