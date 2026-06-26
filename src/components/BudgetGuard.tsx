// ============================================================
// V11 預算守衛 - 理性投注提醒
// ============================================================
import { useState } from 'react';
import { loadJson, saveJson } from '@/repositories/businessDataStorage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, Shield, Save } from 'lucide-react';

interface BudgetSettings {
  maxPerDraw: number; // 每期最多幾組
  weeklyLimit: number; // 每週上限
  monthlyLimit: number; // 每月上限
}

const DEFAULT: BudgetSettings = { maxPerDraw: 5, weeklyLimit: 2000, monthlyLimit: 8000 };

function loadBudget(): BudgetSettings {
  try { return { ...DEFAULT, ...loadJson('lottery-budget', {}) }; }
  catch { return DEFAULT; }
}
function saveBudget(s: BudgetSettings) { saveJson('lottery-budget', s); }

interface Props {
  currentWeeklyCost?: number;
  currentMonthlyCost?: number;
}

export default function BudgetGuard({ currentWeeklyCost = 0, currentMonthlyCost = 0 }: Props) {
  const [settings, setSettings] = useState<BudgetSettings>(loadBudget);
  const [saved, setSaved] = useState(false);

  const weeklyOver = currentWeeklyCost > settings.weeklyLimit;
  const monthlyOver = currentMonthlyCost > settings.monthlyLimit;

  const handleSave = () => {
    saveBudget(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card className="border border-orange-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-orange-400 text-lg">
          <Shield className="w-5 h-5" />
          理性投注預算設定
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 警告 */}
        {(weeklyOver || monthlyOver) && (
          <div className="p-3 rounded bg-red-950/20 border border-red-900/20 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div className="text-xs text-red-300/80">
              {weeklyOver && <p>已超過本週預算上限（${currentWeeklyCost.toLocaleString()} / ${settings.weeklyLimit.toLocaleString()}）</p>}
              {monthlyOver && <p>已超過本月預算上限（${currentMonthlyCost.toLocaleString()} / ${settings.monthlyLimit.toLocaleString()}）</p>}
              <p>建議降低組數或暫停投注。</p>
            </div>
          </div>
        )}

        {/* 設定 */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-400">每期最多組數</Label>
            <div className="flex items-center gap-3 mt-1">
              <Slider value={[settings.maxPerDraw]} onValueChange={v => setSettings(s => ({ ...s, maxPerDraw: v[0] }))} min={1} max={10} step={1} className="flex-1" />
              <span className="text-sm font-bold text-gray-200 w-8">{settings.maxPerDraw}</span>
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-400">每週預算上限（元）</Label>
            <Input
              type="number"
              value={settings.weeklyLimit}
              onChange={e => setSettings(s => ({ ...s, weeklyLimit: Number(e.target.value) }))}
              className="bg-gray-800 border-gray-700 text-gray-100 text-sm mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-gray-400">每月預算上限（元）</Label>
            <Input
              type="number"
              value={settings.monthlyLimit}
              onChange={e => setSettings(s => ({ ...s, monthlyLimit: Number(e.target.value) }))}
              className="bg-gray-800 border-gray-700 text-gray-100 text-sm mt-1"
            />
          </div>
        </div>

        {/* 進度 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded bg-gray-800/40">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">本週使用</span>
              <span className={weeklyOver ? 'text-red-400' : 'text-gray-300'}>${currentWeeklyCost.toLocaleString()}</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded overflow-hidden">
              <div className={`h-full ${weeklyOver ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (currentWeeklyCost / settings.weeklyLimit) * 100)}%` }} />
            </div>
          </div>
          <div className="p-2 rounded bg-gray-800/40">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">本月使用</span>
              <span className={monthlyOver ? 'text-red-400' : 'text-gray-300'}>${currentMonthlyCost.toLocaleString()}</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded overflow-hidden">
              <div className={`h-full ${monthlyOver ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (currentMonthlyCost / settings.monthlyLimit) * 100)}%` }} />
            </div>
          </div>
        </div>

        <Button size="sm" onClick={handleSave} className="w-full bg-orange-600 hover:bg-orange-500 text-gray-900">
          <Save className="w-4 h-4 mr-1" /> {saved ? '已儲存' : '儲存設定'}
        </Button>

        <div className="p-2 rounded bg-red-950/20 border border-red-900/20">
          <p className="text-[10px] text-red-300/70">
            提醒：彩票為純隨機抽獎，長期預期 ROI 為負值。請將彩票視為娛樂支出而非投資，切勿超出負擔能力。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
