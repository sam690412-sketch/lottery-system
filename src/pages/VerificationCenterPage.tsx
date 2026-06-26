// ============================================================
// V16.4 Module C: 開獎驗證中心
// 推薦紀錄 / 驗證紀錄 / 命中率 / ROI / 獎級統計
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateStrategyRanking, getCurrentUserId, type RankingParams } from '@/utils/strategyRanking';
import type { StrategyRanking } from '@/utils/strategyRanking';
import { runObservationPoolBacktest, type BacktestCompare } from '@/utils/backtest';
import { getWeightScores } from '@/utils/observationPoolV3';
import { ArrowLeft, Trophy, Target, TrendingUp, Clock, Award } from 'lucide-react';

const TIME_WINDOWS: { label: string; days: 7 | 30 | 90 }[] = [
  { label: '近7天', days: 7 },
  { label: '近30天', days: 30 },
  { label: '近90天', days: 90 },
];

const SORT_OPTIONS: { label: string; key: RankingParams['sortBy'] }[] = [
  { label: '命中率', key: 'hitRate' },
  { label: 'ROI', key: 'roi' },
  { label: '中獎次數', key: 'winCount' },
  { label: '平均命中', key: 'avgMatchCount' },
];

const PRIZE_LABELS: Record<string, string> = {
  jackpot: '頭獎', second: '貳獎', third: '參獎',
  fourth: '肆獎', fifth: '伍獎', sixth: '陸獎',
  seventh: '柒獎', eighth: '捌獎', ninth: '玖獎', none: '未中',
};

