// ============================================================
// V19 Sprint-4 — AI Personalization Engine
// 純前端 · 僅 localStorage · 不碰 13 層權重/統計/回測/開獎/會員/付款/權限。
// seed 只影響：排序 / 推薦理由 / 同分排序 / 動畫順序 / 人格 / session 文案。
// 全部可重現（無 Math.random）。所有文案為娛樂分析，不宣稱中獎率。
// ============================================================

// ---------- 通用：可重現雜湊（無亂數） ----------
function hashString(str: string): number {
  // FNV-1a 32-bit，確定性
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
// 由 seed 產生可重現的 0–1 序列（mulberry32）
function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- localStorage 安全存取 ----------
function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; }
  catch { return fallback; }
}
function lsSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// 匿名 ID（本機產生，無後端）
export function getAnonymousId(): string {
  const KEY = 'v19-anon-id';
  let id = lsGet<string>(KEY, '');
  if (!id) { id = 'anon-' + hashString(String(Date.now()) + '|' + navigator.userAgent).toString(36); lsSet(KEY, id); }
  return id;
}
function todayStr(): string { return new Date().toISOString().split('T')[0]; }

// ============================================================
// ① Personal Seed
// ============================================================
export interface PersonalSeedInputs {
  userId?: string | null;
  birthday?: string | null;
  createTime?: string | null;
  favoriteLottery?: string | null;
  dreamHistory?: string[];
  favoriteModules?: string[];
  recentAnalysis?: string[];
  recentCollections?: string[];
  recentVerification?: string[];
}
/** 產生個人化 seed（可重現；同人同日穩定，不同人不同）。不影響統計資料。 */
export function buildPersonalSeed(inputs: PersonalSeedInputs): number {
  const id = inputs.userId || getAnonymousId();
  const parts = [
    id,
    inputs.birthday || '',
    inputs.createTime || '',
    todayStr(),
    inputs.favoriteLottery || '',
    (inputs.dreamHistory || []).join(','),
    (inputs.favoriteModules || []).join(','),
    (inputs.recentAnalysis || []).join(','),
    (inputs.recentCollections || []).join(','),
    (inputs.recentVerification || []).join(','),
  ];
  return hashString(parts.join('|'));
}

// ============================================================
// ② AI Preference Memory（localStorage）
// ============================================================
export interface PreferenceMemory {
  moduleCounts: Record<string, number>;   // 偏好統計/夢境/生肖/八字/模組…
  collectedNumbers: number[];              // 最近收藏號碼
  excludedNumbers: number[];               // 最近排除號碼
  oddPreference: number;                   // 累積奇數偏好（>0 偏奇）
  highPreference: number;                  // 累積大號(>=某值)偏好
  lotteryCounts: Record<string, number>;   // 偏好彩種
}
const MEM_KEY = 'v19-pref-memory';
const emptyMemory = (): PreferenceMemory => ({ moduleCounts: {}, collectedNumbers: [], excludedNumbers: [], oddPreference: 0, highPreference: 0, lotteryCounts: {} });
export function getPreferenceMemory(): PreferenceMemory { return lsGet<PreferenceMemory>(MEM_KEY, emptyMemory()); }
/** 記錄一次分析的偏好（模組、彩種、收藏號碼等）。純 localStorage。 */
export function recordPreference(opts: { modules?: string[]; lottery?: string; collected?: number[]; excluded?: number[] }): void {
  const m = getPreferenceMemory();
  for (const mod of opts.modules || []) m.moduleCounts[mod] = (m.moduleCounts[mod] || 0) + 1;
  if (opts.lottery) m.lotteryCounts[opts.lottery] = (m.lotteryCounts[opts.lottery] || 0) + 1;
  for (const n of opts.collected || []) { m.collectedNumbers.unshift(n); if (n % 2 === 1) m.oddPreference++; else m.oddPreference--; if (n >= 25) m.highPreference++; else m.highPreference--; }
  m.collectedNumbers = m.collectedNumbers.slice(0, 50);
  for (const n of opts.excluded || []) m.excludedNumbers.unshift(n);
  m.excludedNumbers = Array.from(new Set(m.excludedNumbers)).slice(0, 50);
  lsSet(MEM_KEY, m);
}
/** 最常用的前 N 個模組。 */
export function topModules(n = 3): string[] {
  const m = getPreferenceMemory();
  return Object.entries(m.moduleCounts).sort((a, b) => b[1] - a[1]).slice(0, n).map(e => e[0]);
}

