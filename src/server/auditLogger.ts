// ============================================================
// V19.0.1 PHASE F: Admin Audit Log
// 每次 callback 記錄完整資訊
// ============================================================

export interface AuditLogEntry {
  id: string;
  type: 'webhook_received' | 'webhook_processed' | 'state_transition' | 'vip_activated' | 'vip_blocked';
  tradeNo: string;
  paymentId?: string;
  userId?: string;
  ip: string;
  timestamp: string;
  payload?: Record<string, string>;
  verifyChecks?: { name: string; passed: boolean; detail?: string }[];
  status?: string;
  error?: string;
  fromStatus?: string;
  toStatus?: string;
  source: 'webhook' | 'frontend' | 'admin' | 'cron';
}

const AUDIT_LOG_KEY = 'lottery-v19-audit-log';
const MAX_LOG_ENTRIES = 1000;

/** 載入日誌 */
function loadLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** 保存日誌 */
function saveLogs(logs: AuditLogEntry[]): void {
  try {
    // 限制大小
    if (logs.length > MAX_LOG_ENTRIES) {
      logs = logs.slice(logs.length - MAX_LOG_ENTRIES);
    }
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
  } catch {
    // storage full, skip
  }
}

/** 記錄 Webhook 接收 */
export function logWebhookReceived(params: {
  type: string;
  tradeNo: string;
  payload: Record<string, string>;
  ip: string;
  timestamp: string;
}): void {
  const logs = loadLogs();
  const entry: AuditLogEntry = {
    id: `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    type: 'webhook_received',
    tradeNo: params.tradeNo,
    ip: params.ip,
    timestamp: params.timestamp,
    payload: { ...params.payload },
    source: 'webhook',
  };
  logs.push(entry);
  saveLogs(logs);
}

/** 記錄 Webhook 處理結果 */
export function logWebhookProcessed(params: {
  tradeNo: string;
  status: string;
  error?: string;
  timestamp: string;
  verifyChecks?: { name: string; passed: boolean; detail?: string }[];
}): void {
  const logs = loadLogs();
  const entry: AuditLogEntry = {
    id: `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    type: 'webhook_processed',
    tradeNo: params.tradeNo,
    ip: 'server-side',
    timestamp: params.timestamp,
    status: params.status,
    error: params.error,
    verifyChecks: params.verifyChecks,
    source: 'webhook',
  };
  logs.push(entry);
  saveLogs(logs);
}

/** 記錄狀態轉換 */
export function logStateTransition(params: {
  paymentId: string;
  tradeNo: string;
  userId: string;
  fromStatus: string;
  toStatus: string;
  timestamp: string;
}): void {
  const logs = loadLogs();
  const entry: AuditLogEntry = {
    id: `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    type: 'state_transition',
    tradeNo: params.tradeNo,
    paymentId: params.paymentId,
    userId: params.userId,
    ip: 'server-side',
    timestamp: params.timestamp,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    source: 'webhook',
  };
  logs.push(entry);
  saveLogs(logs);
}

/** 記錄 VIP 激活 */
export function logVipActivated(params: {
  userId: string;
  tradeNo: string;
  subscriptionId?: string;
  timestamp: string;
}): void {
  const logs = loadLogs();
  const entry: AuditLogEntry = {
    id: `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    type: 'vip_activated',
    tradeNo: params.tradeNo,
    userId: params.userId,
    ip: 'server-side',
    timestamp: params.timestamp,
    source: 'webhook',
  };
  logs.push(entry);
  saveLogs(logs);
}

/** 記錄 VIP 激活被阻擋 */
export function logVipBlocked(params: {
  userId: string;
  tradeNo: string;
  reason: string;
  timestamp: string;
}): void {
  const logs = loadLogs();
  const entry: AuditLogEntry = {
    id: `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    type: 'vip_blocked',
    tradeNo: params.tradeNo,
    userId: params.userId,
    ip: 'server-side',
    timestamp: params.timestamp,
    error: params.reason,
    source: 'frontend',
  };
  logs.push(entry);
  saveLogs(logs);
}

/** 查詢日誌 */
export function queryAuditLogs(filter?: {
  tradeNo?: string;
  userId?: string;
  type?: string;
  since?: string;
}): AuditLogEntry[] {
  let logs = loadLogs();

  if (filter?.tradeNo) {
    logs = logs.filter(l => l.tradeNo === filter.tradeNo);
  }
  if (filter?.userId) {
    logs = logs.filter(l => l.userId === filter.userId);
  }
  if (filter?.type) {
    logs = logs.filter(l => l.type === filter.type);
  }
  if (filter?.since) {
    logs = logs.filter(l => l.timestamp >= filter.since!);
  }

  // 最新的在前
  return logs.reverse();
}

/** 匯出日誌 CSV */
export function exportAuditLogCSV(): string {
  const logs = loadLogs();
  const lines = [
    'ID,類型,交易編號,用戶,IP,時間,狀態,錯誤',
    ...logs.map(l =>
      `${l.id},${l.type},${l.tradeNo},${l.userId || ''},${l.ip},${l.timestamp},${l.status || ''},${l.error || ''}`
    ),
  ];
  return lines.join('\n');
}

/** 清除日誌 */
export function clearAuditLogs(): void {
  localStorage.removeItem(AUDIT_LOG_KEY);
}
