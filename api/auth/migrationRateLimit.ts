// ============================================================
// T04a-1 — Migration endpoint rate limit (in-memory)
// 規則：
//   - IP + email：10 分鐘內最多 5 次
//   - IP（全域）：10 分鐘內最多 20 次
// 無 DB、無 Redis、無 migration。注入 now() 以利測試。
// 不觸及 ECPay/Webhook/付款/前端/gating。
// ============================================================

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_IP_EMAIL = 5;
const MAX_PER_IP = 20;

// key -> 時間戳陣列（僅保留視窗內）
const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  reason?: "ip+email" | "ip";
  retryAfterMs?: number;
}

function prune(arr: number[], now: number): number[] {
  const cutoff = now - WINDOW_MS;
  return arr.filter((t) => t > cutoff);
}

function peekCount(key: string, now: number): number {
  return prune(hits.get(key) ?? [], now).length;
}

function record(key: string, now: number): void {
  const arr = prune(hits.get(key) ?? [], now);
  arr.push(now);
  hits.set(key, arr);
}

/**
 * 檢查並記錄一次請求。allowed=false 時不應進入 migrationService。
 * @param ip 來源 IP
 * @param email 目標 email
 * @param now 目前時間（ms），預設 Date.now()
 */
export function checkMigrationRateLimit(
  ip: string,
  email: string,
  now: number = Date.now(),
): RateLimitResult {
  const ipKey = `ip:${ip}`;
  const ipEmailKey = `ipe:${ip}|${email.toLowerCase()}`;

  // 先檢查（不超過才記錄），避免被擋的請求也累積
  const ipEmailCount = peekCount(ipEmailKey, now);
  if (ipEmailCount >= MAX_PER_IP_EMAIL) {
    const oldest = prune(hits.get(ipEmailKey) ?? [], now)[0] ?? now;
    return { allowed: false, reason: "ip+email", retryAfterMs: oldest + WINDOW_MS - now };
  }

  const ipCount = peekCount(ipKey, now);
  if (ipCount >= MAX_PER_IP) {
    const oldest = prune(hits.get(ipKey) ?? [], now)[0] ?? now;
    return { allowed: false, reason: "ip", retryAfterMs: oldest + WINDOW_MS - now };
  }

  record(ipKey, now);
  record(ipEmailKey, now);
  return { allowed: true };
}

/** 測試用：清空計數。 */
export function __resetRateLimit(): void {
  hits.clear();
}

/** 從 Hono context headers 取得來源 IP（優先 x-forwarded-for）。 */
export function resolveClientIp(headers: {
  get: (name: string) => string | null;
}): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export const RATE_LIMIT_CONFIG = { WINDOW_MS, MAX_PER_IP_EMAIL, MAX_PER_IP } as const;
