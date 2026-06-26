// ============================================================
// V13.2 權限系統 - 五級身份
// 訪客(guest) / 免費(free) / VIP(vip) / 測試員(tester) / 管理員(admin)
// ============================================================

import {
  getCurrentRole,
  isAdmin,
  canUseVIPFeatures,
  getVipTrialRemaining,
  getDailyCountInfo,
  checkAndIncrementDailyCount,
  useVipTrial,
  upgradeToVip as _upgradeToVip,
  type UserRole,
} from './auth';

export type { UserRole };

// Batch 3d-6a: permissions 匯流點後端模式骨架（flag 預設 localStorage，行為不變）
import { getBackendAuthSnapshot } from './backendAuthSnapshot';
import { getPermissionsGuardSource, computeBackendRoleForPermissions, computeBackendPermissions } from './permissionsGuard';

export interface PermissionConfig {
  maxDailyGenerations: number;
  canSaveNumbers: boolean;
  canUseDream: boolean;
  canUseDreamAdvanced: boolean;
  canUseMetaphysics: boolean;
  canUseAdvancedOrientation: boolean;
  canUseAllMode: boolean;
  canExportCsv: boolean;
  canViewHistory: boolean;
  canViewBacktest: boolean;
  canViewModelCompetition: boolean;
  canUseVipTrial: boolean;
  // V18: 付費牆權限
  maxAIGenerations: number;       // AI推薦每日組數
  maxObservationPool: number;     // 觀察池容量
  canUseXuanxueCenter: boolean;   // AI玄學選號中心
  label: string;
  description: string;
}

export const PERMISSIONS: Record<UserRole, PermissionConfig> = {
  guest: {
    maxDailyGenerations: 3,
    canSaveNumbers: false,
    canUseDream: false,
    canUseDreamAdvanced: false,
    canUseMetaphysics: false,
    canUseAdvancedOrientation: false,
    canUseAllMode: false,
    canExportCsv: false,
    canViewHistory: false,
    canViewBacktest: false,
    canViewModelCompetition: false,
    canUseVipTrial: false,
    maxAIGenerations: 1,
    maxObservationPool: 5,
    canUseXuanxueCenter: false,
    label: '訪客',
    description: '可使用純統計，每日3次產號',
  },
  free: {
    maxDailyGenerations: 10,
    canSaveNumbers: true,
    canUseDream: true,
    canUseDreamAdvanced: false,
    canUseMetaphysics: false,
    canUseAdvancedOrientation: false,
    canUseAllMode: false,
    canExportCsv: false,
    canViewHistory: true,
    canViewBacktest: false,
    canViewModelCompetition: false,
    canUseVipTrial: true,
    maxAIGenerations: 1,
    maxObservationPool: 10,
    canUseXuanxueCenter: true,
    label: '免費會員',
    description: '養號+夢境+AI推薦1組+觀察池10碼',
  },
  vip: {
    maxDailyGenerations: 999,
    canSaveNumbers: true,
    canUseDream: true,
    canUseDreamAdvanced: true,
    canUseMetaphysics: true,
    canUseAdvancedOrientation: true,
    canUseAllMode: true,
    canExportCsv: true,
    canViewHistory: true,
    canViewBacktest: true,
    canViewModelCompetition: true,
    canUseVipTrial: false,
    maxAIGenerations: 5,
    maxObservationPool: 50,
    canUseXuanxueCenter: true,
    label: 'VIP 會員',
    description: '全部功能，AI推薦5組+觀察池50碼',
  },
  tester: {
    maxDailyGenerations: 999,
    canSaveNumbers: true,
    canUseDream: true,
    canUseDreamAdvanced: true,
    canUseMetaphysics: true,
    canUseAdvancedOrientation: true,
    canUseAllMode: true,
    canExportCsv: true,
    canViewHistory: true,
    canViewBacktest: true,
    canViewModelCompetition: true,
    canUseVipTrial: false,
    maxAIGenerations: 5,
    maxObservationPool: 50,
    canUseXuanxueCenter: true,
    label: '測試員',
    description: '無限測試所有功能，不可進入管理後台',
  },
  admin: {
    maxDailyGenerations: 999,
    canSaveNumbers: true,
    canUseDream: true,
    canUseDreamAdvanced: true,
    canUseMetaphysics: true,
    canUseAdvancedOrientation: true,
    canUseAllMode: true,
    canExportCsv: true,
    canViewHistory: true,
    canViewBacktest: true,
    canViewModelCompetition: true,
    canUseVipTrial: false,
    maxAIGenerations: 999,
    maxObservationPool: 999,
    canUseXuanxueCenter: true,
    label: '管理員',
    description: '所有功能+後台管理',
  },
};

