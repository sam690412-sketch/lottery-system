// ============================================================
// V12 命理取向系統 - 5種取向對應10種掛法
// ============================================================

export type OrientationId = 'wuxing' | 'gua' | 'shikong' | 'fun' | 'vip';

export interface OrientationConfig {
  id: OrientationId;
  name: string;
  subtitle: string;
  description: string;
  methods: string[];        // 啟用的掛法 method 名稱
  requiresBirthData: boolean;
  icon: string;             // lucide icon name
  color: string;
  vipOnly: boolean;
}

/** 五種命理取向 */
export const ORIENTATIONS: OrientationConfig[] = [
  {
    id: 'wuxing',
    name: '五行平衡型',
    subtitle: '補強五行不足',
    description: '適合想補強五行不足的使用者。透過八字五行、生肖流年分析你的命盤五行分布，找出最旺與最缺的元素，推薦對應號碼。',
    methods: ['八字五行', '生肖流年', '九星氣學'],
    requiresBirthData: true,
    icon: 'YinYang',
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20',
    vipOnly: false,
  },
  {
    id: 'gua',
    name: '卦象決策型',
    subtitle: '當下時機判斷',
    description: '適合想看今日氣場與當下時機的使用者。梅花易數、六爻、河洛理數三種掛法綜合判斷今日選號方向。',
    methods: ['梅花易數', '六爻', '河洛理數'],
    requiresBirthData: true,
    icon: 'Compass',
    color: 'text-amber-400 border-amber-500/40 bg-amber-950/20',
    vipOnly: false,
  },
  {
    id: 'shikong',
    name: '時空方位型',
    subtitle: '重視日期與流年',
    description: '適合重視日期、方位、流年的使用者。奇門遁甲簡化盤與玄空飛星分析時空能量分布。',
    methods: ['奇門遁甲', '玄空飛星'],
    requiresBirthData: true,
    icon: 'MapPin',
    color: 'text-sky-400 border-sky-500/40 bg-sky-950/20',
    vipOnly: false,
  },
  {
    id: 'fun',
    name: '直覺娛樂型',
    subtitle: '快速輕鬆參考',
    description: '適合不想填太多資料、只想快速參考的使用者。塔羅數字搭配今日尾數建議，輕鬆有趣。',
    methods: ['塔羅數字'],
    requiresBirthData: true,
    icon: 'Sparkles',
    color: 'text-pink-400 border-pink-500/40 bg-pink-950/20',
    vipOnly: false,
  },
  {
    id: 'vip',
    name: '進階綜合型',
    subtitle: '全部10種方法',
    description: '適合 VIP 進階會員。啟用全部10種掛法，包含紫微斗數、奇門遁甲、玄空飛星、九星氣學等完整分析。',
    methods: ['梅花易數', '六爻', '奇門遁甲', '八字五行', '紫微斗數', '河洛理數', '玄空飛星', '生肖流年', '九星氣學', '塔羅數字'],
    requiresBirthData: true,
    icon: 'Crown',
    color: 'text-purple-400 border-purple-500/40 bg-purple-950/20',
    vipOnly: true,
  },
];

/** 根據取向取得啟用的掛法名稱 */
export function getEnabledMethods(orientationId: OrientationId): string[] {
  const ori = ORIENTATIONS.find(o => o.id === orientationId);
  return ori?.methods || [];
}

/** 取得取向配置 */
export function getOrientation(id: OrientationId): OrientationConfig | undefined {
  return ORIENTATIONS.find(o => o.id === id);
}

/** 檢查取向是否需要出生資料 */
export function needsBirthData(orientationId: OrientationId): boolean {
  return getOrientation(orientationId)?.requiresBirthData ?? false;
}

/** 根據取向過濾掛法結果 */
export function filterDivinationByOrientation(
  results: { method: string; enabled: boolean }[],
  orientationId: OrientationId,
): typeof results {
  const enabledMethods = getEnabledMethods(orientationId);
  return results.map(r => ({
    ...r,
    enabled: enabledMethods.includes(r.method),
  }));
}

/** 取得白話說明 */
export function getOrientationReason(orientationId: OrientationId): string {
  const map: Record<OrientationId, string> = {
    wuxing: '依五行平衡補強個人化權重',
    gua: '依卦象判斷當下選號時機',
    shikong: '依時空流年能量分布選號',
    fun: '輕鬆直覺式娛樂參考',
    vip: '綜合10種掛法全分析',
  };
  return map[orientationId] || '';
}
