// ============================================================
// V19.0.1 PHASE C: Payment State Machine
// 嚴格定義付款狀態與轉換規則
// 核心原則：只有 server webhook 驗證後才能進入 paid
// 前端 result page 只能「顯示」結果，不得直接開通 VIP
// ============================================================

/** 付款狀態 */
export type PaymentServerStatus =
  | 'pending'           // 訂單建立，等待付款
  | 'processing'        // 付款處理中
  | 'paid'              // 付款成功（僅 server webhook 可設定）
  | 'failed'            // 付款失敗
  | 'cancelled'         // 用戶取消
  | 'refunded'          // 已退款
  | 'duplicate'         // 重複通知（已處理過）
  | 'invalid_signature' // CheckMacValue 驗證失敗
  | 'amount_mismatch'   // 金額不符
  | 'expired';          // 訂單過期

/** 狀態轉換定義 */
interface Transition {
  from: PaymentServerStatus[];
  to: PaymentServerStatus;
  by: 'server_webhook' | 'server_cron' | 'admin_manual' | 'user_action';
  guard?: (ctx: TransitionContext) => boolean;
}

/** 轉換上下文 */
interface TransitionContext {
  paymentId: string;
  tradeNo: string;
  userId: string;
  requestedStatus: PaymentServerStatus;
  payload?: Record<string, string>;
  source: 'webhook' | 'frontend' | 'admin' | 'cron';
}

/** 狀態轉換規則表 */
const TRANSITIONS: Transition[] = [
  // pending 可轉換到：processing, paid, failed, cancelled, expired
  { from: ['pending'], to: 'processing', by: 'server_webhook' },
  { from: ['pending'], to: 'paid', by: 'server_webhook', guard: verifyPaidGuard },
  { from: ['pending'], to: 'failed', by: 'server_webhook' },
  { from: ['pending'], to: 'cancelled', by: 'user_action' },
  { from: ['pending'], to: 'expired', by: 'server_cron', guard: expiryGuard },

  // processing 可轉換到：paid, failed
  { from: ['processing'], to: 'paid', by: 'server_webhook', guard: verifyPaidGuard },
  { from: ['processing'], to: 'failed', by: 'server_webhook' },

  // paid 可轉換到：refunded
  { from: ['paid'], to: 'refunded', by: 'admin_manual', guard: refundGuard },

  // failed 不可再轉換（需重新下單）

  // cancelled 不可再轉換

  // refunded 不可再轉換

  // 特殊狀態（不可再轉換）
  // duplicate, invalid_signature, amount_mismatch
];

/** paid 轉換守衛：必須通過完整驗證 */
function verifyPaidGuard(ctx: TransitionContext): boolean {
  if (ctx.source !== 'webhook') return false;
  if (!ctx.payload) return false;

  // 必須有有效的 CheckMacValue 驗證標記
  const verified = ctx.payload._serverVerified === 'true';
  // 必須有對應的 MerchantTradeNo
  const hasTradeNo = !!ctx.payload.MerchantTradeNo;
  // RtnCode 必須為 1（成功）
  const isSuccess = ctx.payload.RtnCode === '1' || ctx.payload.RtnCode === '2';

  return verified && hasTradeNo && isSuccess;
}

/** 過期守衛 */
function expiryGuard(ctx: TransitionContext): boolean {
  const createdAt = ctx.payload?._createdAt;
  if (!createdAt) return false;
  const orderTime = new Date(createdAt).getTime();
  const now = Date.now();
  // 30 分鐘過期
  return now - orderTime > 30 * 60 * 1000;
}

/** 退款守衛 */
function refundGuard(ctx: TransitionContext): boolean {
  if (ctx.source !== 'admin') return false;
  // 7 天內
  const paidAt = ctx.payload?._paidAt;
  if (!paidAt) return false;
  const daysSince = (Date.now() - new Date(paidAt).getTime()) / 86400000;
  return daysSince <= 7;
}

