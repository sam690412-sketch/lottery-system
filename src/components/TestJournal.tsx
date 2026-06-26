// ============================================================
// V10 實測日誌 - 三彩種化
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Download, Save, Trash2, Trophy } from 'lucide-react';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';
import type { JournalEntry } from '@/utils/backtest';
import { loadJournal, saveJournal, exportJournalCSV } from '@/utils/backtest';

interface Props {
  combinations?: any[];
  lotteryType?: LotteryType;
}

export default function TestJournal({ combinations = [], lotteryType = 'power' }: Props) {
  const config = getConfig(lotteryType);
  const [entries, setEntries] = useState<JournalEntry[]>(() => loadJournal(lotteryType));
  const [drawZone1Str, setDrawZone1Str] = useState('');
  const [drawZone2Str, setDrawZone2Str] = useState('');
  const [prizeAmount, setPrizeAmount] = useState('');
  const [saved, setSaved] = useState(false);

  // 新增日誌
  const handleAdd = () => {
    if (!drawZone1Str.trim()) return;
    const drawZone1 = drawZone1Str.split(/[,\s]+/).map(Number).filter(n => !isNaN(n));
    const drawZone2 = config.hasSpecial ? Number(drawZone2Str) || 0 : 0;

    const newEntries: JournalEntry[] = [];

    (combinations.length > 0 ? combinations : [{ zone1: [], zone2: 0, name: '手動' }]).forEach((combo: any) => {
      const myZone1 = combo.zone1 || [];
      const myZone2 = combo.zone2 || 0;
      const matchCount = myZone1.filter((n: number) => drawZone1.includes(n)).length;
      const matchZone2 = config.specialMode === 'separate' ? myZone2 === drawZone2 : false;

      // 簡化獎項判斷
      let prize = '未中獎';
      if (config.id === 'power') {
        if (matchCount >= 3 || (matchCount >= 2 && matchZone2)) {
          prize = matchZone2 ? '有中第二區' : '中獎';
        }
      } else if (config.id === 'lotto649') {
        if (matchCount >= 3) prize = '中獎';
      } else {
        if (matchCount >= 2) prize = '中獎';
      }

      newEntries.push({
        id: Date.now() + '-' + Math.random(),
        lotteryType,
        date: new Date().toISOString().split('T')[0],
        strategy: combo.style || '手動',
        recommendedZone1: myZone1,
        recommendedZone2: myZone2,
        drawZone1,
        drawZone2,
        matchCount,
        matchMain: matchCount,
        matchSpecial: matchZone2,
        combinations: [],
        prize,
        prizeAmount: prizeAmount ? Number(prizeAmount) : 0,
        cost: config.ticketPrice,
        notes: `${config.name} 實測`,
      });
    });

    const all = [...newEntries, ...entries];
    setEntries(all);
    saveJournal(all);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setDrawZone1Str('');
    setDrawZone2Str('');
    setPrizeAmount('');
  };

  const handleExport = () => {
    const csv = exportJournalCSV(lotteryType);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name}_實測日誌_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    const all = loadJournal();
    const filtered = all.filter(e => e.lotteryType !== lotteryType);
    saveJournal(filtered);
    setEntries([]);
  };

  const typeEntries = entries.filter(e => e.lotteryType === lotteryType);

  return (
    <div className="space-y-4">
      <Card className="border border-green-900/30 bg-gray-900/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-green-400 text-lg">
            <BookOpen className="w-5 h-5" />
            {config.name} 實測日誌
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${config.themeColor} border-current`}>{config.name}</Badge>
            <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">{typeEntries.length} 筆記錄</Badge>
          </div>

          {/* 新增 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-400">開獎主區（{config.mainCount}碼）</Label>
              <Input
                value={drawZone1Str}
                onChange={e => setDrawZone1Str(e.target.value)}
                placeholder={`例: 3,12,18,25,31${config.mainCount > 5 ? ',36' : ''}`}
                className="bg-gray-800 border-gray-700 text-gray-100 text-sm"
              />
            </div>
            {config.hasSpecial && (
              <div>
                <Label className="text-xs text-gray-400">
                  {config.specialMode === 'separate' ? '第二區' : '特別號'}
                </Label>
                <Input
                  value={drawZone2Str}
                  onChange={e => setDrawZone2Str(e.target.value)}
                  placeholder={config.specialMode === 'separate' ? '1~8' : '參考用'}
                  className="bg-gray-800 border-gray-700 text-gray-100 text-sm w-24"
                />
              </div>
            )}
            <div>
              <Label className="text-xs text-gray-400">實際獎金（選填）</Label>
              <Input
                value={prizeAmount}
                onChange={e => setPrizeAmount(e.target.value)}
                placeholder="輸入實際金額"
                className="bg-gray-800 border-gray-700 text-gray-100 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} className="bg-green-600 hover:bg-green-500 text-gray-900">
              <Save className="w-4 h-4 mr-1" /> {saved ? '已儲存' : '記錄開獎'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} className="border-gray-600 text-gray-400">
              <Download className="w-4 h-4 mr-1" /> 匯出CSV
            </Button>
            {typeEntries.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleClear} className="border-red-700 text-red-400">
                <Trash2 className="w-4 h-4 mr-1" /> 清除
              </Button>
            )}
          </div>

          {/* 列表 */}
          {typeEntries.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {typeEntries.slice(0, 20).map(entry => (
                <div key={entry.id} className="p-2 rounded bg-gray-800/40 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{entry.date}</span>
                    <span className="text-gray-500">{entry.strategy}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-300">推: {entry.recommendedZone1?.join(',') ?? 'N/A'}</span>
                    {(entry.recommendedZone2 ?? 0) > 0 && <span className="text-amber-400">+{entry.recommendedZone2}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">開: {entry.drawZone1?.join(',')}</span>
                    <span className={`font-bold ${(entry.matchCount || 0) >= 2 ? 'text-green-400' : 'text-gray-500'}`}>
                      {entry.matchCount}碼命中
                    </span>
                    {entry.prize && entry.prize !== '未中獎' && (
                      <span className="flex items-center gap-0.5 text-amber-400">
                        <Trophy className="w-3 h-3" />{entry.prize}
                      </span>
                    )}
                  </div>
                  {entry.prizeAmount !== undefined && (
                    <div className="text-green-400">實際獎金: ${entry.prizeAmount.toLocaleString()}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
