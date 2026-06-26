// ============================================================
// V19.0.1 PHASE A: Webhook Server Simulator
// 模擬三種 ECPay URL 的差異
// ============================================================

import { verifyECPayWebhook, type VerificationResult } from './verificationService';
import { createPaymentState, getPaymentState } from './paymentStateMachine';
import { guardedActivateSubscription } from './subscriptionGuard';
import { logWebhookReceived, logWebhookProcessed } from './auditLogger';

// ============================================================
// ECPay 三種 URL 差異
// ============================================================

/**
 * ReturnURL (Server-side)
 * - ECPay 主動 POST 到我方伺服器
 * - 用於「接收付款結果通知」
 * - 必須回應 "1|OK"，否則 ECPay 會重送
 * - 建議只回應收到，不要做複雜業務邏輯
 * - 這裡做實際的狀態更新 + VIP 開通
 *
 * ClientBackURL (Browser)
 * - 用戶在 ECPay 付款頁面點「返回商店」
 * - 導回我方的瀏覽器頁面
 * - 不保證每次都有（用戶可能直接關閉）
 * - 只適合顯示 UI，不適合做業務邏輯
 * - 不能依賴此 URL 來更新訂單狀態
 *
 * OrderResultURL (Browser)
 * - 付款完成後自動導向的頁面
 * - 會帶上付款結果參數
 * - 也只適合顯示 UI
 * - 實際狀態應以 ReturnURL 通知為準
 */

/** ReturnURL 處理（核心 server-side webhook） */
export async function handleReturnURL(payload: Record<string, string>): Promise<{
  response: string;
  processed: boolean;
  verification: VerificationResult;
}> {
  const tradeNo = payload.MerchantTradeNo || 'unknown';

  // 1. 記錄 audit log
  logWebhookReceived({
    type: 'ReturnURL',
    tradeNo,
    payload,
    ip: 'server-side',
    timestamp: new Date().toISOString(),
  });

  // 2. 驗證
  const verification = verifyECPayWebhook(payload);

  // 3. 如果驗證通過且為 paid，自動激活訂閱
  if (verification.valid && verification.status === 'paid') {
    const state = getPaymentState(tradeNo);
    if (state) {
      const result = await guardedActivateSubscription({
        userId: state.userId,
        plan: state.plan as 'monthly' | 'quarterly' | 'yearly',
        tradeNo,
        amount: state.amount,
        paymentMethod: payload.PaymentType,
      });

      logWebhookProcessed({
        tradeNo,
        status: result.success ? 'activated' : 'activation_failed',
        error: result.error,
        timestamp: new Date().toISOString(),
      });

      return {
        response: '1|OK',
        processed: result.success,
        verification,
      };
    }
  }

  // Duplicate 也回應 OK（避免 ECPay 重送）
  if (verification.status === 'duplicate') {
    return { response: '1|OK', processed: true, verification };
  }

  logWebhookProcessed({
    tradeNo,
    status: verification.status,
    error: verification.error,
    timestamp: new Date().toISOString(),
  });

  return {
    response: '1|OK', // 即使驗證失敗也回應 OK，避免重送
    processed: false,
    verification,
  };
}

/** ClientBackURL 處理（僅顯示 UI，不做業務邏輯） */
export function handleClientBackURL(payload: Record<string, string>): {
  display: { title: string; message: string; status: string };
} {
  // ClientBackURL 只做顯示，不做任何業務邏輯
  const rtnCode = payload.RtnCode;
  const tradeNo = payload.MerchantTradeNo || '';

  if (rtnCode === '1' || rtnCode === '2') {
    return {
      display: {
        title: '付款處理中',
        message: `交易編號: ${tradeNo}\n請等待系統確認。請勿關閉此頁面。`,
        status: 'processing',
      },
    };
  }

  return {
    display: {
      title: '付款未完成',
      message: `交易編號: ${tradeNo}\n您已離開付款頁面。如已完成付款，請查看會員狀態。`,
      status: 'incomplete',
    },
  };
}

/** OrderResultURL 處理（僅顯示 UI，不做業務邏輯） */
export function handleOrderResultURL(payload: Record<string, string>): {
  display: { title: string; message: string; status: string };
} {
  const rtnCode = payload.RtnCode;
  const tradeNo = payload.MerchantTradeNo || '';

  if (rtnCode === '1' || rtnCode === '2') {
    return {
      display: {
        title: '付款已送出',
        message: `交易編號: ${tradeNo}\n付款結果將在數秒內更新。請查看會員狀態確認。`,
        status: 'submitted',
      },
    };
  }

  return {
    display: {
      title: '付款失敗',
      message: `交易編號: ${tradeNo}\n錯誤: ${payload.RtnMsg || '未知錯誤'}`,
      status: 'failed',
    },
  };
}

