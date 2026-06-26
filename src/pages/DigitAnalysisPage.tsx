// ============================================================
// V16 數位型分析中心 - DigitAnalysisPage.tsx
// 三星彩 / 四星彩 共用
// ============================================================

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getConfig, type LotteryType } from '@/utils/lotteryConfig';
import { getDigitData } from '@/utils/digitData';
import {
  calcDigitPositionRanking, calcStar3CategoryStats, calcStar4CategoryStats,
  STAR3_THEORY, STAR4_THEORY, getDeviationLevel,
  type Star3CategoryStats, type Star4CategoryStats,
} from '@/utils/digitCategoryStats';
import { ArrowLeft, TrendingUp, Flame, Snowflake, HelpCircle } from 'lucide-react';

const PERIOD_OPTIONS = [100, 300, 500, 1000];

export default function DigitAnalysisPage() {
  const { lotteryType } = useParams<{ lotteryType: LotteryType }>();
  const navigate = useNavigate();
  const type = (lotteryType || 'star3') as 'star3' | 'star4';
  const config = getConfig(type);
  const isStar4 = type === 'star4';

  const [periodCount, setPeriodCount] = useState(100);
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null);

  const data = useMemo(() => getDigitData(type), [type]);

  const positionRankings = useMemo(() =>
    calcDigitPositionRanking(data, periodCount),
    [data, periodCount]
  );

  const categoryStats = useMemo(() =>
    isStar4
      ? calcStar4CategoryStats(data, 1000)
      : calcStar3CategoryStats(data, 1000),
    [data, isStar4]
  );

  const renderDeviationBadge = (deviation: number, isStar4Flag: boolean) => {
    const level = getDeviationLevel(deviation, isStar4Flag ? 1 : 2);
    if (level === 'hot') return <span className="inline-flex items-center text-red-400 text-xs"><Flame className="w-3 h-3 mr-0.5" />+{deviation}%</span>;
    if (level === 'cold') return <span className="inline-flex items-center text-blue-400 text-xs"><Snowflake className="w-3 h-3 mr-0.5" />{deviation}%</span>;
    return <span className="text-gray-500 text-xs">{deviation > 0 ? '+' : ''}{deviation}%</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 p-4 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">{config.name} - 分析中心</h1>
            <p className="text-xs text-gray-500">數據期數: {data.length.toLocaleString()} 期</p>
          </div>
        </div>

        {/* P0-2: 模擬資料警告 */}
        <div className="mb-4 p-3 rounded-lg bg-orange-950/40 border border-orange-700/50">
          <p className="text-xs text-orange-400 font-medium">⚠️ 目前使用模擬測試資料，僅供功能驗證，不可作為真實選號依據。</p>
          <p className="text-xs text-orange-500/60 mt-1">資料來源：模擬測試資料 ｜ 資料筆數：2000期 ｜ 最後更新時間：系統生成</p>
        </div>

        {/* 期數選擇 */}
        <div className="flex gap-2 mb-6">
          {PERIOD_OPTIONS.map(p => (
            <Button
              key={p}
              size="sm"
              variant={periodCount === p ? 'default' : 'outline'}
              onClick={() => setPeriodCount(p)}
              className={periodCount === p ? 'bg-violet-600' : 'border-gray-600 text-gray-400'}
            >
              近{p}期
            </Button>
          ))}
        </div>

        {/* 按位熱門排行 */}
        <Card className="p-4 mb-6 bg-gray-800/50 border-gray-700">
          <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            按位熱門排行
          </h2>
          <div className={`grid gap-4 ${isStar4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
            {positionRankings.map(pr => (
              <div key={pr.position}>
                <h3 className="text-xs text-gray-500 mb-2 text-center">{pr.position}</h3>
                <table className="w-full text-xs">
                  <tbody>
                    {pr.rankings.slice(0, 5).map(r => (
                      <tr key={r.digit} className="border-b border-gray-800">
                        <td className="py-1 text-gray-400 w-6">{r.digit}</td>
                        <td className="py-1 text-gray-500">{r.count}次</td>
                        <td className="py-1">
                          <div className="w-full bg-gray-800 rounded-full h-1.5">
                            <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${r.ratio * 5}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Card>

        {/* 形態統計 */}
        <Card className="p-4 mb-6 bg-gray-800/50 border-gray-700">
          <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
            形態分布統計（近1000期）
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-700">
                <th className="text-left py-2">形態</th>
                <th className="text-right py-2">開出次數</th>
                <th className="text-right py-2">實際占比</th>
                <th className="text-right py-2">理論占比</th>
                <th className="text-right py-2">偏差</th>
                <th className="text-left py-2 pl-4"></th>
              </tr>
            </thead>
            <tbody>
              {isStar4
                ? renderStar4Rows(categoryStats as Star4CategoryStats)
                : renderStar3Rows(categoryStats as Star3CategoryStats)
              }
            </tbody>
          </table>

          {/* 形態說明 */}
          <div className="mt-4 space-y-2">
            {isStar4
              ? [
                  { key: 'leopard', label: '豹子', desc: '四個數字完全相同，如 1111, 9999' },
                  { key: 'pair', label: '對子', desc: '有重複數字，如 1122, 1112' },
                  { key: 'straight', label: '順子', desc: '四個連續數字，如 1234, 9012' },
                  { key: 'mixed', label: '雜六', desc: '其他所有情況' },
                ].map(item => (
                  <div key={item.key}>
                    <button onClick={() => setExpandedHelp(expandedHelp === item.key ? null : item.key)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
                      <HelpCircle className="w-3 h-3" />{item.label}是什麼？
                    </button>
                    {expandedHelp === item.key && <p className="text-xs text-gray-600 ml-4 mt-1">{item.desc}</p>}
                  </div>
                ))
              : [
                  { key: 'aaa', label: 'AAA', desc: '三個數字完全相同，如 111, 222' },
                  { key: 'aab', label: 'AAB', desc: '兩個數字相同，一個不同，如 112, 121' },
                  { key: 'abc', label: 'ABC', desc: '三個數字都不同，如 123, 456' },
                ].map(item => (
                  <div key={item.key}>
                    <button onClick={() => setExpandedHelp(expandedHelp === item.key ? null : item.key)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
                      <HelpCircle className="w-3 h-3" />{item.label}是什麼？
                    </button>
                    {expandedHelp === item.key && <p className="text-xs text-gray-600 ml-4 mt-1">{item.desc}</p>}
                  </div>
                ))
            }
          </div>
        </Card>

        {/* 底部操作 */}
        <div className="flex gap-3">
          <Button onClick={() => navigate('/')} variant="outline" className="flex-1 border-gray-600 text-gray-400">
            🏠 返回首頁
          </Button>
        </div>
      </div>
    </div>
  );

  function renderStar3Rows(stats: Star3CategoryStats) {
    const rows = [
      { key: 'aaa', label: 'AAA', stat: stats.aaa },
      { key: 'aab', label: 'AAB', stat: stats.aab },
      { key: 'abc', label: 'ABC', stat: stats.abc },
    ];
    return rows.map(r => (
      <tr key={r.key} className="border-b border-gray-800">
        <td className="py-2 text-gray-300">{r.label}</td>
        <td className="py-2 text-right text-gray-400">{r.stat.count}</td>
        <td className="py-2 text-right text-gray-300">{r.stat.ratio}%</td>
        <td className="py-2 text-right text-gray-500">{(STAR3_THEORY[r.key as keyof typeof STAR3_THEORY] * 100).toFixed(0)}%</td>
        <td className="py-2 text-right">{renderDeviationBadge(r.stat.deviation, false)}</td>
      </tr>
    ));
  }

  function renderStar4Rows(stats: Star4CategoryStats) {
    const rows = [
      { key: 'leopard', label: '豹子', stat: stats.leopard },
      { key: 'pair', label: '對子', stat: stats.pair },
      { key: 'straight', label: '順子', stat: stats.straight },
      { key: 'mixed', label: '雜六', stat: stats.mixed },
    ];
    return rows.map(r => (
      <tr key={r.key} className="border-b border-gray-800">
        <td className="py-2 text-gray-300">{r.label}</td>
        <td className="py-2 text-right text-gray-400">{r.stat.count}</td>
        <td className="py-2 text-right text-gray-300">{r.stat.ratio}%</td>
        <td className="py-2 text-right text-gray-500">{(STAR4_THEORY[r.key as keyof typeof STAR4_THEORY] * 100).toFixed(1)}%</td>
        <td className="py-2 text-right">{renderDeviationBadge(r.stat.deviation, true)}</td>
      </tr>
    ));
  }
}