/** 檢查狀態轉換是否合法 */
export function canTransition(
  currentStatus: PaymentServerStatus,
  targetStatus: PaymentServerStatus,
  ctx: TransitionContext
): boolean {
  // 禁止前端直接轉到 paid
  if (ctx.source === 'frontend' && targetStatus === 'paid') {
    console.error('[StateMachine] BLOCKED: frontend cannot transition to paid');
    return false;
  }

  // 禁止前端直接轉到任何 server-only 狀態
  if (ctx.source === 'frontend' && ['paid', 'duplicate', 'invalid_signature', 'amount_mismatch'].includes(targetStatus)) {
    console.error('[StateMachine] BLOCKED: frontend cannot set server-only status');
    return false;
  }

  const transition = TRANSITIONS.find(
    t => t.from.includes(currentStatus) && t.to === targetStatus
  );

  if (!transition) return false;

  // 檢查 guard
  if (transition.guard && !transition.guard(ctx)) return false;

  return true;
}

/** 狀態機記錄（模擬 server-side DB） */
interface StateMachineRecord {
  paymentId: string;
  tradeNo: string;
  userId: string;
  plan: string;
  amount: number;
  status: PaymentServerStatus;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  webhookPayload?: Record<string, string>;
  transitionHistory: { from: PaymentServerStatus; to: PaymentServerStatus; at: string; by: string }[];
}

const STORAGE_KEY = 'lottery-v19-payment-server-state';

/** 載入所有狀態記錄 */
function loadAllRecords(): Record<string, StateMachineRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** 保存所有狀態記錄 */
function saveAllRecords(records: Record<string, StateMachineRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // storage full
  }
}

/** 建立新訂單狀態 */
export function createPaymentState(params: {
  paymentId: string;
  tradeNo: string;
  userId: string;
  plan: string;
  amount: number;
}): StateMachineRecord {
  const records = loadAllRecords();
  const record: StateMachineRecord = {
    ...params,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    transitionHistory: [],
  };
  records[params.tradeNo] = record;
  saveAllRecords(records);
  return record;
}

/** 嘗試狀態轉換（server-side only） */
export function transitionState(
  tradeNo: string,
  targetStatus: PaymentServerStatus,
  ctx: Omit<TransitionContext, 'paymentId' | 'tradeNo' | 'userId'> & Partial<Pick<TransitionContext, 'userId'>>,
  webhookPayload?: Record<string, string>
): { success: boolean; record?: StateMachineRecord; error?: string } {
  const records = loadAllRecords();
  const record = records[tradeNo];

  if (!record) {
    return { success: false, error: '訂單不存在' };
  }

  const fullCtx: TransitionContext = {
    paymentId: record.paymentId,
    tradeNo,
    userId: ctx.userId || record.userId,
    requestedStatus: targetStatus,
    payload: webhookPayload,
    source: ctx.source,
  };

  if (!canTransition(record.status, targetStatus, fullCtx)) {
    return {
      success: false,
      error: `非法狀態轉換: ${record.status} -> ${targetStatus} (source: ${ctx.source})`,
    };
  }

  const oldStatus = record.status;
  record.status = targetStatus;
  record.updatedAt = new Date().toISOString();

  if (targetStatus === 'paid') {
    record.verifiedAt = new Date().toISOString();
    record.webhookPayload = webhookPayload;
  }

  record.transitionHistory.push({
    from: oldStatus,
    to: targetStatus,
    at: new Date().toISOString(),
    by: ctx.source,
  });

  records[tradeNo] = record;
  saveAllRecords(records);

  return { success: true, record };
}

/** 查詢訂單狀態 */
export function getPaymentState(tradeNo: string): StateMachineRecord | null {
  const records = loadAllRecords();
  return records[tradeNo] || null;
}

/** 檢查是否為 server-verified paid */
export function isServerVerifiedPaid(tradeNo: string): boolean {
  const record = getPaymentState(tradeNo);
  return record?.status === 'paid' && !!record.verifiedAt;
}

/** 重置所有狀態（測試用） */
export function resetAllPaymentStates(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export type { StateMachineRecord, TransitionContext };
