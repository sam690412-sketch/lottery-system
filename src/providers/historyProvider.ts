// ============================================================
// V22 Data Platform — History Provider (Adapter Pattern)
// 集中所有歷史資料來源；未來可替換 官方API / CSV / JSON / DB，不需改其他程式。
// ⚠️ 目前底層資料為專案內建 historicalDraws.json（合成/示意資料，非官方開獎）。
//    dataSource 標示為 'simulated'；接上真實官方來源後改 adapter 即可。
// 不修改 13 層/scoring/Builder/V19-21。
// ============================================================
import rawDraws from '@/data/historicalDraws.json';
import type { LotteryType } from '@/utils/lotteryConfig';

// ---- 統一資料模型（可擴充） ----
export interface LotteryResult {
  game: LotteryType;          // 彩種
  issue: number;              // 期數
  date: string;               // 開獎日期 YYYY-MM-DD
  zone1: number[];            // 第一區號碼
  zone2: number[];            // 第二區號碼（如大樂透特別號區；無則空陣列）
  special: number | null;     // 特別號（威力彩第二區/大樂透特別號；無則 null）
  updatedAt: string;          // 更新時間
}
export type DataSourceKind = 'official' | 'csv' | 'json' | 'database' | 'simulated';

// ---- 來源 Adapter 介面（不寫死來源） ----
export interface HistoryAdapter {
  kind: DataSourceKind;
  load(game: LotteryType): LotteryResult[];
}

// ---- 內建 JSON Adapter（包裝現有 historicalDraws.json；標 simulated） ----
interface RawDraw { period: number; date: string; zone1: number[]; zone2: number | number[] }
const builtinJsonAdapter: HistoryAdapter = {
  kind: 'simulated', // 現有資料為合成，非官方
  load(game: LotteryType): LotteryResult[] {
    const arr = (rawDraws as Record<string, RawDraw[]>)[game] || [];
    const now = new Date().toISOString();
    return arr.map((d) => {
      const z2 = Array.isArray(d.zone2) ? d.zone2 : (typeof d.zone2 === 'number' ? [d.zone2] : []);
      const special = Array.isArray(d.zone2) ? (d.zone2[0] ?? null) : (typeof d.zone2 === 'number' ? d.zone2 : null);
      return { game, issue: d.period, date: d.date, zone1: d.zone1 || [], zone2: z2, special, updatedAt: now };
    });
  },
};

// ---- Provider：集中存取點（可換 adapter） ----
let activeAdapter: HistoryAdapter = builtinJsonAdapter;
export function setHistoryAdapter(adapter: HistoryAdapter): void { activeAdapter = adapter; }
export function getDataSourceKind(): DataSourceKind { return activeAdapter.kind; }
export function loadResults(game: LotteryType): LotteryResult[] { return activeAdapter.load(game); }
/** 資料是否為官方且可信（決定是否可顯示績效；目前 simulated → false）。 */
export function isOfficialValidated(): boolean { return activeAdapter.kind === 'official'; }