/**
 * Batch 3d-6a: 匯流點 role 解析（同步）。
 * flag=localStorage（預設）→ 原本 getCurrentRole()；flag=backend → 由 snapshot 推得。
 * 對外仍以 getCurrentRole 既有簽名為主；此為內部一致化用。
 */
export function getEffectiveRole(): UserRole {
  if (getPermissionsGuardSource() === 'backend') {
    return computeBackendRoleForPermissions(getBackendAuthSnapshot()) as UserRole;
  }
  return getCurrentRole();
}

/** 取得當前權限配置 */
export function getCurrentPermissions(): PermissionConfig {
  // Batch 3d-6a: flag=backend → 由 snapshot 推得 role 取 PERMISSIONS；flag 預設 localStorage（行為不變）。
  if (getPermissionsGuardSource() === 'backend') {
    return computeBackendPermissions<PermissionConfig>(getBackendAuthSnapshot(), PERMISSIONS as Record<string, PermissionConfig>);
  }
  return PERMISSIONS[getCurrentRole()];
}

/** 檢查是否有指定權限 */
export function hasPermission(key: keyof PermissionConfig): boolean {
  return !!getCurrentPermissions()[key];
}

/** 檢查某個選號方式是否可用 */
export function isMethodAvailable(method: 'stat' | 'keep' | 'dream' | 'meta' | 'all'): {
  available: boolean;
  message?: string;
} {
  const perms = getCurrentPermissions();
  const role = getEffectiveRole();

  switch (method) {
    case 'stat':
      return { available: true };
    case 'keep':
      if (perms.canSaveNumbers) return { available: true };
      return { available: false, message: '註冊免費會員即可保存養號' };
    case 'dream':
      if (perms.canUseDream) return { available: true };
      return { available: false, message: '註冊免費會員即可使用夢境選牌' };
    case 'meta':
      if (perms.canUseMetaphysics) return { available: true };
      if (role === 'free') {
        const remaining = getVipTrialRemaining();
        if (remaining > 0) {
          return { available: true };
        }
        return { available: false, message: '命理輔助需VIP會員（或使用VIP體驗券）' };
      }
      return { available: false, message: '註冊會員以使用更多功能' };
    case 'all':
      if (perms.canUseAllMode) return { available: true };
      if (role === 'free') {
        const remaining = getVipTrialRemaining();
        if (remaining > 0) return { available: true };
      }
      return { available: false, message: '綜合模式需VIP會員' };
    default:
      return { available: false };
  }
}

/** 是否可以使用命理功能（含VIP體驗） */
export function canUseMetaphysics(): boolean {
  const perms = getCurrentPermissions();
  if (perms.canUseMetaphysics) return true;
  // 免費會員可用體驗券
  if (perms.canUseVipTrial && getVipTrialRemaining() > 0) return true;
  return false;
}

/** 是否可以使用綜合模式（含VIP體驗） */
export function canUseAllMode(): boolean {
  const perms = getCurrentPermissions();
  if (perms.canUseAllMode) return true;
  if (perms.canUseVipTrial && getVipTrialRemaining() > 0) return true;
  return false;
}

/** 產號前檢查 */
export function checkBeforeGenerate(): { allowed: boolean; message?: string } {
  const { allowed, used, limit } = checkAndIncrementDailyCount();
  if (!allowed) {
    return { allowed: false, message: `今日產號次數已用完（${used}/${limit}次），請明日再試或升級VIP` };
  }
  return { allowed: true };
}

/** 取得每日次數資訊 */
export { getDailyCountInfo };

/** 取得 VIP 體驗剩餘次數 */
export { getVipTrialRemaining };

/** 使用一次 VIP 體驗 */
export { useVipTrial };

/** 檢查是否為 VIP（含體驗） */
export { canUseVIPFeatures };

/** 檢查是否為管理員 */
export { isAdmin };

/** 取得當前角色 */
export { getCurrentRole };

/** VIP 升級 */
export function upgradeToVip(plan: 'monthly' | 'quarterly' | 'yearly'): boolean {
  return _upgradeToVip(plan);
}

/** 取得當前身份標籤 */
export function getRoleLabel(): string {
  return getCurrentPermissions().label;
}

/** 取得 VIP 體驗狀態文字 */
export function getVipTrialStatus(): { available: boolean; remaining: number; message: string } {
  const role = getEffectiveRole();
  if (role === 'vip' || role === 'tester' || role === 'admin') {
    return { available: true, remaining: 999, message: 'VIP會員，無需體驗券' };
  }
  const remaining = getVipTrialRemaining();
  if (remaining > 0) {
    return { available: true, remaining, message: `VIP體驗剩餘 ${remaining} 次` };
  }
  return { available: false, remaining: 0, message: 'VIP體驗已使用完畢' };
}
