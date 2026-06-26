// ============================================================
// V19.3.5 AI Cache Engine
// Cache analysis results + auto-recompute after sync
// ============================================================

import type { LotteryType } from './lotteryAnalytics';

const CACHE_PREFIX = 'v1935-ai-cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  timestamp: string;
  lotteryType: LotteryType;
  params: string; // serialized params for cache key
}

function cacheKey(type: LotteryType, analysis: string, params?: string): string {
  return `${CACHE_PREFIX}:${type}:${analysis}:${params || 'default'}`;
}

/** Generic cache get */
function cacheGet<T>(type: LotteryType, analysis: string, params?: string): T | null {
  try {
    const raw = localStorage.getItem(cacheKey(type, analysis, params));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - new Date(entry.timestamp).getTime();
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(type, analysis, params));
      return null;
    }
    return entry.data;
  } catch { return null; }
}

/** Generic cache set */
function cacheSet<T>(type: LotteryType, analysis: string, data: T, params?: string) {
  try {
    const entry: CacheEntry<T> = { data, timestamp: new Date().toISOString(), lotteryType: type, params: params || 'default' };
    localStorage.setItem(cacheKey(type, analysis, params), JSON.stringify(entry));
  } catch { /* storage full, ignore */ }
}

/** Clear all AI caches (call after sync) */
export function clearAICache() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
  }
  keys.forEach(k => localStorage.removeItem(k));
}

/** Cache-aware wrapper for any analysis function */
export function withCache<T>(
  type: LotteryType,
  analysisName: string,
  params: string,
  compute: () => T
): T {
  const cached = cacheGet<T>(type, analysisName, params);
  if (cached !== null) return cached;
  const result = compute();
  cacheSet(type, analysisName, result, params);
  return result;
}

/** Get cache statistics */
export function getCacheStats(): { totalCaches: number; oldestCache: string; newestCache: string } {
  let total = 0;
  let oldest = '';
  let newest = '';

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      total++;
      try {
        const entry = JSON.parse(localStorage.getItem(key) || '{}');
        if (!oldest || entry.timestamp < oldest) oldest = entry.timestamp;
        if (!newest || entry.timestamp > newest) newest = entry.timestamp;
      } catch { /* ignore */ }
    }
  }

  return { totalCaches: total, oldestCache: oldest, newestCache: newest };
}
