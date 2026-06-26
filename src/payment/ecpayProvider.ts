// ============================================================
// V19.0 PHASE A: ECPayProvider
// 綠界科技金流閘道實現 (Sandbox)
// ============================================================

import type {
  IPaymentGateway,
  CreatePaymentParams,
  RefundParams,
  PaymentRequestResult,
  PaymentVerifyResult,
  RefundResult,
  SubscriptionInfo,
} from './types';
import { getECPayConfig, PLAN_ITEM_NAMES } from './ecpayConfig';
import { generateCheckMacValue, generateTradeNo } from './ecpayCrypto';
import type { PlanType } from '@/utils/paymentModel';

export class ECPayProvider implements IPaymentGateway {
  readonly name = 'ecpay' as const;
  readonly isSandbox: boolean;

  private config = getECPayConfig();
  /** 交易編號映射 (tradeNo -> plan) */
  private tradePlanMap = new Map<string, PlanType>();

  constructor() {
    this.isSandbox = this.config.isSandbox;
    console.log('[ECPay] Provider initialized (Sandbox:', this.isSandbox, ')');
  }

  /** 建立付款請求 - 產生 ECPay 表單參數 */
  async createPayment(params: CreatePaymentParams): Promise<PaymentRequestResult> {
    try {
      const tradeNo = generateTradeNo();
      this.tradePlanMap.set(tradeNo, params.plan);

      const itemName = PLAN_ITEM_NAMES[params.plan] || params.itemName;
      const now = new Date();
      const merchantTradeDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${now.toTimeString().slice(0, 8)}`;

      // ECPay 表單參數
      const formParams: Record<string, string> = {
        MerchantID: this.config.merchantId,
        MerchantTradeNo: tradeNo,
        MerchantTradeDate: merchantTradeDate,
        PaymentType: 'aio',
        TotalAmount: String(params.amount),
        TradeDesc: '威力彩選號系統 VIP 訂閱',
        ItemName: itemName,
        ReturnURL: params.returnUrl,
        ClientBackURL: params.clientBackUrl,
        ChoosePayment: params.choosePayment || 'ALL',
        EncryptType: '1',
        CustomField1: params.userId,
        CustomField2: params.plan,
        CustomField3: params.userEmail,
      };

      // 產生 CheckMacValue
      formParams.CheckMacValue = generateCheckMacValue(
        formParams,
        this.config.hashKey,
        this.config.hashIV
      );

      // V19.0: 記錄 pending payment
      this.recordPendingPayment(tradeNo, params);

      return {
        success: true,
        paymentUrl: this.config.apiUrl,
        formParams,
        tradeNo,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'ECPay 付款建立失敗',
      };
    }
  }

  /** 驗證付款回調 */
  async verifyCallback(callbackData: Record<string, string>): Promise<PaymentVerifyResult> {
    try {
      // 1. 驗證 CheckMacValue
      const isValid = this.verifyMac(callbackData);
      if (!isValid) {
        return { success: false, error: 'CheckMacValue 驗證失敗' };
      }

      // 2. 取得交易資訊
      const tradeNo = callbackData.MerchantTradeNo;
      const rtnCode = callbackData.RtnCode;
      const paymentMethod = callbackData.PaymentType;
      const paymentDate = callbackData.PaymentDate;

      // 3. 檢查是否重複通知
      const isDuplicate = await this.checkDuplicate(tradeNo);

      // 4. 判斷結果
      if (rtnCode === '1' || rtnCode === '2') {
        const plan = this.tradePlanMap.get(tradeNo);
        return {
          success: true,
          tradeNo,
          paymentMethod,
          paymentDate,
          plan,
          isDuplicate,
        };
      }

      return {
        success: false,
        tradeNo,
        error: `交易失敗 (RtnCode: ${rtnCode}, RtnMsg: ${callbackData.RtnMsg || '未知'})`,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : '回調驗證失敗',
      };
    }
  }

  /** 申請退款 (Sandbox 模擬) */
  async requestRefund(params: RefundParams): Promise<RefundResult> {
    try {
      // V19.0: Sandbox 退款直接成功
      const refundTradeNo = `REF-${Date.now()}`;
      console.log('[ECPay Sandbox] 退款申請:', params.tradeNo, '金額:', params.amount);

      return {
        success: true,
        refundTradeNo,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : '退款失敗',
      };
    }
  }

  /** 取得訂閱資訊 */
  async getSubscription(userId: string): Promise<SubscriptionInfo> {
    // 從 paymentModel 讀取
    const { getMemberSubscriptionState } = await import('@/utils/paymentModel');
    const state = getMemberSubscriptionState(userId);

    return {
      plan: state.subscription?.plan || null,
      expiryDate: state.subscription?.expiresAt || null,
      isActive: state.isActive,
      daysRemaining: state.daysRemaining,
      autoRenew: state.subscription?.autoRenew || false,
    };
  }

  /** 取消訂閱 */
  async cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { updateSubscriptionStatus } = await import('@/utils/paymentModel');
      const { getMemberSubscriptionState } = await import('@/utils/paymentModel');
      const state = getMemberSubscriptionState(userId);

      if (!state.subscription) {
        return { success: false, error: '無活躍訂閱' };
      }

      updateSubscriptionStatus(state.subscription.id, 'canceled', {
        canceledAt: new Date().toISOString(),
        cancelAtPeriodEnd: true,
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : '取消訂閱失敗',
      };
    }
  }

  // ---- 私有方法 ----

  /** 驗證 CheckMacValue (V19.0.5: 使用已導入的 generateCheckMacValue) */
  private verifyMac(data: Record<string, string>): boolean {
    try {
      const params: Record<string, string> = {};
      Object.keys(data).filter(k => k !== 'CheckMacValue').forEach(k => { params[k] = data[k]; });
      const computed = generateCheckMacValue(params, this.config.hashKey, this.config.hashIV);
      return data.CheckMacValue === computed;
    } catch { return false; }
  }

  /** 檢查重複通知 */
  private async checkDuplicate(_tradeNo: string): Promise<boolean> {
    return false; // V19.0: 簡化處理
  }

  /** 記錄 pending payment */
  private recordPendingPayment(_tradeNo: string, params: CreatePaymentParams): void {
    try {
      import('@/utils/paymentModel').then(({ createPayment }) => {
        const record = createPayment(params.userId, params.plan);
        console.log('[ECPay] Pending payment recorded:', record.id);
      }).catch(() => {});
    } catch {
      // 不阻塞主流程
    }
  }
}
