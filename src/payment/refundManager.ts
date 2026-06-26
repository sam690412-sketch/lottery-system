// ============================================================
// V19.0 PHASE F: Refund Manager
// 退款流程管理
// ============================================================

import { requestRefund, canRefund } from '@/utils/paymentModel';
import { trackRefundRequest, trackRefundCompleted } from '@/utils/analytics';


/** 退款申請結果 */
export interface RefundApplication {
  success: boolean;
  refundId?: string;
  message: string;
  error?: string;
}

/** 提交退款申請 */
export async function submitRefund(
  paymentId: string,
  reason: string
): Promise<RefundApplication> {
  // 1. 檢查是否可退款
  if (!canRefund(paymentId)) {
    return {
      success: false,
      message: '此付款已超過7天退款期限或不符合退款條件',
    };
  }

  // 2. 記錄退款申請
  trackRefundRequest(paymentId, reason);

  // 3. 執行退款
  const result = requestRefund(paymentId, reason);

  if (result.success) {
    trackRefundCompleted(paymentId);
    return {
      success: true,
      refundId: `REF-${Date.now()}`,
      message: '退款申請已提交，預計 7-14 個工作日退回原付款方式',
    };
  }

  return {
    success: false,
    message: result.error || '退款失敗',
    error: result.error,
  };
}

/** 退款申請表單驗證 */
export function validateRefundReason(reason: string): { valid: boolean; error?: string } {
  if (!reason || reason.trim().length === 0) {
    return { valid: false, error: '請填寫退款原因' };
  }
  if (reason.trim().length < 5) {
    return { valid: false, error: '退款原因至少需要 5 個字' };
  }
  if (reason.trim().length > 200) {
    return { valid: false, error: '退款原因不可超過 200 字' };
  }
  return { valid: true };
}

/** 退款原因選項 */
export const REFUND_REASONS = [
  '功能不符合預期',
  '選號結果不滿意',
  '誤觸訂閱',
  '已找到其他工具',
  '價格考量',
  '其他原因 (請詳述)',
];