export default function VerificationCenterPage() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [sortBy, setSortBy] = useState<RankingParams['sortBy']>('hitRate');
  const [activeTab, setActiveTab] = useState<'records' | 'backtest'>('records');

  // 策略排行榜
  const rankings = useMemo(() => {
    return generateStrategyRanking({ userId, days, sortBy });
  }, [userId, days, sortBy]);

  // 回測結果
  const backtest = useMemo<BacktestCompare | null>(() => {
    if (activeTab !== 'backtest') return null;
    try {
      const obsWeights = getWeightScores('power');
      return runObservationPoolBacktest('power', 100, obsWeights);
    } catch { return null; }
  }, [activeTab]);

  // 統計摘要
  const summary = useMemo(() => {
    if (rankings.length === 0) return null;
    const totalCost = rankings.reduce((s, r) => s + r.totalCost, 0);
    const totalPrize = rankings.reduce((s, r) => s + r.totalPrize, 0);
    const totalCount = rankings.reduce((s, r) => s + r.totalCount, 0);
    const totalHits = rankings.reduce((s, r) => s + r.hitRate * r.totalCount / 100, 0);
    const avgHitRate = totalCount > 0 ? Math.round((totalHits / totalCount) * 1000) / 10 : 0;
    const roi = totalCost > 0 ? Math.round(((totalPrize - totalCost) / totalCost) * 1000) / 10 : 0;
    return { totalCost, totalPrize, totalCount, avgHitRate, roi };
  }, [rankings]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 p-4 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              開獎驗證中心
            </h1>
            <p className="text-xs text-gray-500">數據來源：推薦紀錄與開獎驗證</p>
          </div>
        </div>

        {/* Tab 切換 */}
        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant={activeTab === 'records' ? 'default' : 'outline'}
            onClick={() => setActiveTab('records')}
            className={activeTab === 'records' ? 'bg-cyan-600' : 'border-gray-600 text-gray-400'}
          >
            <Award className="w-4 h-4 mr-1" />策略驗證
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'backtest' ? 'default' : 'outline'}
            onClick={() => setActiveTab('backtest')}
            className={activeTab === 'backtest' ? 'bg-amber-600' : 'border-gray-600 text-gray-400'}
          >
            <TrendingUp className="w-4 h-4 mr-1" />觀察池回測
          </Button>
        </div>

        {activeTab === 'records' && (
          <>
            {/* 時間範圍 */}
            <div className="flex gap-2 mb-4">
              {TIME_WINDOWS.map(t => (
                <Button key={t.days} size="sm" variant={days === t.days ? 'default' : 'outline'}
                  onClick={() => setDays(t.days)}
                  className={days === t.days ? 'bg-amber-600' : 'border-gray-600 text-gray-400'}>
                  <Clock className="w-3 h-3 mr-1" />{t.label}
                </Button>
              ))}
            </div>

            {/* 統計摘要 */}
            {summary && (
              <Card className="p-4 mb-4 bg-gray-800/50 border-gray-700">
                <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4" />驗證摘要
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-gray-900/50 rounded p-2 text-center">
                    <div className="text-xs text-gray-500">總推薦</div>
                    <div className="text-lg font-bold text-gray-300">{summary.totalCount}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded p-2 text-center">
                    <div className="text-xs text-gray-500">平均命中率</div>
                    <div className="text-lg font-bold text-cyan-400">{summary.avgHitRate}%</div>
                  </div>
                  <div className="bg-gray-900/50 rounded p-2 text-center">
                    <div className="text-xs text-gray-500">總成本</div>
                    <div className="text-lg font-bold text-gray-300">${summary.totalCost.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded p-2 text-center">
                    <div className="text-xs text-gray-500">ROI</div>
                    <div className={`text-lg font-bold ${summary.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {summary.roi >= 0 ? '+' : ''}{summary.roi}%
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* 排序方式 */}
            <div className="flex gap-2 mb-4">
              {SORT_OPTIONS.map(s => (
                <Button key={s.key} size="sm" variant={sortBy === s.key ? 'default' : 'outline'}
                  onClick={() => setSortBy(s.key)}
                  className={sortBy === s.key ? 'bg-cyan-600' : 'border-gray-600 text-gray-400'}>
                  {s.label}
                </Button>
              ))}
            </div>

            {/* 排行榜 */}
            {rankings.length === 0 ? (
              <Card className="p-8 text-center bg-gray-800/50 border-gray-700">
                <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">尚無驗證資料</p>
                <p className="text-gray-600 text-sm mb-4">請先產號並完成開獎驗證</p>
                <Button size="sm" variant="outline" className="border-gray-600 text-gray-400" onClick={() => navigate('/')}>
                  返回首頁產號
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {rankings.map((r) => (
                  <StrategyCard key={r.strategyId} ranking={r} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'backtest' && backtest && (
          <BacktestPanel backtest={backtest} />
        )}

        {/* 底部 */}
        <div className="mt-6">
          <Button onClick={() => navigate('/')} variant="outline" className="w-full border-gray-600 text-gray-400">
            🏠 返回首頁
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 策略卡片 */
function StrategyCard({ ranking: r }: { ranking: StrategyRanking }) {
  return (
    <Card className="bg-gray-800/50 border-gray-700 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* 排名 */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            r.rank === 1 ? 'bg-amber-500/20 text-amber-400' :
            r.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
            r.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
            'bg-gray-800 text-gray-500'
          }`}>
            {r.rank}
          </div>

          {/* 策略 */}
          <div className="flex-1">
            <div className="text-base font-bold text-white">{r.icon} {r.strategyName}</div>
            <div className="text-xs text-gray-500">{r.totalCount} 次推薦</div>
          </div>

          {/* 指標 */}
          <div className="text-right">
            <div className="text-lg font-bold text-cyan-400">{r.hitRate}%</div>
            <div className="text-xs text-gray-500">命中率</div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${r.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {r.roi >= 0 ? '+' : ''}{r.roi}%
            </div>
            <div className="text-xs text-gray-500">ROI</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-amber-400">{r.winCount}</div>
            <div className="text-xs text-gray-500">中獎</div>
          </div>
        </div>

        {/* 獎級分布 */}
        {Object.keys(r.prizeDistribution).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="text-xs text-gray-500 mb-1">獎級分布</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(r.prizeDistribution).map(([prize, count]) => (
                <span key={prize} className="text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400">
                  {PRIZE_LABELS[prize] || prize}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/** 回測面板 */
function BacktestPanel({ backtest }: { backtest: BacktestCompare }) {
  const { control, experiment, diff } = backtest;
  return (
    <div className="space-y-4">
      {/* 回測說明 */}
      <Card className="p-4 bg-amber-950/20 border-amber-800/30">
        <p className="text-sm text-amber-400">
          回測 100 期模擬開獎，比較「對照組（無觀察池）」vs「實驗組（觀察池V3）」的表現差異。
        </p>
      </Card>

      {/* 對比表格 */}
      <Card className="p-4 bg-gray-800/50 border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-2">指標</th>
              <th className="text-right py-2">{control.groupName}</th>
              <th className="text-right py-2">{experiment.groupName}</th>
              <th className="text-right py-2">差異</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-800">
              <td className="py-2 text-gray-400">命中率</td>
              <td className="text-right text-gray-300">{control.hitRate}%</td>
              <td className="text-right text-cyan-400">{experiment.hitRate}%</td>
              <td className={`text-right font-bold ${diff.hitRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {diff.hitRate >= 0 ? '+' : ''}{diff.hitRate}%
              </td>
            </tr>
            <tr className="border-b border-gray-800">
              <td className="py-2 text-gray-400">平均命中數</td>
              <td className="text-right text-gray-300">{control.avgMatchCount}</td>
              <td className="text-right text-cyan-400">{experiment.avgMatchCount}</td>
              <td className={`text-right font-bold ${diff.avgMatch >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {diff.avgMatch >= 0 ? '+' : ''}{diff.avgMatch}
              </td>
            </tr>
            <tr className="border-b border-gray-800">
              <td className="py-2 text-gray-400">總成本</td>
              <td className="text-right text-gray-300">${control.totalCost.toLocaleString()}</td>
              <td className="text-right text-gray-300">${experiment.totalCost.toLocaleString()}</td>
              <td className="text-right text-gray-500">—</td>
            </tr>
            <tr className="border-b border-gray-800">
              <td className="py-2 text-gray-400">總獎金</td>
              <td className="text-right text-gray-300">${control.totalPrize.toLocaleString()}</td>
              <td className="text-right text-amber-400">${experiment.totalPrize.toLocaleString()}</td>
              <td className="text-right text-gray-500">—</td>
            </tr>
            <tr>
              <td className="py-2 text-gray-400">ROI</td>
              <td className={`text-right ${control.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>{control.roi}%</td>
              <td className={`text-right font-bold ${experiment.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>{experiment.roi}%</td>
              <td className={`text-right font-bold ${diff.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {diff.roi >= 0 ? '+' : ''}{diff.roi}%
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* 結論 */}
      <Card className={`p-4 border ${diff.hitRate > 0 || diff.roi > 0 ? 'bg-green-950/20 border-green-800/30' : 'bg-gray-800/50 border-gray-700'}`}>
        <p className={`text-sm font-bold ${diff.hitRate > 0 || diff.roi > 0 ? 'text-green-400' : 'text-gray-400'}`}>
          {diff.hitRate > 0 || diff.roi > 0
            ? `✅ 觀察池V3 帶來正面效益：命中率 ${diff.hitRate >= 0 ? '+' : ''}${diff.hitRate}%，ROI ${diff.roi >= 0 ? '+' : ''}${diff.roi}%`
            : `⚠️ 本次回測觀察池未顯著優於對照組，建議調整觀察池內容後重試`}
        </p>
      </Card>
    </div>
  );
}
