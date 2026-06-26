// ============================================================
// V19.0.1: Server-side Webhook Architecture
// 統一導出
// ============================================================

// Payment State Machine
export {
  type PaymentServerStatus,
  type StateMachineRecord,
  type TransitionContext,
  createPaymentState,
  transitionState,
  getPaymentState,
  isServerVerifiedPaid,
  canTransition,
  resetAllPaymentStates,
} from './paymentStateMachine';

// Verification Service
export {
  verifyECPayWebhook,
  verifyMockWebhook,
  resetVerificationState,
  type VerificationResult,
  type VerificationCheck,
} from './verificationService';

// Subscription Guard (VIP activation security)
export {
  guardedActivateSubscription,
  getPaymentStatusForDisplay,
  guardedDowngrade,
  type GuardedActivationResult,
} from './subscriptionGuard';

// Webhook Simulator (ReturnURL / ClientBackURL / OrderResultURL)
export {
  handleReturnURL,
  handleClientBackURL,
  handleOrderResultURL,
  simulateWebhookSuccess,
  simulateWebhookFailed,
  simulateWebhookDuplicate,
  simulateWebhookInvalidSignature,
  simulateWebhookAmountMismatch,
} from './webhookSimulator';

// Audit Logger
export {
  logWebhookReceived,
  logWebhookProcessed,
  logStateTransition,
  logVipActivated,
  logVipBlocked,
  queryAuditLogs,
  exportAuditLogCSV,
  clearAuditLogs,
  type AuditLogEntry,
} from './auditLogger';
