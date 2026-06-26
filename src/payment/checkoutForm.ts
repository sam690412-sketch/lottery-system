// ============================================================
// V19.0 PHASE C: ECPay Checkout Form
// 自動構建並提交 ECPay 付款表單
// ============================================================

/**
 * 自動提交 ECPay 付款表單
 * 創建隱藏表單並 POST 到 ECPay
 */
export function submitECPayForm(paymentUrl: string, formParams: Record<string, string>): void {
  // 創建表單
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentUrl;
  form.style.display = 'none';

  // 添加所有參數
  Object.entries(formParams).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  // 提交
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

/**
 * 產生付款 URL (含查詢參數)
 * 用於 GET 方式或連結
 */
export function buildCheckoutUrl(
  paymentUrl: string,
  formParams: Record<string, string>
): string {
  const params = new URLSearchParams();
  Object.entries(formParams).forEach(([key, value]) => {
    params.append(key, value);
  });
  return `${paymentUrl}?${params.toString()}`;
}

/** 檢查是否在 ECPay 回調頁面 */
export function isECPayCallback(): boolean {
  const url = new URL(window.location.href);
  return url.searchParams.has('MerchantTradeNo') && url.searchParams.has('RtnCode');
}

/** 從 URL 解析 ECPay 回調參數 */
export function parseCallbackFromUrl(): Record<string, string> | null {
  const url = new URL(window.location.href);
  const params: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  if (Object.keys(params).length === 0) return null;
  return params;
}
