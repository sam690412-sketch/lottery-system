// ============================================================
// V16 AI策略排行榜頁面 - StrategyRankingPage.tsx
// 7天/30天/90天 × 命中率/ROI/中獎次數/平均命中
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { generateStrategyRanking, getCurrentUserId, type RankingParams } from '@/utils/strategyRanking';
import { ArrowLeft, Trophy, ChevronDown, ChevronUp } from 'lucide-react';

const TIME_WINDOWS: { label: string; days: 7 | 30 | 90 }[] = [
  { label: '最近7天', days: 7 },
  { label: '最近30天', days: 30 },
  { label: '最近90天', days: 90 },
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
  seventh: '普獎', none: '未中',
};

export default function StrategyRankingPage() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [sortBy, setSortBy] = useState<RankingParams['sortBy']>('hitRate');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rankings = useMemo(() => {
    return generateStrategyRanking({ userId, days, sortBy });
  }, [userId, days, sortBy]);

  const hasData = rankings.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 p-4 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">AI 策略排行榜</h1>
            <p className="text-xs text-gray-500">數據來源：開獎驗證中心</p>
          </div>
        </div>

        {/* 時間範圍 */}
        <div className="flex gap-2 mb-4">
          {TIME_WINDOWS.map(t => (
            <Button key={t.days} size="sm" variant={days === t.days ? 'default' : 'outline'}
              onClick={() => setDays(t.days)}
              className={days === t.days ? 'bg-amber-600' : 'border-gray-600 text-gray-400'}>
              {t.label}
            </Button>
          ))}
        </div>

        {/* 排序方式 */}
        <div className="flex gap-2 mb-6">
          {SORT_OPTIONS.map(s => (
            <Button key={s.key} size="sm" variant={sortBy === s.key ? 'default' : 'outline'}
              onClick={() => setSortBy(s.key)}
              className={sortBy === s.key ? 'bg-cyan-600' : 'border-gray-600 text-gray-400'}>
              {s.label}
            </Button>
          ))}
        </div>

        {!hasData ? (
          /* 空狀態 */
          <Card className="p-8 text-center bg-gray-800/50 border-gray-700">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-2">尚無足夠驗證資料</p>
            <p className="text-gray-600 text-sm mb-4">請先產號並完成開獎驗證</p>
            <div className="flex gap-3 justify-center">
              <Button size="sm" variant="outline" className="border-gray-600 text-gray-400" onClick={() => navigate('/')}>
                🏠 返回首頁
              </Button>
            </div>
          </Card>
        ) : (
          /* 排行榜 */
          <div className="space-y-3">
            {rankings.map((r) => (
              <Card key={r.strategyId} className="bg-gray-800/50 border-gray-700 overflow-hidden">
                {/* 主行 */}
                <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === r.strategyId ? null : r.strategyId)}>
                  <div className="flex items-center gap-3">
                    {/* 排名 */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      r.rank === 1 ? 'bg-amber-500/20 text-amber-400' :
                      r.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                      r.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-gray-800 text-gray-500'
                    }`}>
                      {r.rank <= 3 ? <Trophy className="w-4 h-4" /> : r.rank}
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

                    {/* 展開箭頭 */}
                    {expandedId === r.strategyId ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </div>

                {/* 展開詳情 */}
                {expandedId === r.strategyId && (
                  <div className="px-4 pb-4 border-t border-gray-800 pt-3">
                    {/* 統計摘要 */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-gray-900/50 rounded p-2 text-center">
                        <div className="text-xs text-gray-500">總成本</div>
                        <div className="text-sm font-bold text-gray-300">NT${r.totalCost.toLocaleString()}</div>
                      </div>
                      <div className="bg-gray-900/50 rounded p-2 text-center">
                        <div className="text-xs text-gray-500">總獎金</div>
                        <div className="text-sm font-bold text-amber-400">NT${r.totalPrize.toLocaleString()}</div>
                      </div>
                      <div className="bg-gray-900/50 rounded p-2 text-center">
                        <div className="text-xs text-gray-500">平均命中碼數</div>
                        <div className="text-sm font-bold text-cyan-400">{r.avgMatchCount}</div>
                      </div>
                    </div>

                    {/* 連中/連敗記錄 */}
                    <div className="flex gap-4 mb-3 text-xs">
                      <span className="text-green-400">最長連中: {r.maxConsecutiveHits}期</span>
                      <span className="text-red-400">最長連敗: {r.maxConsecutiveMisses}期</span>
                    </div>

                    {/* 獎級分布 */}
                    {Object.keys(r.prizeDistribution).length > 0 && (
                      <div className="mb-3">
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

                    {/* 最佳單期 */}
                    {r.bestSingleResult && (
                      <div className="text-xs text-gray-500">
                        最佳單期: {r.bestSingleResult.date} 命中{r.bestSingleResult.matchMain}碼 ({PRIZE_LABELS[r.bestSingleResult.prize] || r.bestSingleResult.prize}) NT${r.bestSingleResult.prizeAmount.toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
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
