// ============================================================
// V11 Dashboard 今日待執行任務
// ============================================================
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';
import { isDrawToday, getTodayDrawLotteries, getNextDrawDate, getNextDrawLottery } from '@/utils/drawSchedule';
import { Bell, Calendar, CheckCircle, Circle, AlertTriangle, Sparkles } from 'lucide-react';

interface Props {
  lotteryType: LotteryType;
  hasGenerated?: boolean;
  hasLatestDraw?: boolean;
  journalCount?: number;
  lastBackup?: string;
}

export default function Dashboard({ lotteryType, hasGenerated = false, hasLatestDraw = false, journalCount = 0, lastBackup }: Props) {
  const config = getConfig(lotteryType);
  const todayDraws = useMemo(() => getTodayDrawLotteries(), []);
  const nextDraw = useMemo(() => getNextDrawLottery(), []);
  const thisDraws = useMemo(() => todayDraws.filter(t => t === lotteryType), [todayDraws, lotteryType]);

  const tasks = [
    {
      label: `${config.name} 今日開獎`,
      done: thisDraws.length > 0,
      note: isDrawToday(lotteryType) ? '今天是開獎日' : `下次開獎：${getNextDrawDate(lotteryType).toISOString().split('T')[0]}`,
    },
    {
      label: '產生今日推薦組合',
      done: hasGenerated,
      note: hasGenerated ? '已完成' : '請到「選號」頁面產生',
    },
    {
      label: '輸入最新開獎結果',
      done: hasLatestDraw,
      note: hasLatestDraw ? '已更新' : '開獎後請到「資料」頁面輸入',
    },
    {
      label: '更新實測日誌',
      done: journalCount > 0,
      note: journalCount > 0 ? `已有 ${journalCount} 筆記錄` : '記錄命中與獎金',
    },
    {
      label: '備份資料',
      done: !!lastBackup,
      note: lastBackup ? `上次備份：${lastBackup}` : '建議每週備份',
    },
  ];

  const completed = tasks.filter(t => t.done).length;

  return (
    <Card className="border border-cyan-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-cyan-400 text-lg">
          <Bell className="w-5 h-5" />
          今日任務面板
          <Badge className={`text-[10px] ${completed === tasks.length ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-400'}`}>
            {completed}/{tasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 進度 */}
        <div className="p-2 rounded bg-gray-800/40">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">完成進度</span>
            <span className="text-gray-300">{completed}/{tasks.length}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-600 to-emerald-500 transition-all" style={{ width: `${(completed / tasks.length) * 100}%` }} />
          </div>
        </div>

        {/* 今日開獎提醒 */}
        {todayDraws.length > 0 && (
          <div className="p-2 rounded bg-amber-950/20 border border-amber-900/20 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="text-amber-400 font-semibold">今日開獎：</span>
              {todayDraws.map(t => getConfig(t).name).join('、')}
            </div>
          </div>
        )}

        {/* 下次開獎 */}
        {nextDraw && (
          <div className="p-2 rounded bg-gray-800/40 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-400">
              下次開獎：<span className={nextDraw.type === lotteryType ? config.themeColor : 'text-gray-300'}>{getConfig(nextDraw.type).name}</span> {nextDraw.date.toISOString().split('T')[0]}
            </span>
          </div>
        )}

        {/* 任務列表 */}
        <div className="space-y-1.5">
          {tasks.map((task, i) => (
            <div key={i} className={`flex items-center gap-2 p-2 rounded ${task.done ? 'bg-green-950/10' : 'bg-gray-800/30'}`}>
              {task.done ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> : <Circle className="w-4 h-4 text-gray-600 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className={`text-xs ${task.done ? 'text-green-400 line-through' : 'text-gray-300'}`}>{task.label}</div>
                <div className="text-[10px] text-gray-500">{task.note}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-2 rounded bg-blue-950/20 border border-blue-900/20 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-blue-300/70">
            建議每個開獎日都執行：產號→等開獎→輸入結果→記錄日誌。持續4週後檢視策略成效。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
