/**
 * historySourceAdapter.ts  (V25-D — Official Data Provider Interface)
 *
 * 歷史開獎「資料來源」的統一介面層。本版只定義介面與骨架,
 * 不連線、不下載、不做任何 HTTP request、不引用 fetch / axios / API、不接 UI。
 * 所有 load/connect 類方法一律 throw new Error('Not implemented'),待後續版本實作。
 *
 * 不修改 HistoryProvider / historyEngine / 任何既有程式;與 V25-B 驗證、V25-C 匯入解耦。
 */

import type { RawHistoryRecord } from './historyValidation';

/* ============================================================
 * 型別
 * ========================================================== */

export type HistorySourceKind = 'official' | 'json' | 'csv' | 'manual';

/** 可信度等級。 */
export type TrustLevel = 'official' | 'unofficial' | 'user' | 'simulated';

export interface HistorySourceMeta {
  id: string;
  name: string;
  kind: HistorySourceKind;
  trustLevel: TrustLevel;
  /** 資料自述來源(如 official-api / manual / taiwan-lottery-seed)。 */
  source?: string;
  /** 最後更新時間(ISO);介面層未知。 */
  updatedAt?: string | null;
  /** 總筆數;介面層未知。 */
  total?: number | null;
}

/** 來源描述(給設定頁/選單列出可用來源,不含實作)。 */
export interface HistorySourceDescriptor {
  kind: HistorySourceKind;
  name: string;
  trust: TrustLevel;
  /** 是否可寫入/匯入(官方為唯讀)。 */
  writable: boolean;
  /** 是否支援增量更新(只抓最新)。 */
  incremental: boolean;
  /** 是否支援歷史查詢。 */
  history: boolean;
  /** 是否提供獎金資訊。 */
  prize: boolean;
  /** 是否支援資料驗證。 */
  validation: boolean;
}

/** 統一資料來源介面。 */
export interface HistorySourceAdapter {
  readonly id: string;
  readonly name: string;
  readonly kind: HistorySourceKind;
  readonly trustLevel: TrustLevel;
  readonly description: string;
  readonly supportsIncrementalUpdate: boolean;
  readonly supportsPrize: boolean;
  readonly supportsHistory: boolean;
  readonly supportsValidation: boolean;

  /** 取得指定彩種全部歷史。 */
  loadHistory(lotteryType: string): Promise<RawHistoryRecord[]>;
  /** 取得指定彩種最新一期。 */
  loadLatest(lotteryType: string): Promise<RawHistoryRecord | null>;
  /** 取得來源 meta。 */
  getMeta(): Promise<HistorySourceMeta>;
  /** 驗證連線/可用性(官方 API 連得到、檔案可讀等)。 */
  validateConnection(): Promise<boolean>;
}

const NOT_IMPLEMENTED = 'Not implemented';

/* ============================================================
 * 四個 Adapter(介面層骨架;方法皆 Not implemented)
 * ========================================================== */

/** 官方來源(未來串接官方開獎;本版不連線、不下載)。 */
export class OfficialHistoryAdapter implements HistorySourceAdapter {
  readonly id = 'official';
  readonly name = '官方開獎資料';
  readonly kind: HistorySourceKind = 'official';
  readonly trustLevel: TrustLevel = 'official';
  readonly description = '串接官方/可信來源的歷史開獎(本版未連線,僅介面骨架)。';
  readonly supportsIncrementalUpdate = true;
  readonly supportsPrize = true;
  readonly supportsHistory = true;
  readonly supportsValidation = true;

  async loadHistory(_lotteryType: string): Promise<RawHistoryRecord[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async loadLatest(_lotteryType: string): Promise<RawHistoryRecord | null> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getMeta(): Promise<HistorySourceMeta> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async validateConnection(): Promise<boolean> {
    throw new Error(NOT_IMPLEMENTED);
  }
}

/** JSON 來源(使用者提供的 JSON;解析交由 V25-C,本版不實作載入)。 */
export class JsonHistoryAdapter implements HistorySourceAdapter {
  readonly id = 'json';
  readonly name = 'JSON 匯入';
  readonly kind: HistorySourceKind = 'json';
  readonly trustLevel: TrustLevel = 'unofficial';
  readonly description = '由 JSON(陣列或分組格式)匯入歷史資料(本版未實作載入)。';
  readonly supportsIncrementalUpdate = false;
  readonly supportsPrize = false;
  readonly supportsHistory = true;
  readonly supportsValidation = true;

