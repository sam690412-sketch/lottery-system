// ============================================================
// V11 新增最新一期開獎 - 三彩種化
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';
import { isDrawToday, getNextDrawDate } from '@/utils/drawSchedule';

interface Props {
  records: any[];
  onUpdate: (records: any[]) => void;
  lotteryType: LotteryType;
}

export default function LatestDrawUpdater({ records, onUpdate, lotteryType }: Props) {
  const config = getConfig(lotteryType);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState('');
  const [zone1Input, setZone1Input] = useState('');
  const [zone2, setZone2] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const todayDraw = isDrawToday(lotteryType);
  const nextDraw = getNextDrawDate(lotteryType);

  const handleAdd = () => {
    setStatus({ type: null, message: '' });
    const z1Nums = zone1Input.split(/[\s,]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const z2Num = config.hasSpecial && config.specialMode !== 'none' ? parseInt(zone2) : 0;
    const periodNum = parseInt(period);

    // 驗證
    if (isNaN(periodNum)) { setStatus({ type: 'error', message: '期數無效' }); return; }
    if (z1Nums.length !== config.mainCount) { setStatus({ type: 'error', message: `第一區必須${config.mainCount}碼，實際${z1Nums.length}碼` }); return; }
    if (z1Nums.some(n => n < config.mainMin || n > config.mainMax)) { setStatus({ type: 'error', message: `第一區必須${config.mainMin}~${config.mainMax}` }); return; }
    if (new Set(z1Nums).size !== z1Nums.length) { setStatus({ type: 'error', message: '第一區號碼不可重複' }); return; }
    if (config.hasSpecial && config.specialMode === 'separate' && (isNaN(z2Num) || z2Num < config.specialMin || z2Num > config.specialMax)) {
      setStatus({ type: 'error', message: `第二區必須${config.specialMin}~${config.specialMax}` }); return;
    }

    const newDraw: any = {
      date, period: periodNum,
      zone1: z1Nums, zone2: z2Num,
      source: 'manual', verified: true,
      importedAt: new Date().toISOString(),
    };

    const existing = records.find(r => r.period === periodNum);
    if (existing) { setStatus({ type: 'error', message: `期數${periodNum}已存在` }); return; }

    const updated = [...records, newDraw].sort((a, b) => a.period - b.period);
    onUpdate(updated);
    setStatus({ type: 'success', message: `成功新增${config.name}第${periodNum}期` });
    setPeriod(''); setZone1Input(''); setZone2('');
  };

  const suggestNextPeriod = () => {
    if (records.length === 0) return '';
    return String(Math.max(...records.map(r => r.period)) + 1);
  };

  return (
    <Card className="border border-green-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-green-400 text-lg">
          <Plus className="w-5 h-5" />
          新增{config.name}最新一期
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 開獎日提示 */}
        <div className={`p-2 rounded flex items-start gap-2 ${todayDraw ? 'bg-amber-950/20 border border-amber-900/20' : 'bg-blue-950/20 border border-blue-900/20'}`}>
          <Calendar className={`w-4 h-4 mt-0.5 shrink-0 ${todayDraw ? 'text-amber-400' : 'text-blue-400'}`} />
          <p className={`text-xs ${todayDraw ? 'text-amber-300/80' : 'text-blue-300/80'}`}>
            {todayDraw ? `今天是${config.name}開獎日（${config.drawDays.join('、')}）` : `下次開獎：${nextDraw.toISOString().split('T')[0]}（${config.drawDays.join('、')}）`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-400">開獎日期</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-gray-800 border-gray-700 text-gray-100 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-gray-400">期數</Label>
            <div className="flex gap-1">
              <Input type="number" value={period} onChange={e => setPeriod(e.target.value)} placeholder={suggestNextPeriod()} className="bg-gray-800 border-gray-700 text-gray-100 text-sm" />
              {suggestNextPeriod() && (
                <Button variant="outline" size="sm" onClick={() => setPeriod(suggestNextPeriod())} className="text-[10px] border-gray-700 text-gray-400 whitespace-nowrap">接續</Button>
              )}
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs text-gray-400">第一區{config.mainCount}碼（空格或逗號分隔）{config.mainMin}~{config.mainMax}</Label>
          <Input value={zone1Input} onChange={e => setZone1Input(e.target.value)} placeholder={`例：3 12 18 25 31${config.mainCount > 5 ? ' 36' : ''}`} className="bg-gray-800 border-gray-700 text-gray-100 text-sm" />
        </div>

        {config.hasSpecial && (
          <div>
            <Label className="text-xs text-gray-400">
              {config.specialMode === 'separate' ? `第二區（${config.specialMin}~${config.specialMax}）` : '特別號（開獎用，1~49）'}
            </Label>
            <Input type="number" value={zone2} onChange={e => setZone2(e.target.value)} placeholder={config.specialMode === 'separate' ? '1~8' : '1~49'} className="bg-gray-800 border-gray-700 text-gray-100 text-sm w-24" />
          </div>
        )}

        <Button onClick={handleAdd} disabled={!date || !period || !zone1Input} className="w-full bg-green-600 hover:bg-green-500 text-gray-900 disabled:opacity-50">
          <Plus className="w-4 h-4 mr-1" />確認新增
        </Button>

        {status.type === 'success' && (
          <div className="flex items-center gap-2 p-2 rounded bg-green-950/20 border border-green-900/20">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-xs text-green-300/80">{status.message}</p>
          </div>
        )}
        {status.type === 'error' && (
          <div className="flex items-center gap-2 p-2 rounded bg-red-950/20 border border-red-900/20">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-xs text-red-300/80">{status.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