// ============================================================
// Mock Webhook 測試場景
// ============================================================

/** 模擬：成功 callback */
export async function simulateWebhookSuccess(tradeNo: string, userId: string, amount: number): Promise<{
  verification: VerificationResult;
  activation?: { success: boolean; subscriptionId?: string };
}> {
  // 1. 建立訂單狀態
  createPaymentState({ paymentId: `PAY-${tradeNo}`, tradeNo, userId, plan: 'monthly', amount });

  // 2. 模擬 ReturnURL payload
  const payload: Record<string, string> = {
    MerchantTradeNo: tradeNo,
    MerchantID: '2000132',
    RtnCode: '1',
    RtnMsg: '交易成功',
    TradeAmt: String(amount),
    PaymentDate: new Date().toISOString(),
    PaymentType: 'Credit',
    PaymentTypeChargeFee: '0',
    TradeDate: new Date().toISOString(),
    SimulatePaid: '1',
    CheckMacValue: 'MOCK_CMV_VALID',
    CustomField1: userId,
    CustomField2: 'monthly',
  };

  // 3. 處理 ReturnURL
  const result = await handleReturnURL(payload);

  // 4. 如果驗證通過，嘗試激活
  if (result.verification.valid && result.verification.status === 'paid') {
    const activation = await guardedActivateSubscription({
      userId,
      plan: 'monthly',
      tradeNo,
      amount,
      paymentMethod: 'Credit',
    });

    return {
      verification: result.verification,
      activation: {
        success: activation.success,
        subscriptionId: activation.subscriptionId,
      },
    };
  }

  return {
    verification: result.verification,
  };
}

/** 模擬：失敗 callback */
export async function simulateWebhookFailed(tradeNo: string, userId: string, amount: number): Promise<{
  verification: VerificationResult;
}> {
  createPaymentState({ paymentId: `PAY-${tradeNo}`, tradeNo, userId, plan: 'monthly', amount });

  const payload: Record<string, string> = {
    MerchantTradeNo: tradeNo,
    RtnCode: '10100073',
    RtnMsg: '付款失敗',
    TradeAmt: String(amount),
    CheckMacValue: 'MOCK_CMV_VALID',
    CustomField1: userId,
  };

  return handleReturnURL(payload).then(r => ({ verification: r.verification }));
}

/** 模擬：重複 callback */
export async function simulateWebhookDuplicate(tradeNo: string, userId: string, amount: number): Promise<{
  first: { verification: VerificationResult };
  duplicate: { verification: VerificationResult };
}> {
  // 第一次
  const first = await simulateWebhookSuccess(tradeNo, userId, amount);

  // 第二次（重複）
  const payload: Record<string, string> = {
    MerchantTradeNo: tradeNo,
    RtnCode: '1',
    TradeAmt: String(amount),
    CheckMacValue: 'MOCK_CMV_VALID',
    CustomField1: userId,
  };

  const dup = await handleReturnURL(payload);

  return {
    first: { verification: first.verification },
    duplicate: { verification: dup.verification },
  };
}

/** 模擬：無效 CheckMacValue */
export async function simulateWebhookInvalidSignature(tradeNo: string, userId: string, amount: number): Promise<{
  verification: VerificationResult;
}> {
  createPaymentState({ paymentId: `PAY-${tradeNo}`, tradeNo, userId, plan: 'monthly', amount });

  const payload: Record<string, string> = {
    MerchantTradeNo: tradeNo,
    RtnCode: '1',
    TradeAmt: String(amount),
    CheckMacValue: 'INVALID_CMV',
    CustomField1: userId,
  };

  return handleReturnURL(payload).then(r => ({ verification: r.verification }));
}

/** 模擬：金額不符 */
export async function simulateWebhookAmountMismatch(tradeNo: string, userId: string, amount: number): Promise<{
  verification: VerificationResult;
}> {
  createPaymentState({ paymentId: `PAY-${tradeNo}`, tradeNo, userId, plan: 'monthly', amount });

  const payload: Record<string, string> = {
    MerchantTradeNo: tradeNo,
    RtnCode: '1',
    TradeAmt: String(amount + 100), // 錯誤金額
    CheckMacValue: 'MOCK_CMV_VALID',
    CustomField1: userId,
  };

  return handleReturnURL(payload).then(r => ({ verification: r.verification }));
}