  async loadHistory(_lotteryType: string): Promise<RawHistoryRecord[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async loadLatest(_lotteryType: string): Promise<RawHistoryRecord | null> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getMeta(): Promise<HistorySourceMeta> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async validateConnection(): Promise<boolean> {
    throw new Error(NOT_IMPLEMENTED);
  }
}

/** CSV 來源(使用者提供的 CSV;解析交由 V25-C,本版不實作載入)。 */
export class CsvHistoryAdapter implements HistorySourceAdapter {
  readonly id = 'csv';
  readonly name = 'CSV 匯入';
  readonly kind: HistorySourceKind = 'csv';
  readonly trustLevel: TrustLevel = 'user';
  readonly description = '由 CSV 匯入人工整理的歷史資料(本版未實作載入)。';
  readonly supportsIncrementalUpdate = false;
  readonly supportsPrize = false;
  readonly supportsHistory = true;
  readonly supportsValidation = true;

  async loadHistory(_lotteryType: string): Promise<RawHistoryRecord[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async loadLatest(_lotteryType: string): Promise<RawHistoryRecord | null> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getMeta(): Promise<HistorySourceMeta> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async validateConnection(): Promise<boolean> {
    throw new Error(NOT_IMPLEMENTED);
  }
}

/** 手動輸入來源(管理端逐期補單;本版不實作載入)。 */
export class ManualHistoryAdapter implements HistorySourceAdapter {
  readonly id = 'manual';
  readonly name = '手動輸入';
  readonly kind: HistorySourceKind = 'manual';
  readonly trustLevel: TrustLevel = 'user';
  readonly description = '管理端手動輸入單期開獎(本版未實作載入)。';
  readonly supportsIncrementalUpdate = true;
  readonly supportsPrize = false;
  readonly supportsHistory = true;
  readonly supportsValidation = true;

  async loadHistory(_lotteryType: string): Promise<RawHistoryRecord[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async loadLatest(_lotteryType: string): Promise<RawHistoryRecord | null> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getMeta(): Promise<HistorySourceMeta> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async validateConnection(): Promise<boolean> {
    throw new Error(NOT_IMPLEMENTED);
  }
}

/* ============================================================
 * Factory
 * ========================================================== */

/** 依 kind 建立對應 Adapter。 */
export function createHistorySourceAdapter(kind: HistorySourceKind): HistorySourceAdapter {
  switch (kind) {
    case 'official':
      return new OfficialHistoryAdapter();
    case 'json':
      return new JsonHistoryAdapter();
    case 'csv':
      return new CsvHistoryAdapter();
    case 'manual':
      return new ManualHistoryAdapter();
    default: {
      // 窮舉檢查:新增 kind 時編譯期會提示
      const never: never = kind;
      throw new Error(`Unknown history source kind: ${String(never)}`);
    }
  }
}

/* ============================================================
 * 列出支援來源
 * ========================================================== */

export function listSupportedHistorySources(): HistorySourceDescriptor[] {
  return [
    {
      kind: 'official',
      name: '官方開獎資料',
      trust: 'official',
      writable: false,
      incremental: true,
      history: true,
      prize: true,
      validation: true,
    },
    {
      kind: 'json',
      name: 'JSON 匯入',
      trust: 'unofficial',
      writable: true,
      incremental: false,
      history: true,
      prize: false,
      validation: true,
    },
    {
      kind: 'csv',
      name: 'CSV 匯入',
      trust: 'user',
      writable: true,
      incremental: false,
      history: true,
      prize: false,
      validation: true,
    },
    {
      kind: 'manual',
      name: '手動輸入',
      trust: 'user',
      writable: true,
      incremental: true,
      history: true,
      prize: false,
      validation: true,
    },
  ];
}

export default createHistorySourceAdapter;
