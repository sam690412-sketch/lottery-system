// ============================================================
// V14.0 統計分析中心 - 主頁面（大量資料 + 資料來源標示）
// ============================================================
import { useState, useMemo } from 'react';
import type { LotteryType } from '@/utils/lotteryConfig';
import {
  getHistoricalData, getRecentDraws,
  getMaxNumber, getBigSmallThreshold, getDataSourceInfo,
} from '@/data/historicalData';
import { getStatisticsLimit, getPeriodLabel } from '@/utils/statPermission';
import { getCurrentRole } from '@/utils/auth';
import {
  calcHotCold, calcMissingRank, calcTailAnalysis, calcOddEven,
  calcBigSmall, calcSumAnalysis, calcConsecutive, calcSameTail,
  calcRepeatNumbers, calcHeatScores, calcMissingCycles, calcTailTrends,
  calcHotCombos, calcColdCombos, calcConsecCombos, calcSameTailCombos,
} from '@/utils/statistics';
import ComboAnalysis from '@/components/ComboAnalysis';
import StatisticsAccessBanner from '@/components/StatisticsAccessBanner';
import HotColdNumbers from '@/components/HotColdNumbers';
import MissingRank from '@/components/MissingRank';
import DigitTailAnalysis from '@/components/DigitTailAnalysis';
import OddEvenAnalysis from '@/components/OddEvenAnalysis';
import BigSmallAnalysis from '@/components/BigSmallAnalysis';
import SumAnalysis from '@/components/SumAnalysis';
import ConsecutiveAnalysis from '@/components/ConsecutiveAnalysis';
import SameTailAnalysis from '@/components/SameTailAnalysis';
import RepeatNumberAnalysis from '@/components/RepeatNumberAnalysis';
import VipDeepStats from '@/components/VipDeepStats';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, AlertTriangle, Database, UserCheck } from 'lucide-react';

const LOTTERY_TABS: { id: LotteryType; label: string }[] = [
  { id: 'power', label: '威力彩' },
  { id: 'lotto649', label: '大樂透' },
  { id: 'daily539', label: '今彩539' },
];

const PERIOD_OPTIONS = [50, 100, 300, 500, 800];

