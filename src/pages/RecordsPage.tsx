// ============================================================
// V12 紀錄頁 - 投注日誌、週報、回測
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { hasPermission } from '@/utils/permissions';
import { loadJournal } from '@/utils/backtest';
import type { LotteryType } from '@/utils/lotteryConfig';
import { Clock, BarChart3, BookOpen, Lock, Download } from 'lucide-react';

type SubPage = 'journal' | 'weekly' | 'backtest';

export default function RecordsPage() {
  const [subPage, setSubPage] = useState<SubPage>('journal');
  const [lotteryType, setLotteryType] = useState<LotteryType>('power');
  const canViewHistory = hasPermission('canViewHistory');
  const canViewBacktest = hasPermission('canViewBacktest');
  const journal = loadJournal(lotteryType);

  const typeName = (t: LotteryType) => t === 'power' ? '威力彩' : t === 'lotto649' ? '大樂透' : '今彩539';

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">紀錄</h1>
        <p className="text-sm text-gray-500">投注日誌、週報與回測分析</p>
      </div>

      {/* 子頁面切換 */}
      <div className="flex gap-2 overflow-x-auto">
        {([
          { key: 'journal' as SubPage, label: '投注日誌', icon: BookOpen },
          { key: 'weekly' as SubPage, label: '週報', icon: Clock },
          { key: 'backtest' as SubPage, label: '回測', icon: BarChart3 },
        ]).map(item => (
          <Button
            key={item.key}
            size="sm"
            variant={subPage === item.key ? 'default' : 'outline'}
            onClick={() => setSubPage(item.key)}
            className={subPage === item.key ? 'bg-amber-600' : 'border-gray-700 text-gray-400'}
          >
            <item.icon className="w-4 h-4 mr-1" /> {item.label}
          </Button>
        ))}
      </div>

      {/* 彩種切換 */}
      <div className="flex gap-2">
        {(['power', 'lotto649', 'daily539'] as LotteryType[]).map(t => (
          <Button
            key={t}
            size="sm"
            variant={lotteryType === t ? 'default' : 'outline'}
            onClick={() => setLotteryType(t)}
            className={lotteryType === t ? 'bg-amber-600' : 'border-gray-700 text-gray-400'}
          >
            {typeName(t)}
          </Button>
        ))}
      </div>

      {/* 投注日誌 */}
      {subPage === 'journal' && (
        <div className="space-y-3">
          {!canViewHistory ? (
            <Card className="border border-gray-800 bg-gray-900/80">
              <CardContent className="p-6 text-center">
                <Lock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">註冊免費會員可查看最近7天紀錄</p>
                <p className="text-xs text-amber-500 mt-2">VIP 可查看完整日誌並匯出 CSV</p>
              </CardContent>
            </Card>
          ) : journal.length === 0 ? (
            <Card className="border border-gray-800 bg-gray-900/80">
              <CardContent className="p-6 text-center">
                <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">尚無投注紀錄</p>
                <p className="text-xs text-gray-500 mt-2">在首頁產號後，可在這裡記錄開獎結果</p>
              </CardContent>
            </Card>
          ) : (
            journal.slice(0, 20).map(entry => (
              <Card key={entry.id} className="border border-gray-800 bg-gray-900/60">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{entry.date}</Badge>
                        <span className="text-xs text-gray-500">{entry.strategy}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">
                        推薦：{(entry.recommendedZone1 ?? []).map((n: number) => String(n).padStart(2, '0')).join(', ')}
                        {entry.recommendedZone2 ? ` + ${String(entry.recommendedZone2).padStart(2, '0')}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      {entry.matchCount !== undefined && (
                        <Badge className={entry.matchCount > 0 ? 'bg-emerald-600' : 'bg-gray-700'}>
                          中{entry.matchCount}碼
                        </Badge>
                      )}
                      {entry.prizeAmount && entry.prizeAmount > 0 && (
                        <p className="text-xs text-emerald-400 mt-1">${entry.prizeAmount.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* 週報 */}
      {subPage === 'weekly' && (
        <Card className="border border-gray-800 bg-gray-900/80">
          <CardHeader>
            <CardTitle className="text-gray-200 text-lg">本週統計</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!canViewHistory ? (
              <div className="text-center py-6">
                <Lock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">需註冊會員才能查看週報</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-gray-900/40 border border-gray-800 text-center">
                    <p className="text-2xl font-bold text-gray-200">{journal.length}</p>
                    <p className="text-xs text-gray-500">總投注次數</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-900/40 border border-gray-800 text-center">
                    <p className="text-2xl font-bold text-emerald-400">
                      {journal.filter((e) => (e.prizeAmount || 0) > 0).length}
                    </p>
                    <p className="text-xs text-gray-500">中獎次數</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-gray-900/40 border border-gray-800">
                  <p className="text-sm text-gray-500">本週建議</p>
                  <p className="text-sm text-gray-300 mt-1">
                    {journal.length === 0
                      ? '開始記錄投注，系統會為你生成本週分析。'
                      : '持續記錄4週以上，才能產生有效的策略分析。'}
                  </p>
                </div>
                {hasPermission('canExportCsv') && (
                  <Button variant="outline" className="w-full border-gray-700 text-gray-400">
                    <Download className="w-4 h-4 mr-1" /> 匯出 CSV
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 回測 */}
      {subPage === 'backtest' && (
        <Card className="border border-gray-800 bg-gray-900/80">
          <CardHeader>
            <CardTitle className="text-gray-200 text-lg">回測分析</CardTitle>
          </CardHeader>
          <CardContent>
            {!canViewBacktest ? (
              <div className="text-center py-6">
                <Lock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">回測分析為 VIP 功能</p>
                <p className="text-xs text-amber-500 mt-2">升級 VIP 可查看完整回測與模型競賽</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  回測功能使用歷史開獎資料驗證選號策略的有效性。
                </p>
                <Button className="bg-amber-600 hover:bg-amber-500">
                  <BarChart3 className="w-4 h-4 mr-1" /> 執行回測
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
