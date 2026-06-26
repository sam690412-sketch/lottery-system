// ============================================================
// V8 歷史開獎資料管理 - CSV 匯入 + 資料來源標示
// ============================================================
import { useState, useMemo, useEffect } from 'react';
import { loadJson, saveJson, removeKey } from '@/repositories/businessDataStorage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Upload, FileText, Trash2, CheckCircle, Database } from 'lucide-react';
import type { DrawRecordV8, DataSource } from '@/utils/dataSource';
import { sourceLabel, sourceColor } from '@/utils/dataSource';

import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig, getStorageKey } from '@/utils/lotteryConfig';

interface Props {
  onHistoryChange: (records: DrawRecordV8[]) => void;
  lotteryType?: LotteryType;
}

export default function HistoryImport({ onHistoryChange, lotteryType = 'power' }: Props) {
  const config = getConfig(lotteryType);
  const [csvInput, setCsvInput] = useState('');
  // 依彩種載入歷史資料
  const loadRecords = (type: LotteryType): DrawRecordV8[] => {
    try {
      const raw = loadJson(getStorageKey(type, 'history'), null);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [];
  };

  const saveRecords = (type: LotteryType, data: DrawRecordV8[]) => {
    try {
      saveJson(getStorageKey(type, 'history'), data);
    } catch { /* ignore */ }
  };

  const [records, setRecords] = useState<DrawRecordV8[]>(() => loadRecords(lotteryType));
  const [status, setStatus] = useState('');

  // 彩種切換時重新載入
  useEffect(() => {
    const newRecords = loadRecords(lotteryType);
    setRecords(newRecords);
    onHistoryChange(newRecords);
  }, [lotteryType]);

  const hasRealData = useMemo(() => {
    return records.some(r => r.source === 'manual');
  }, [records]);

  const handleImport = () => {
    if (!csvInput.trim()) { setStatus('請貼上CSV資料'); return; }

    const lines = csvInput.trim().split('\n');
    const parsed: DrawRecordV8[] = [];
    const errors: string[] = [];

    // 依彩種決定欄位數
    const expectedCols = config.specialMode === 'none' ? 7 : 9; // 今彩539=7(日期+期數+5碼), 其他=9
    const zone1End = 2 + config.mainCount; // zone1 結束索引

    lines.forEach((line, idx) => {
      const parts = line.split(/[,\s\t]+/).filter(Boolean);
      if (parts.length < expectedCols) {
        if (idx > 0 || parts.length > 1) errors.push(`第${idx + 1}行：欄位不足(${parts.length}個，需${expectedCols}個)`);
        return;
      }

      const date = parts[0];
      const period = parseInt(parts[1]);
      const zone1 = parts.slice(2, zone1End).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      const zone2 = config.specialMode !== 'none' ? parseInt(parts[zone1End]) : 0;

      // 依彩種驗證
      if (zone1.length !== config.mainCount) {
        errors.push(`第${idx + 1}行：第一區必須${config.mainCount}碼`);
        return;
      }
      if (zone1.some(n => n < config.mainMin || n > config.mainMax)) {
        errors.push(`第${idx + 1}行：第一區必須${config.mainMin}~${config.mainMax}`);
        return;
      }

      parsed.push({
        date, period, zone1, zone2,
        source: 'manual' as DataSource,
        verified: true,
        importedAt: new Date().toISOString(),
      });
    });

    if (parsed.length === 0) {
      setStatus(`無法解析有效資料。${errors.slice(0, 3).join('; ')}`);
      return;
    }

    const merged = [...records, ...parsed];
    const seen = new Set<string>();
    const unique = merged.filter(r => {
      const key = `${r.period}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.period - b.period);

    saveRecords(lotteryType, unique);
    setRecords(unique);
    onHistoryChange(unique);
    setCsvInput('');
    setStatus(`成功匯入 ${parsed.length} 筆（${errors.length > 0 ? errors.length + ' 筆錯誤略過' : '無錯誤'}），共 ${unique.length} 筆`);
  };

  const handleClear = () => {
    removeKey(getStorageKey(lotteryType, 'history'));
    setRecords([]);
    onHistoryChange([]);
    setStatus('已清除資料');
  };

  const getCSVTemplate = () => {
    if (config.id === 'daily539') {
      return `日期,期數,n1,n2,n3,n4,n5
2025-01-02,114000001,3,12,18,25,31
2025-01-06,114000002,5,9,17,22,28
2025-01-09,114000003,1,8,15,23,30`;
    }
    return `日期,期數,n1,n2,n3,n4,n5,n6,${config.specialMode === 'separate' ? 'z2' : 'special'}
2025-01-02,114000001,3,12,18,25,31,36,7
2025-01-06,114000002,5,9,17,22,28,35,3
2025-01-09,114000003,1,8,15,23,30,38,5`;
  };

  // 來源統計
  const sourceStats = useMemo(() => {
    const stats: Record<string, number> = {};
    records.forEach(r => { stats[r.source] = (stats[r.source] || 0) + 1; });
    return Object.entries(stats).map(([source, count]) => ({ source, count }));
  }, [records]);

  return (
    <div className="space-y-4">
      <Card className="border border-amber-900/30 bg-gray-900/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-400 text-lg">
            <Upload className="w-5 h-5" />
            CSV 批量匯入
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 資料狀態 */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={hasRealData ? 'bg-green-900/30 text-green-400 border-green-500/40' : 'bg-orange-900/30 text-orange-400 border-orange-500/40'}>
              <Database className="w-3 h-3 mr-1" />
              {hasRealData ? '真實資料模式' : '範例資料模式'}
            </Badge>
            <span className="text-sm text-gray-400">共 {records.length} 期</span>
            {sourceStats.map(({ source, count }) => (
              <Badge key={source} variant="outline" className={`text-[10px] ${sourceColor(source as DataSource)}`}>
                {sourceLabel(source as DataSource)} {count}
              </Badge>
            ))}
          </div>

          {!hasRealData && records.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded bg-orange-950/20 border border-orange-900/30">
              <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <div className="text-xs text-orange-300/80 space-y-1">
                <p>目前為系統產生的範例資料，不可作為正式回測依據。</p>
                <p>請從台灣彩券官網下載真實開獎資料後貼上。</p>
              </div>
            </div>
          )}

          {/* CSV 輸入 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-gray-300 text-sm">貼上 CSV 資料</Label>
              <Button variant="ghost" size="sm" onClick={() => setCsvInput(getCSVTemplate())} className="text-xs text-amber-500 hover:text-amber-400">
                <FileText className="w-3 h-3 mr-1" />填入範例
              </Button>
            </div>
            <Textarea
              value={csvInput}
              onChange={e => setCsvInput(e.target.value)}
              placeholder={`日期,期數,n1,n2,n3,n4,n5,n6,z2\n2025-01-02,114000001,3,12,18,25,31,36,7\n...`}
              className="h-32 bg-gray-800 border-gray-700 text-gray-100 text-xs font-mono placeholder:text-gray-600"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              格式：日期,期數,第一區六碼,第二區一碼。可用逗號、空格或Tab分隔。可使用台灣彩券官網下載的格式。
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleImport} className="bg-amber-600 hover:bg-amber-500 text-gray-900">
              <CheckCircle className="w-4 h-4 mr-1" />匯入資料
            </Button>
            {records.length > 0 && (
              <Button variant="outline" onClick={handleClear} className="border-red-700 text-red-400 hover:bg-red-900/20">
                <Trash2 className="w-4 h-4 mr-1" />清除重置
              </Button>
            )}
          </div>

          {status && (
            <p className={`text-xs ${status.includes('成功') ? 'text-green-400' : status.includes('清除') ? 'text-amber-400' : 'text-red-400'}`}>
              {status}
            </p>
          )}

          {/* 最近資料預覽 */}
          {records.length > 0 && (
            <div className="mt-2">
              <Label className="text-gray-400 text-xs">最近資料預覽 (前5筆，標示來源)</Label>
              <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                {records.slice(-5).reverse().map(r => (
                  <div key={r.period} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-gray-800/40 rounded">
                    <span className="text-gray-500 w-24 shrink-0">{r.date}</span>
                    <span className="text-amber-500 w-16 shrink-0">{r.period}</span>
                    <span className="text-gray-300 flex-1">{r.zone1.map(n => String(n).padStart(2, '0')).join(',')}</span>
                    <span className="text-amber-400 w-8 text-center">+{r.zone2}</span>
                    <Badge variant="outline" className={`text-[10px] ${sourceColor(r.source)}`}>
                      {sourceLabel(r.source)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
