// ============================================================
// V17.1: 台灣彩券數據獲取層 (lotteryApi.ts)
// 資料來源：local JSON 檔案 (模擬後端代理 API)
// 未來擴展：可替換為實際 HTTP API 調用
// ============================================================

import type { DrawRecord } from '@/types';
import type { LotteryType } from './lotteryConfig';

export type DataSourceStatus = 'loaded' | 'loading' | 'error' | 'empty';

export interface DataSourceInfo {
  lotteryType: LotteryType;
  count: number;
  firstPeriod: number;
  lastPeriod: number;
  firstDate: string;
  lastDate: string;
  status: DataSourceStatus;
  updatedAt: string;
}

/** 獲取指定彩種的歷史開獎數據 */
export async function fetchDrawHistory(lotteryType: LotteryType): Promise<{
  success: boolean;
  records: DrawRecord[];
  info: DataSourceInfo;
  message: string;
}> {
  const fileMap: Record<string, string> = {
    power: '/data/lottery/power_history.json',
    lotto649: '/data/lottery/lotto649_history.json',
    daily539: '/data/lottery/daily539_history.json',
  };

  try {
    const filePath = fileMap[lotteryType];
    if (!filePath) {
      return {
        success: false, records: [],
        info: { lotteryType, count: 0, firstPeriod: 0, lastPeriod: 0, firstDate: '', lastDate: '', status: 'empty', updatedAt: '' },
        message: `不支援的彩種: ${lotteryType}`,
      };
    }

    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const records: DrawRecord[] = await response.json();

    if (records.length === 0) {
      return {
        success: true, records: [],
        info: { lotteryType, count: 0, firstPeriod: 0, lastPeriod: 0, firstDate: '', lastDate: '', status: 'empty', updatedAt: '' },
        message: '無歷史數據',
      };
    }

    const info: DataSourceInfo = {
      lotteryType,
      count: records.length,
      firstPeriod: records[0].period,
      lastPeriod: records[records.length - 1].period,
      firstDate: records[0].date,
      lastDate: records[records.length - 1].date,
      status: 'loaded',
      updatedAt: new Date().toISOString(),
    };

    return { success: true, records, info, message: `已載入 ${records.length} 期` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    return {
      success: false, records: [],
      info: { lotteryType, count: 0, firstPeriod: 0, lastPeriod: 0, firstDate: '', lastDate: '', status: 'error', updatedAt: '' },
      message: `載入失敗: ${msg}`,
    };
  }
}

/** 檢查數據源可用性 */
export async function checkDataSource(lotteryType: LotteryType): Promise<{
  available: boolean;
  info: DataSourceInfo;
}> {
  const result = await fetchDrawHistory(lotteryType);
  return { available: result.success && result.records.length > 0, info: result.info };
}

/** 獲取所有支援彩種的數據源狀態 */
export async function getAllDataSourceStatus(): Promise<DataSourceInfo[]> {
  const types: LotteryType[] = ['power', 'lotto649', 'daily539'];
  const results: DataSourceInfo[] = [];
  for (const t of types) {
    const { info } = await checkDataSource(t);
    results.push(info);
  }
  return results;
}
