// ============================================================
// V8 資料健康度面板
// ============================================================
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, RefreshCw, Shield, Database, Calendar } from 'lucide-react';
import type { DrawRecordV8 } from '@/utils/dataSource';
import { sourceLabel } from '@/utils/dataSource';
import { checkHealth } from '@/utils/historyValidator';
import type { HealthReport } from '@/utils/historyValidator';
import { Label } from '@/components/ui/label';

interface Props {
  records: DrawRecordV8[];
}

export default function DataHealthPanel({ records }: Props) {
  const [checking, setChecking] = useState(false);

  const health = useMemo<HealthReport>(() => {
    setChecking(true);
    const result = checkHealth(records);
    setTimeout(() => setChecking(false), 300);
    return result;
  }, [records]);

  const sourceEntries = useMemo(() => {
    const entries = Object.entries(health.sourceBreakdown);
    const total = health.totalCount || 1;
    return entries.map(([source, count]) => ({
      source,
      label: sourceLabel(source as any),
      count,
      percent: Math.round((count / total) * 100),
    }));
  }, [health]);

  const qualityColor = health.quality === '可正式回測' ? 'text-green-400' : health.quality === '可初步回測' ? 'text-amber-400' : 'text-red-400';
  const qualityBg = health.quality === '可正式回測' ? 'bg-green-900/20 border-green-700/30' : health.quality === '可初步回測' ? 'bg-amber-900/20 border-amber-700/30' : 'bg-red-900/20 border-red-700/30';

  return (
    <Card className="border border-blue-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-blue-400 text-lg">
          <Shield className="w-5 h-5" />
          資料健康度檢查
          {checking && <RefreshCw className="w-4 h-4 animate-spin ml-2" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 品質總評 */}
        <div className={`p-3 rounded-lg border ${qualityBg}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">資料品質</span>
            <span className={`text-sm font-bold ${qualityColor}`}>{health.quality}</span>
          </div>
          <Progress value={Math.min(100, (health.totalCount / 800) * 100)} className="h-2" />
          <p className="text-[10px] text-gray-500 mt-1">正式回測建議至少 800 期（約 3 年）</p>
        </div>

        {/* 基本統計 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded bg-gray-800/40">
            <div className="flex items-center gap-1 text-gray-500 text-[10px]">
              <Database className="w-3 h-3" />總筆數
            </div>
            <p className="text-lg font-bold text-gray-200">{health.totalCount} <span className="text-xs font-normal text-gray-500">期</span></p>
          </div>
          <div className="p-2 rounded bg-gray-800/40">
            <div className="flex items-center gap-1 text-gray-500 text-[10px]">
              <Calendar className="w-3 h-3" />時間跨度
            </div>
            <p className="text-xs text-gray-300 mt-1">{health.earliestDate} <span className="text-gray-600">~</span></p>
            <p className="text-xs text-gray-300">{health.latestDate}</p>
          </div>
        </div>

        {/* 資料來源分布 */}
        {sourceEntries.length > 0 && (
          <div>
            <Label className="text-xs text-gray-400 mb-2 block">資料來源分布</Label>
            <div className="space-y-1.5">
              {sourceEntries.map(entry => (
                <div key={entry.source} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-16">{entry.label}</span>
                  <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                    <div
                      className={`h-full ${entry.source === 'manual' ? 'bg-blue-600' : entry.source === 'auto' ? 'bg-green-600' : 'bg-orange-600'}`}
                      style={{ width: `${entry.percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right">{entry.count}期</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 警告列表 */}
        {health.warnings.length > 0 && (
          <div className="space-y-1.5">
            {health.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-orange-950/20 border border-orange-900/20">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-300/80">{w}</p>
              </div>
            ))}
          </div>
        )}

        {health.warnings.length === 0 && health.totalCount > 0 && (
          <div className="flex items-center gap-2 p-2 rounded bg-green-950/20 border border-green-900/20">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-xs text-green-300/80">資料檢查通過，無異常</p>
          </div>
        )}

        {/* 缺漏月份 */}
        {health.missingMonths.length > 0 && (
          <div className="p-2 rounded bg-gray-800/40">
            <p className="text-xs text-gray-400 mb-1">缺漏月份 ({health.missingMonths.length} 個)</p>
            <div className="flex flex-wrap gap-1">
              {health.missingMonths.slice(0, 12).map(m => (
                <Badge key={m} variant="outline" className="text-[10px] border-red-800/40 text-red-400">{m}</Badge>
              ))}
              {health.missingMonths.length > 12 && (
                <span className="text-[10px] text-gray-500">+{health.missingMonths.length - 12} 個</span>
              )}
            </div>
          </div>
        )}

        {/* 回測可行性 */}
        <div className="flex items-center gap-2">
          <Badge className={health.canBacktest ? 'bg-green-900/30 text-green-400 border-green-500/40' : 'bg-red-900/30 text-red-400 border-red-500/40'}>
            {health.canBacktest ? '可進行回測' : '資料不足無法回測'}
          </Badge>
          <span className="text-[10px] text-gray-500">需至少 50 期</span>
        </div>
      </CardContent>
    </Card>
  );
}


