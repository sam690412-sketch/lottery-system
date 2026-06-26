// ============================================================
// V14 統計頁權限提示橫幅
// ============================================================
import { Badge } from '@/components/ui/badge';
import { getPermissionMessage, shouldShowUpgradePrompt, getPeriodLabel } from '@/utils/statPermission';
import { getCurrentRole } from '@/utils/auth';
import { BarChart3, Crown } from 'lucide-react';

interface Props {
  dataCount: number;
  usedCount: number;
}

export default function StatisticsAccessBanner({ dataCount, usedCount }: Props) {
  const role = getCurrentRole();
  const periodLabel = getPeriodLabel(role);
  const message = getPermissionMessage(role);
  const showUpgrade = shouldShowUpgradePrompt(role);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <Badge className={
            role === 'admin' ? 'bg-purple-600' : role === 'tester' ? 'bg-emerald-600' :
            role === 'vip' ? 'bg-amber-600' : role === 'free' ? 'bg-blue-600' : 'bg-gray-600'
          }>
            {role === 'guest' ? '訪客' : role === 'free' ? '免費' : role === 'vip' ? 'VIP' : role === 'tester' ? '測試員' : '管理員'}
          </Badge>
        </div>
        <span className="text-xs text-gray-400">{periodLabel}</span>
      </div>
      <p className="text-xs text-gray-400">
        本次統計使用 <span className="text-amber-400 font-bold">{usedCount}</span> 期
        {dataCount < 100 ? `（資料僅有 ${dataCount} 期，統計僅供參考）` :
         usedCount < dataCount ? `（資料庫共 ${dataCount} 期，依身份限制使用 ${usedCount} 期）` :
         `（資料庫共 ${dataCount} 期）`}
      </p>
      {dataCount < 30 && (
        <p className="text-xs text-red-400">資料不足，統計僅供參考。建議至少匯入30期以上。</p>
      )}
      {dataCount >= 30 && dataCount < 100 && (
        <p className="text-xs text-amber-400">目前資料量較少，統計結果僅供參考。</p>
      )}
      <p className="text-xs text-gray-500">{message}</p>
      {showUpgrade && (
        <p className="text-xs text-amber-400 flex items-center gap-1"><Crown className="w-3 h-3" />升級VIP可查看完整歷史統計與深度分析</p>
      )}
    </div>
  );
}
