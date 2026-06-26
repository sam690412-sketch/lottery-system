// ============================================================
// V19.0: Payment Module - 統一導出
// ============================================================

export type {
  IPaymentGateway,
  PaymentGateway,
  PaymentRequestResult,
  PaymentVerifyResult,
  RefundResult,
  SubscriptionInfo,
  CreatePaymentParams,
  RefundParams,
  ECPayConfig,
  PlanDisplayInfo,
  PaymentHistoryItem,
  PaymentStats,
} from './types';

export { getPaymentGateway, setActiveGateway, getActiveGateway, getAvailableGateways, resetGatewayCache } from './providerFactory';
export { ECPayProvider } from './ecpayProvider';
export { MockProvider } from './mockProvider';
export { generateCheckMacValue, verifyCheckMacValue, generateTradeNo } from './ecpayCrypto';
export { getECPayConfig, PLAN_ITEM_NAMES, ECPAY_SANDBOX } from './ecpayConfig';
export { submitECPayForm, buildCheckoutUrl, isECPayCallback, parseCallbackFromUrl } from './checkoutForm';
export { activateSubscription, upgradeUserRole, downgradeUserRole, checkExpiredSubscriptions } from './subscriptionManager';
export { submitRefund, validateRefundReason, REFUND_REASONS } from './refundManager';
export { handlePaymentCallback, simulateServerWebhookThenActivate, simulatePaymentSuccess, simulatePaymentFailure, simulatePaymentCancel } from './webhookHandler';
