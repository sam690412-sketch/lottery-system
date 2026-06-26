// ============================================================
// V18.2.14 PHASE A: 會員漏斗統計 - 已遷移到 businessDataStorage
// 追蹤訪客→註冊→AI點擊→VIP瀏覽→升級點擊→付費 全漏斗
// ============================================================

import { loadJson, saveJson, removeKey } from '@/repositories/businessDataStorage';

const FUNNEL_KEY = 'lottery-v18-funnel';

export interface FunnelSnapshot {
  timestamp: string;
  visitors: number;      // 訪客數（頁面載入）
  registers: number;     // 註冊數
  aiClicks: number;      // AI推薦點擊
  vipViews: number;      // VIP頁瀏覽
  upgradeClicks: number; // 升級點擊
  payments: number;      // 實際付費（模擬）
}

/** 載入漏斗數據 */
function loadFunnel(): FunnelSnapshot {
  return loadJson<FunnelSnapshot>(FUNNEL_KEY, { timestamp: new Date().toISOString(), visitors: 0, registers: 0, aiClicks: 0, vipViews: 0, upgradeClicks: 0, payments: 0 });
}

/** 保存漏斗數據 */
function saveFunnel(data: FunnelSnapshot) {
  saveJson(FUNNEL_KEY, data);
}

/** 增加指定步驟的計數 */
export function trackFunnel(step: keyof FunnelSnapshot): void {
  if (step === 'timestamp') return;
  const funnel = loadFunnel();
  funnel[step] = (funnel[step] as number) + 1;
  funnel.timestamp = new Date().toISOString();
  saveFunnel(funnel);
}

/** 獲取當前漏斗數據 */
export function getFunnel(): FunnelSnapshot {
  return loadFunnel();
}

/** 計算轉換率 */
export function getConversionRates(): {
  visitorToRegister: number;
  registerToAIClick: number;
  aiClickToVIPView: number;
  vipViewToUpgrade: number;
  upgradeToPayment: number;
  overall: number;
} {
  const f = loadFunnel();
  return {
    visitorToRegister: f.visitors > 0 ? Math.round((f.registers / f.visitors) * 1000) / 10 : 0,
    registerToAIClick: f.registers > 0 ? Math.round((f.aiClicks / f.registers) * 1000) / 10 : 0,
    aiClickToVIPView: f.aiClicks > 0 ? Math.round((f.vipViews / f.aiClicks) * 1000) / 10 : 0,
    vipViewToUpgrade: f.vipViews > 0 ? Math.round((f.upgradeClicks / f.vipViews) * 1000) / 10 : 0,
    upgradeToPayment: f.upgradeClicks > 0 ? Math.round((f.payments / f.upgradeClicks) * 1000) / 10 : 0,
    overall: f.visitors > 0 ? Math.round((f.payments / f.visitors) * 1000) / 10 : 0,
  };
}

/** 重置漏斗 */
export function resetFunnel(): void {
  removeKey(FUNNEL_KEY);
  saveFunnel({ timestamp: new Date().toISOString(), visitors: 0, registers: 0, aiClicks: 0, vipViews: 0, upgradeClicks: 0, payments: 0 });
}

/** 匯出漏斗 CSV */
export function exportFunnelCSV(): string {
  const f = loadFunnel();
  const rates = getConversionRates();
  return [
    '指標,數值',
    `訪客數,${f.visitors}`,
    `註冊數,${f.registers}`,
    `AI推薦點擊,${f.aiClicks}`,
    `VIP頁瀏覽,${f.vipViews}`,
    `升級點擊,${f.upgradeClicks}`,
    `實際付費,${f.payments}`,
    '',
    '轉換率,百分比',
    `訪客→註冊,${rates.visitorToRegister}%`,
    `註冊→AI點擊,${rates.registerToAIClick}%`,
    `AI→VIP瀏覽,${rates.aiClickToVIPView}%`,
    `VIP→升級點擊,${rates.vipViewToUpgrade}%`,
    `升級→付費,${rates.upgradeToPayment}%`,
    `總轉換率,${rates.overall}%`,
  ].join('\n');
}
