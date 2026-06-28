// ============================================================
// V22 Part 4 — 兌獎中心
// 手動輸入或從收藏(v12-keep-sets)選號 → 比對。⚠️ 不推估獎金。
// ============================================================
import { useState, useMemo } from 'react';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getHistoryByGame } from '@/utils/historyEngine';
import { checkPrize, type PrizeCheckResult } from '@/utils/prizeAndReport';
import { getDataSourceKind } from '@/providers/historyProvider';
import { validateAllBuiltInHistory } from '@/utils/historyValidation';

const GAMES: [LotteryType, string][] = [['power', '威力彩'], ['lotto649', '大樂透'], ['daily539', '今彩539']];
interface KeepSet { id: string; name: string; numbers: number[]; type: LotteryType; note: string }

function loadCollections(game: LotteryType): KeepSet[] {
  try { const raw = localStorage.getItem('v12-keep-sets'); if (raw) return (JSON.parse(raw) as KeepSet[]).filter(s => s.type === game); } catch { /* ignore */ }
  return [];
}

export default function PrizeCheckPage() {
  const [game, setGame] = useState<LotteryType>('power');
  const issues = useMemo(() => getHistoryByGame(game).map(r => r.issue).sort((a, b) => b - a), [game]);
  const [issue, setIssue] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<PrizeCheckResult | null>(null);
  const [error, setError] = useState('');

  const collections = useMemo(() => loadCollections(game), [game]);
  const targetIssue = issue ?? issues[0] ?? null;

  // V25-F：資料來源 / 驗證狀態(內建資料,只算一次);依目前彩種取狀態
  const validations = useMemo(() => validateAllBuiltInHistory(), []);
  const gv = validations[game];
  const sourceKind = getDataSourceKind();
  const isOfficial = sourceKind === 'official';
  const severity = gv?.summary.severity ?? 'yellow';
  const sevDot = severity === 'red' ? 'bg-red-500' : severity === 'yellow' ? 'bg-amber-400' : 'bg-emerald-400';
  const sevLabel = severity === 'red' ? '有錯誤' : severity === 'yellow' ? '有警告' : '驗證通過';

  const parseInput = (s: string): number[] => s.split(/[\s,，、]+/).map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n));

  const runCheck = (nums: number[]) => {
    setError('');
    if (!targetIssue) { setError('沒有可比對的期數'); return; }
    if (nums.length === 0) { setError('請先輸入或選擇號碼'); return; }
    const r = checkPrize(game, targetIssue, nums, null);
    if (!r) { setError('查無該期資料'); return; }
    setResult(r);
  };

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">兌獎中心</h1>
        <p className="text-sm text-gray-500">比對你的號碼與開獎結果。{getDataSourceKind() !== 'official' && '（目前為示意資料，請以官方開獎為準）'}</p>
      </div>

      {/* V25-F：資料可信度面板(依目前彩種顯示來源與驗證狀態) */}
      <div className={`rounded-xl border p-3 ${isOfficial ? 'border-emerald-800/50 bg-emerald-950/15' : 'border-amber-800/50 bg-amber-950/15'}`}>
        <div className="flex flex-wrap items-center gap-2">
          {isOfficial ? (
            <>
              <span className="rounded-md bg-emerald-600/30 px-2 py-0.5 text-xs font-bold text-emerald-200">官方資料</span>
              <span className="rounded-md bg-emerald-600/20 px-2 py-0.5 text-[11px] text-emerald-300">已驗證</span>
            </>
          ) : (
            <>
              <span className="rounded-md bg-amber-600/30 px-2 py-0.5 text-xs font-bold text-amber-200">示意資料</span>
              <span className="rounded-md bg-amber-600/20 px-2 py-0.5 text-[11px] text-amber-300">非官方開獎</span>
              <span className="rounded-md bg-red-600/20 px-2 py-0.5 text-[11px] text-red-300">不可作正式兌獎</span>
            </>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-300">
            <span className={`inline-block h-2 w-2 rounded-full ${sevDot}`} />
            {sevLabel}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-400 sm:grid-cols-4">
          <span>總期數：<span className="text-gray-200">{gv?.totalRecords ?? 0}</span></span>
          <span>最新日期：<span className="text-gray-200">{gv?.dateRange.to || '—'}</span></span>
          <span>日期區間：<span className="text-gray-200">{gv?.dateRange.from || '—'} ~ {gv?.dateRange.to || '—'}</span></span>
          <span>驗證狀態：<span className="text-gray-200">{severity.toUpperCase()}</span></span>
        </div>
        {severity === 'red' && (
          <p className="mt-2 rounded-md border border-red-800/50 bg-red-950/25 px-2 py-1.5 text-[11px] text-red-300">
            ⚠️ 此彩種資料不適合作正式兌獎或官方查詢。
          </p>
        )}
        {severity === 'yellow' && (
          <p className="mt-2 rounded-md border border-amber-800/40 bg-amber-950/15 px-2 py-1.5 text-[11px] text-amber-300">
            此資料可作娛樂比對，但不應作正式兌獎。
          </p>
        )}
        {isOfficial && severity === 'green' && (
          <p className="mt-2 rounded-md border border-emerald-800/40 bg-emerald-950/20 px-2 py-1.5 text-[11px] text-emerald-300">
            官方資料已驗證，仍請以官方公告為準。
          </p>
        )}
      </div>

      {/* 選彩種 */}
      <div className="flex flex-wrap gap-2">
        {GAMES.map(([g, label]) => (
          <button key={g} onClick={() => { setGame(g); setIssue(null); setResult(null); }} className={`px-3 py-1.5 rounded-lg text-sm border ${game === g ? 'bg-amber-600 border-amber-500 text-white' : 'bg-gray-900/50 border-gray-700 text-gray-300'}`}>{label}</button>
        ))}
      </div>

      {/* 選期數 */}
      <div>
        <label className="text-xs text-gray-400">選擇期數</label>
        <select value={targetIssue ?? ''} onChange={(e) => setIssue(parseInt(e.target.value, 10))} className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-gray-200">
          {issues.slice(0, 200).map(i => <option key={i} value={i}>第 {i} 期</option>)}
        </select>
      </div>

      {/* 手動輸入 */}
      <div>
        <label className="text-xs text-gray-400">手動輸入號碼（用空白或逗號分隔）</label>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="例如 5 12 18 24 30 35" className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-gray-200" />
        <button onClick={() => runCheck(parseInput(input))} className="mt-2 w-full py-2.5 bg-amber-500 hover:bg-amber-400 rounded-lg text-sm font-bold text-gray-950">立即比對</button>
      </div>

      {/* 從收藏選 */}
      {collections.length > 0 && (
        <div>
          <label className="text-xs text-gray-400">或從我的收藏選擇</label>
          <div className="mt-1 space-y-2">
            {collections.map(s => (
              <button key={s.id} onClick={() => runCheck(s.numbers)} className="w-full text-left rounded-lg border border-gray-700 bg-gray-900/50 p-2 hover:border-amber-600/50">
                <div className="text-xs text-gray-300">{s.name}</div>
                <div className="text-sm text-amber-300">{s.numbers.join('、')}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* 結果 */}
      {result && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-950/15 p-4">
          <div className="text-sm font-bold text-amber-300 mb-2">第 {result.issue} 期 · {result.date}</div>
          <p className="text-sm text-gray-200">命中 <span className="font-bold text-amber-300">{result.matchedCount}</span> 碼{result.specialMatched ? '＋特別號' : ''}</p>
          {result.matchedZone1.length > 0 && <p className="text-xs text-gray-400 mt-1">命中號碼：{result.matchedZone1.join('、')}</p>}
          <p className="mt-3 text-xs text-amber-200/80">{result.prizeNote}</p>
        </div>
      )}

      <p className="text-[11px] text-gray-500 text-center px-4">本服務不自行推估獎金。實際中獎與獎金請依官方公告為準。理性購買、量力而為。</p>
    </div>
  );
}