// ============================================================
// ③ Recommendation Diversity（70% 一致 / 30% seed 排序差異，可重現）
// ============================================================
/** 保留前 70% 排名不動，後 30% 以 seed 可重現重排。不改任何分數。 */
export function seededReorder<T>(ranked: T[], seed: number): T[] {
  if (ranked.length < 4) return ranked.slice();
  const keep = Math.ceil(ranked.length * 0.7);
  const head = ranked.slice(0, keep);
  const tail = ranked.slice(keep);
  const rng = seededRng(seed);
  // Fisher–Yates with seeded rng（可重現）
  for (let i = tail.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tail[i], tail[j]] = [tail[j], tail[i]];
  }
  return [...head, ...tail];
}

// ============================================================
// ④ AI Explanation Engine（組合式自然語言，100+ 組合，可重現，不虛構）
// ============================================================
const OPENERS = [
  '今天你主要選用了', '本次分析你加入了', '這次你挑了', '今天的配方包含', '你今日的選擇是',
];
const ODD_PHRASES = [
  '最近你比較偏好奇數，因此本次排序略提高奇數比例。',
  '你近期常選奇數，這次在同分號碼間略為傾向奇數。',
  '依你最近偏好，奇數在同分時排序稍微提前。',
];
const EVEN_PHRASES = [
  '最近你比較偏好偶數，因此本次排序略提高偶數比例。',
  '你近期常選偶數，這次在同分號碼間略為傾向偶數。',
  '依你最近偏好，偶數在同分時排序稍微提前。',
];
const HIGH_PHRASES = [
  '最近你常收藏較大的號碼，因此 AI 保留此偏好。',
  '你近期偏好 25 以上的號碼，這次在排序時納入此傾向。',
  '依收藏紀錄，較大號碼在同分時略為提前。',
];
const LOW_PHRASES = [
  '最近你常收藏較小的號碼，因此 AI 保留此偏好。',
  '你近期偏好較小的號碼，這次在排序時納入此傾向。',
  '依收藏紀錄，較小號碼在同分時略為提前。',
];
const DREAM_PHRASES = [
  (k: string) => `夢境近期出現「${k}」，因此加入「${k}」相關娛樂因子。`,
  (k: string) => `你最近夢到「${k}」，這次納入相關的娛樂聯想。`,
  (k: string) => `依夢境紀錄「${k}」，加入對應的娛樂因子（僅供參考）。`,
];
const MODULE_PHRASES = [
  (m: string) => `你常用的「${m}」這次也納入了。`,
  (m: string) => `延續你偏好的「${m}」。`,
  (m: string) => `保留你習慣的「${m}」分析。`,
];
const CLOSERS = [
  '再次提醒：以上皆為娛樂分析，不代表中獎率。',
  '溫馨提醒：本推薦為娛樂與偏好計算，不代表中獎機率，請理性購買。',
  '提醒你：這些是娛樂參考，與中獎無關，量力而為。',
];
/**
 * 組合式解釋（可重現，依 seed 選句；只引用實際存在的資料，不虛構）。
 * 組合數 ≥ 5(opener)×3(odd/even)×3(high/low)×3(dream)×3(module)×3(closer) > 100。
 */
export function buildExplanation(opts: {
  seed: number; selectedModules?: string[]; dreamKeyword?: string | null;
}): string {
  const rng = seededRng(opts.seed);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const mem = getPreferenceMemory();
  const lines: string[] = [];
  const mods = (opts.selectedModules && opts.selectedModules.length ? opts.selectedModules : topModules(4));
  if (mods.length) lines.push(`${pick(OPENERS)}：${mods.join('、')}。`);
  // 奇偶偏好（僅在有紀錄時才說）
  if (mem.oddPreference > 1) lines.push(pick(ODD_PHRASES));
  else if (mem.oddPreference < -1) lines.push(pick(EVEN_PHRASES));
  // 大小偏好（僅在有紀錄時）
  if (mem.highPreference > 1) lines.push(pick(HIGH_PHRASES));
  else if (mem.highPreference < -1) lines.push(pick(LOW_PHRASES));
  // 夢境（僅在實際有關鍵字時）
  if (opts.dreamKeyword) lines.push(pick(DREAM_PHRASES)(opts.dreamKeyword));
  // 常用模組（僅在有偏好紀錄時）
  const tm = topModules(1)[0];
  if (tm && (!opts.selectedModules || !opts.selectedModules.includes(tm))) lines.push(pick(MODULE_PHRASES)(tm));
  lines.push(pick(CLOSERS));
  return lines.join('\n');
}

