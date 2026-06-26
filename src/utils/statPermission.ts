// ============================================================
// V14 統計分析權限系統
// ============================================================

import { getCurrentRole } from './auth';
import type { UserRole } from './auth';

/** 取得統計可查看期數上限 */
export function getStatisticsLimit(role?: UserRole): number {
  const r = role || getCurrentRole();
  switch (r) {
    case 'guest': return 100;
    case 'free': return 300;
    case 'vip': return 800;
    case 'tester': return Infinity;
    case 'admin': return Infinity;
    default: return 100;
  }
}

/** 是否可查看 VIP 深度分析 */
export function canViewDeepStats(role?: UserRole): boolean {
  const r = role || getCurrentRole();
  return r === 'vip' || r === 'tester' || r === 'admin';
}

/** 取得身份對應的期數顯示文字 */
export function getPeriodLabel(role?: UserRole): string {
  const r = role || getCurrentRole();
  switch (r) {
    case 'guest': return '最近 100 期';
    case 'free': return '最近 300 期';
    case 'vip': return '完整歷史資料';
    case 'tester': return '完整歷史資料';
    case 'admin': return '完整歷史資料';
    default: return '最近 100 期';
  }
}

/** 實際可用期數（取 min(權限上限, 資料總數)） */
export function getActualPeriodCount(dataCount: number, role?: UserRole): number {
  const limit = getStatisticsLimit(role);
  return Math.min(limit === Infinity ? dataCount : limit, dataCount);
}

/** 取得權限提示文字 */
export function getPermissionMessage(role?: UserRole): string {
  const r = role || getCurrentRole();
  switch (r) {
    case 'guest':
      return '你目前是訪客，可查看最近100期。註冊免費會員可查看300期，升級VIP可查看完整歷史統計。';
    case 'free':
      return '你目前是免費會員，可查看最近300期。升級VIP可查看完整歷史統計。';
    case 'vip':
      return '你是VIP會員，可查看完整歷史統計。如需全部原始資料匯出、特殊模型或企業版分析，請洽管理員。';
    case 'tester':
      return '測試員模式：可查看完整歷史統計與VIP深度分析。';
    case 'admin':
      return '管理員模式：可查看完整歷史統計與VIP深度分析，並可進入管理後台。';
    default:
      return '';
  }
}

/** 訪客/免費會員點擊VIP功能時顯示的提示 */
export function getVipLockedMessage(): string {
  const r = getCurrentRole();
  if (r === 'guest' || r === 'free') {
    return '完整歷史統計屬於 VIP 功能。如需大量歷史資料、完整回測或客製統計，請洽管理員。';
  }
  return '';
}

/** 是否需要顯示升級提示 */
export function shouldShowUpgradePrompt(role?: UserRole): boolean {
  const r = role || getCurrentRole();
  return r === 'guest' || r === 'free';
}