export default function StatisticsPage() {
  const [lotteryType, setLotteryType] = useState<LotteryType>('power');
  const [periodCount, setPeriodCount] = useState<number>(100);
  const role = getCurrentRole();
  const sourceInfo = useMemo(() => getDataSourceInfo(), []);

  const {
    draws, maxNum, usedCount, dataCount,
    allowedLimit, isInsufficient,
  } = useMemo(() => {
    const all = getHistoricalData(lotteryType);
    const count = all.length;
    // V14.0: 使用使用者選擇的期數，但受身份權限限制
    const roleLimit = getStatisticsLimit(role);
    const requestedCount = periodCount;
    const actualCount = roleLimit === Infinity
      ? Math.min(requestedCount, count)
      : Math.min(requestedCount, roleLimit, count);
    const recent = getRecentDraws(lotteryType, actualCount);
    const isInsuff = count < requestedCount;
    return {
      draws: recent,
      maxNum: getMaxNumber(lotteryType),
      usedCount: recent.length,
      dataCount: count,
      allowedLimit: roleLimit === Infinity ? '完整' : roleLimit,
      isInsufficient: isInsuff,
    };
  }, [lotteryType, role, periodCount]);

  // 各統計計算
  const hot = useMemo(() => calcHotCold(draws, 'hot', 20), [draws]);
  const cold = useMemo(() => calcHotCold(draws, 'cold', 20), [draws]);
  const missing = useMemo(() => calcMissingRank(draws, maxNum), [draws, maxNum]);
  const tail = useMemo(() => calcTailAnalysis(draws), [draws]);
  const oddEven = useMemo(() => calcOddEven(draws), [draws]);
  const bigSmall = useMemo(() => calcBigSmall(draws, getBigSmallThreshold(lotteryType)), [draws, lotteryType]);
  const sum = useMemo(() => calcSumAnalysis(draws), [draws]);
  const consecutive = useMemo(() => calcConsecutive(draws), [draws]);
  const sameTail = useMemo(() => calcSameTail(draws), [draws]);
  const repeat = useMemo(() => calcRepeatNumbers(draws), [draws]);
  const heatScores = useMemo(() => calcHeatScores(draws, maxNum), [draws, maxNum]);
  const missingCycles = useMemo(() => calcMissingCycles(draws, maxNum), [draws, maxNum]);
  const tailTrends = useMemo(() => calcTailTrends(draws), [draws]);

  // V14.0: 組合分析
  const hotCombos = useMemo(() => calcHotCombos(draws, 20), [draws]);
  const coldCombos = useMemo(() => calcColdCombos(draws, 20), [draws]);
  const consecCombos = useMemo(() => calcConsecCombos(draws, 20), [draws]);
  const sameTailCombos = useMemo(() => calcSameTailCombos(draws, 20), [draws]);

  const periodLabel = getPeriodLabel(role);
  const roleLabel = role === 'guest' ? '訪客' : role === 'free' ? '免費會員' : role === 'vip' ? 'VIP會員' : role === 'tester' ? '測試員' : '管理員';

  return (
    <div className="space-y-6 pb-24">
      {/* 標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-amber-400" />統計分析中心
        </h1>
        <p className="text-sm text-gray-500">數據驅動的選號決策支援</p>
      </div>

      {/* 模擬資料橘色警告 */}
      {sourceInfo.warning && (
        <Card className="border-amber-700 bg-amber-950/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-300 font-medium">{sourceInfo.warning}</p>
              <p className="text-xs text-amber-400/60 mt-1">真實資料需由使用者手動匯入 CSV 檔案。</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 期數切換 */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-400 self-center mr-1">統計期數：</span>
        {PERIOD_OPTIONS.map(p => (
          <button
            key={p}
            onClick={() => setPeriodCount(p)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              periodCount === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            最近{p}期
          </button>
        ))}
      </div>

      {/* 彩種切換 */}
      <div className="flex gap-2">
        {LOTTERY_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setLotteryType(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              lotteryType === tab.id
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 資料資訊面板 */}
      <Card className="border-gray-700 bg-gray-900/60">
        <CardContent className="p-4 space-y-3">
          {/* 彩種 + 身份 */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300 font-medium">
                {lotteryType === 'power' ? '威力彩' : lotteryType === 'lotto649' ? '大樂透' : '今彩539'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-gray-400" />
              <Badge className={
                role === 'admin' ? 'bg-purple-600' : role === 'tester' ? 'bg-emerald-600' :
                role === 'vip' ? 'bg-amber-600' : role === 'free' ? 'bg-blue-600' : 'bg-gray-600'
              }>
                {roleLabel}
              </Badge>
            </div>
          </div>

          {/* 資料統計 */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">可查看期數</span>
              <span className="text-gray-300">{periodLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">資料庫總期數</span>
              <span className="text-amber-400 font-bold">{dataCount.toLocaleString()} 期</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">本次統計使用</span>
              <span className="text-emerald-400 font-bold">{usedCount.toLocaleString()} 期</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">資料來源</span>
              <span className={sourceInfo.source === 'real' ? 'text-emerald-400' : 'text-orange-400'}>
                {sourceInfo.label}
              </span>
            </div>
          </div>

          {/* 資料不足提示 */}
          {isInsufficient && (
            <div className="bg-red-950/30 border border-red-800/40 rounded p-2">
              <p className="text-xs text-red-400">
                資料不足：目前僅有 {dataCount.toLocaleString()} 期，低於本身份應可查看的 {allowedLimit === Infinity ? '完整資料' : allowedLimit.toLocaleString() + ' 期'}。
              </p>
            </div>
          )}

          {/* 權限提示 */}
          <StatisticsAccessBanner dataCount={dataCount} usedCount={usedCount} />
        </CardContent>
      </Card>

      {/* 基本統計模組 */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-200">基本統計</h2>
        <HotColdNumbers hot={hot} cold={cold} />
        <MissingRank items={missing} />
        <DigitTailAnalysis items={tail} />
        <OddEvenAnalysis data={oddEven} />
        <BigSmallAnalysis data={bigSmall} />
        <SumAnalysis data={sum} />
        <ConsecutiveAnalysis data={consecutive} />
        <SameTailAnalysis data={sameTail} />
        <RepeatNumberAnalysis data={repeat} />
      </div>

      {/* V14.0: 組合分析 */}
      <ComboAnalysis
        hotCombos={hotCombos}
        coldCombos={coldCombos}
        consecCombos={consecCombos}
        sameTailCombos={sameTailCombos}
      />

      {/* VIP 深度分析 */}
      <VipDeepStats heatScores={heatScores} missingCycles={missingCycles} tailTrends={tailTrends} />
    </div>
  );
}