// ============================================================
// ⑤ AI Confidence → 等級 + 星級（取消百分比）
// ============================================================
export type ConfidenceTier = 'Elite' | 'Balanced' | 'Explorer' | 'Experimental';
export interface TierResult { tier: ConfidenceTier; stars: string; label: string; }
/** 分數 → 等級/星級（展示用，非中獎率；不顯示百分比）。 */
export function scoreToTier(score: number): TierResult {
  if (score >= 85) return { tier: 'Elite', stars: '★★★★★', label: 'Elite' };
  if (score >= 70) return { tier: 'Balanced', stars: '★★★★☆', label: 'Balanced' };
  if (score >= 55) return { tier: 'Explorer', stars: '★★★☆☆', label: 'Explorer' };
  return { tier: 'Experimental', stars: '★★☆☆☆', label: 'Experimental' };
}

// ============================================================
// ⑥ Daily Personality（只影響說話方式/理由/動畫，不影響統計）
// ============================================================
export interface DailyPersonality { id: string; name: string; tone: string; }
const PERSONALITIES: DailyPersonality[] = [
  { id: 'analyst', name: '分析型', tone: '冷靜、數據導向' },
  { id: 'conservative', name: '保守型', tone: '穩健、偏熱號' },
  { id: 'explorer', name: '探索型', tone: '好奇、願試冷號' },
  { id: 'cold', name: '冷門型', tone: '反向、賭冷門' },
  { id: 'balanced', name: '平衡型', tone: '折衷、均衡' },
  { id: 'hot', name: '熱門型', tone: '跟隨熱號趨勢' },
  { id: 'dream', name: '夢境型', tone: '感性、重夢境' },
  { id: 'mystic', name: '命理型', tone: '神祕、重命理（娛樂）' },
];
/** 依 seed 決定今日人格（同人同日穩定）。 */
export function getDailyPersonality(seed: number): DailyPersonality {
  return PERSONALITIES[seed % PERSONALITIES.length];
}

// ============================================================
// ⑦ AI Session（今日建議/提醒，依目前資料自動產生，可重現）
// ============================================================
const SESSION_TIPS = [
  '今日建議：先看看今天的熱冷分布再決定。',
  '今日提醒：別太迷信熱號，冷號也有它的故事。',
  '今日適合觀察尾數分布。',
  '今日推薦試試加入夢境因子（娛樂參考）。',
  '今日推薦試試加入命理因子（娛樂參考）。',
  '今日提醒：奇偶平衡也值得參考。',
  '今日建議：把喜歡的號碼存進「我的號碼」追蹤看看。',
  '今日提醒：開獎後記得回來對獎驗證。',
];
/** 今日 session 訊息（依 seed 選，可重現）。 */
export function getTodaySession(seed: number, count = 3): string[] {
  const rng = seededRng(seed ^ 0x5f3759df);
  const pool = [...SESSION_TIPS];
  const out: string[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// ============================================================
// ⑨ Local History（最近 7 次；AI 只引用實際存在的資料）
// ============================================================
interface HistEntry { date: string; summary: string }
function pushHistory(key: string, entry: HistEntry, max = 7): void {
  const arr = lsGet<HistEntry[]>(key, []);
  arr.unshift(entry); lsSet(key, arr.slice(0, max));
}
export function recordAnalysisHistory(summary: string): void { pushHistory('v19-hist-analysis', { date: todayStr(), summary }); }
export function recordCollectionHistory(summary: string): void { pushHistory('v19-hist-collection', { date: todayStr(), summary }); }
export function recordVerificationHistory(summary: string): void { pushHistory('v19-hist-verification', { date: todayStr(), summary }); }
export function getLocalHistory() {
  return {
    analysis: lsGet<HistEntry[]>('v19-hist-analysis', []),
    collection: lsGet<HistEntry[]>('v19-hist-collection', []),
    verification: lsGet<HistEntry[]>('v19-hist-verification', []),
  };
}
/** AI 引用最近一次紀錄（若無則回空字串，不虛構）。 */
export function referenceRecent(): string {
  const h = getLocalHistory();
  if (h.analysis[0]) return `你最近一次分析：${h.analysis[0].summary}`;
  if (h.collection[0]) return `你最近收藏了：${h.collection[0].summary}`;
  return '';
}
