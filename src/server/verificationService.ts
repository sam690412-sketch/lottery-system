// ============================================================
// V19.0.1 PHASE B: Server-side Webhook Verification
// ECPay 回調驗證 - 僅模擬 server-side 可用
// 前端無法直接呼叫此服務
// ============================================================

import { verifyCheckMacValue } from '@/payment/ecpayCrypto';
import { getECPayConfig } from '@/payment/ecpayConfig';
import { getPaymentState, createPaymentState, transitionState, type PaymentServerStatus } from './paymentStateMachine';

/** 驗證結果 */
export interface VerificationResult {
  /** 是否通過 */
  valid: boolean;
  /** 驗證狀態 */
  status: PaymentServerStatus;
  /** 錯誤訊息 */
  error?: string;
  /** 驗證項目 */
  checks: VerificationCheck[];
  /** 交易編號 */
  tradeNo: string;
}

/** 單項驗證 */
export interface VerificationCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

/** 已處理的交易編號集合（防止重複 callback） */
const processedTradeNos = new Set<string>();
const PROCESSED_KEY = 'lottery-v19-processed-trades';

/** 載入已處理集合 */
function loadProcessed(): void {
  try {
    const raw = localStorage.getItem(PROCESSED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      arr.forEach((t: string) => processedTradeNos.add(t));
    }
  } catch { /* ignore */ }
}

/** 保存已處理集合 */
function saveProcessed(): void {
  try {
    localStorage.setItem(PROCESSED_KEY, JSON.stringify([...processedTradeNos]));
  } catch { /* ignore */ }
}

// 初始化載入
loadProcessed();

/** 完整驗證 ECPay Webhook Payload */
export function verifyECPayWebhook(payload: Record<string, string>): VerificationResult {
  const tradeNo = payload.MerchantTradeNo || '';
  const checks: VerificationCheck[] = [];

  // 1. CheckMacValue 驗證
  const config = getECPayConfig();
  const cmvValid = payload.CheckMacValue
    ? verifyCheckMacValue(payload, config.hashKey, config.hashIV)
    : false;
  checks.push({
    name: 'CheckMacValue',
    passed: cmvValid,
    detail: cmvValid ? 'SHA256 驗證通過' : '簽名驗證失敗',
  });

  if (!cmvValid) {
    return {
      valid: false,
      status: 'invalid_signature',
      error: 'CheckMacValue 驗證失敗',
      checks,
      tradeNo,
    };
  }

  // 2. 交易編號存在性檢查
  const existing = getPaymentState(tradeNo);
  checks.push({
    name: 'TradeNoExists',
    passed: !!existing,
    detail: existing ? '訂單存在' : '訂單不存在',
  });

  if (!existing) {
    return {
      valid: false,
      status: 'invalid_signature',
      error: '交易編號不存在',
      checks,
      tradeNo,
    };
  }

  // 3. 金額比對
  const tradeAmt = parseInt(payload.TradeAmt || '0');
  const amountMatch = tradeAmt === existing.amount;
  checks.push({
    name: 'AmountMatch',
    passed: amountMatch,
    detail: amountMatch ? `金額符合: NT$${tradeAmt}` : `金額不符: 期望 NT$${existing.amount}, 收到 NT$${tradeAmt}`,
  });

  if (!amountMatch) {
    return {
      valid: false,
      status: 'amount_mismatch',
      error: `金額不符: 期望 NT$${existing.amount}, 收到 NT$${tradeAmt}`,
      checks,
      tradeNo,
    };
  }

  // 4. RtnCode 判斷
  const rtnCode = payload.RtnCode;
  const isSuccess = rtnCode === '1' || rtnCode === '2';
  checks.push({
    name: 'RtnCode',
    passed: isSuccess,
    detail: `RtnCode: ${rtnCode} (${isSuccess ? '成功' : '失敗'})`,
  });

  if (!isSuccess) {
    return {
      valid: false,
      status: 'failed',
      error: `交易失敗 (RtnCode: ${rtnCode}, RtnMsg: ${payload.RtnMsg || '未知'})`,
      checks,
      tradeNo,
    };
  }

  // 5. 重複通知檢查
  const isDuplicate = processedTradeNos.has(tradeNo) && existing.status === 'paid';
  checks.push({
    name: 'DuplicateCheck',
    passed: !isDuplicate,
    detail: isDuplicate ? '重複通知' : '首次通知',
  });

  if (isDuplicate) {
    return {
      valid: true, // duplicate 不算錯誤，但標記
      status: 'duplicate',
      error: '重複通知',
      checks,
      tradeNo,
    };
  }

  // 6. 狀態轉換
  const transitionResult = transitionState(tradeNo, 'paid', {
    source: 'webhook',
    requestedStatus: 'paid',
    userId: payload.CustomField1,
  }, { ...payload, _serverVerified: 'true' });

  checks.push({
    name: 'StateTransition',
    passed: transitionResult.success,
    detail: transitionResult.success ? '狀態轉換成功' : transitionResult.error,
  });

  if (transitionResult.success) {
    processedTradeNos.add(tradeNo);
    saveProcessed();
  }

  return {
    valid: transitionResult.success,
    status: transitionResult.success ? 'paid' : transitionResult.record?.status || 'failed',
    error: transitionResult.error,
    checks,
    tradeNo,
  };
}

/** 模擬 server-side 成功驗證（Mock 測試用） */
export function verifyMockWebhook(tradeNo: string, userId: string, amount: number): VerificationResult {
  // 建立訂單狀態（如果不存在）
  let existing = getPaymentState(tradeNo);
  if (!existing) {
    createPaymentState({ paymentId: `PAY-${tradeNo}`, tradeNo, userId, plan: 'monthly', amount });
  }

  // Mock 直接通過驗證
  const result = transitionState(tradeNo, 'paid', { source: 'webhook', requestedStatus: 'paid', userId }, {
    MerchantTradeNo: tradeNo,
    RtnCode: '1',
    _serverVerified: 'true',
  });

  const checks: VerificationCheck[] = [
    { name: 'MockCheck', passed: true, detail: 'Mock server verification passed' },
    { name: 'StateTransition', passed: result.success, detail: result.success ? 'OK' : result.error },
  ];

  if (result.success) {
    processedTradeNos.add(tradeNo);
    saveProcessed();
  }

  return {
    valid: result.success,
    status: result.success ? 'paid' : 'failed',
    error: result.error,
    checks,
    tradeNo,
  };
}

/** 重置驗證狀態（測試用） */
export function resetVerificationState(): void {
  processedTradeNos.clear();
  localStorage.removeItem(PROCESSED_KEY);
}
