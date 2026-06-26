// ============================================================
// V19.0 PHASE A: PaymentProvider Interface
// 統一金流閘道接口 - 支援 ECPay / Mock / 未來 Stripe
// ============================================================

import type { PlanType } from '@/utils/paymentModel';

/** 付款閘道類型 */
export type PaymentGateway = 'ecpay' | 'mock' | 'stripe';

/** 付款請求結果 */
export interface PaymentRequestResult {
  success: boolean;
  /** 付款頁面 URL (跳轉用) */
  paymentUrl?: string;
  /** 表單參數 (直接提交用) */
  formParams?: Record<string, string>;
  /** 交易編號 */
  tradeNo?: string;
  /** 錯誤訊息 */
  error?: string;
}

/** 付款驗證結果 */
export interface PaymentVerifyResult {
  success: boolean;
  /** 交易編號 */
  tradeNo?: string;
  /** 付款方式 */
  paymentMethod?: string;
  /** 付款時間 */
  paymentDate?: string;
  /** 方案 */
  plan?: PlanType;
  /** 錯誤訊息 */
  error?: string;
  /** 是否重複通知 */
  isDuplicate?: boolean;
}

/** 退款結果 */
export interface RefundResult {
  success: boolean;
  /** 退款交易編號 */
  refundTradeNo?: string;
  /** 錯誤訊息 */
  error?: string;
}

/** 訂閱資訊 */
export interface SubscriptionInfo {
  plan: PlanType | null;
  expiryDate: string | null;
  isActive: boolean;
  daysRemaining: number;
  autoRenew: boolean;
}

/** 付款閘道接口 */
export interface IPaymentGateway {
  /** 閘道名稱 */
  readonly name: PaymentGateway;
  /** 是否為測試模式 */
  readonly isSandbox: boolean;

  /** 建立付款請求 */
  createPayment(params: CreatePaymentParams): Promise<PaymentRequestResult>;

  /** 驗證付款回調 */
  verifyCallback(callbackData: Record<string, string>): Promise<PaymentVerifyResult>;

  /** 申請退款 */
  requestRefund(params: RefundParams): Promise<RefundResult>;

  /** 取得訂閱資訊 */
  getSubscription(userId: string): Promise<SubscriptionInfo>;

  /** 取消訂閱 */
  cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }>;
}

/** 建立付款參數 */
export interface CreatePaymentParams {
  /** 用戶ID */
  userId: string;
  /** 用戶Email */
  userEmail: string;
  /** 方案 */
  plan: PlanType;
  /** 方案名稱 */
  planName: string;
  /** 金額 */
  amount: number;
  /** 商品描述 */
  itemName: string;
  /** 用戶選擇的付款方式 */
  choosePayment?: 'ALL' | 'Credit' | 'ATM' | 'CVS' | 'BARCODE';
  /** 付款完成後返回頁面 */
  returnUrl: string;
  /** 用戶付款後返回頁面 (Client端) */
  clientBackUrl: string;
}

/** 退款參數 */
export interface RefundParams {
  /** 原始交易編號 */
  tradeNo: string;
  /** 退款金額 */
  amount: number;
  /** 退款原因 */
  reason?: string;
}

/** ECPay 特定配置 */
export interface ECPayConfig {
  /** MerchantID */
  merchantId: string;
  /** HashKey */
  hashKey: string;
  /** HashIV */
  hashIV: string;
  /** API 基礎 URL */
  apiUrl: string;
  /** 是否為測試環境 */
  isSandbox: boolean;
}

/** 付款方案顯示資訊 */
export interface PlanDisplayInfo {
  id: PlanType;
  name: string;
  price: number;
  period: string;
  save: string;
  features: string[];
  highlighted?: boolean;
}

/** 付款記錄顯示 */
export interface PaymentHistoryItem {
  id: string;
  plan: PlanType;
  amount: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  paymentMethod?: string;
  canRefund: boolean;
}

/** 付款統計 */
export interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  totalRefunds: number;
  activeSubscriptions: number;
  byPlan: Record<PlanType, { count: number; revenue: number }>;
}
