// ============================================================
// V11 三彩種資料狀態條
// ============================================================
import { Badge } from '@/components/ui/badge';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';
import { Database, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  lotteryType: LotteryType;
  records: any[];
}

export default function DataStatusBar({ lotteryType, records }: Props) {
  const config = getConfig(lotteryType);
  const count = records.length;
  const manualCount = records.filter((r: any) => r.source === 'manual').length;
  const isReal = manualCount > 0;
  const canBacktest = count >= 50;

  const latestDate = count > 0 ? records[records.length - 1]?.date : '-';
  const earliestDate = count > 0 ? records[0]?.date : '-';

  return (
    <div className="p-3 rounded-lg border bg-gray-800/60 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`text-sm ${config.themeColor} border-current`}>
          <Database className="w-3 h-3 mr-1" />
          {config.name}
        </Badge>
        <Badge variant="outline" className={`text-sm border-gray-600 ${isReal ? 'text-green-400' : 'text-orange-400'}`}>
          {isReal ? '真實資料' : '模擬資料'}
        </Badge>
        <Badge variant="outline" className="text-sm border-gray-600 text-gray-400">
          <Calendar className="w-3 h-3 mr-1" />
          {count} 期
        </Badge>
        {canBacktest ? (
          <Badge variant="outline" className="text-sm border-green-700 text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            可回測
          </Badge>
        ) : (
          <Badge variant="outline" className="text-sm border-orange-700 text-orange-400">
            需 {50 - count} 期才可回測
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
        <span>最早：{earliestDate}</span>
        <span>最新：{latestDate}</span>
        <span>手動：{manualCount} 期</span>
        <span>範圍：{config.mainMin}~{config.mainMax} 選{config.mainCount}</span>
        <span>每注：${config.ticketPrice}</span>
      </div>

      {!isReal && (
        <div className="flex items-start gap-2 p-2 rounded bg-orange-950/20 border border-orange-900/20">
          <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
          <p className="text-sm text-orange-300/70">
            目前為模擬資料，回測結果不可視為真實績效。請到「資料」頁面匯入真實開獎資料。
          </p>
        </div>
      )}
    </div>
  );
}
