// ============================================================
// V9 選號輸入 - 三彩種動態範圍 + 多組數選擇
// ============================================================
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Calendar, Clock, Settings, Info } from 'lucide-react';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';

interface Props {
  onGenerate: (data: {
    userZone1: number[];
    userZone2: number;
    date: string;
    time: string;
    enableHexagram: boolean;
    strategy: string;
    comboCount: number;
  }) => void;
  lotteryType: LotteryType;
  defaultZone1?: number[];
  defaultZone2?: number;
}

const COMBO_OPTIONS = [1, 2, 3, 5, 10];

export default function NumberInput({ onGenerate, lotteryType, defaultZone1, defaultZone2 }: Props) {
  const config = getConfig(lotteryType);

  const [zone1Str, setZone1Str] = useState(() =>
    (defaultZone1 || [5, 7, 9, 29, 30, 31]).slice(0, config.mainCount).join(',')
  );
  const [zone2Str, setZone2Str] = useState(String(defaultZone2 || 7));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [enableHex, setEnableHex] = useState(true);
  const [strategy, setStrategy] = useState<string>('平衡');
  const [comboCount, setComboCount] = useState<number>(3);
  const [error, setError] = useState('');

  // 彩種切換時重置輸入
  useEffect(() => {
    setZone1Str((defaultZone1 || [5, 7, 9, 29, 30, 31]).filter(n => n >= config.mainMin && n <= config.mainMax).slice(0, config.mainCount).join(','));
    setZone2Str(String(defaultZone2 || (config.specialMode === 'separate' ? 7 : 0)));
    setError('');
  }, [lotteryType, config.mainMin, config.mainMax, config.mainCount, config.specialMode, defaultZone1, defaultZone2]);

  const handleGenerate = () => {
    setError('');
    const zone1 = zone1Str.split(/[,，\s]+/).map(Number).filter(n => !isNaN(n) && n >= config.mainMin && n <= config.mainMax);
    const unique = [...new Set(zone1)];

    if (unique.length < Math.min(2, config.mainCount)) {
      setError(`請至少輸入 ${Math.min(2, config.mainCount)} 個 ${config.mainMin}~${config.mainMax} 的號碼作為養號`);
      return;
    }

    let zone2 = 0;
    if (config.hasSpecial && config.specialMode === 'separate') {
      zone2 = Number(zone2Str);
      if (isNaN(zone2) || zone2 < config.specialMin || zone2 > config.specialMax) {
        setError(`第二區請輸入 ${config.specialMin}~${config.specialMax} 的號碼`);
        return;
      }
    }

    onGenerate({
      userZone1: unique,
      userZone2: zone2,
      date,
      time,
      enableHexagram: enableHex,
      strategy,
      comboCount,
    });
  };

  const strategyColors: Record<string, string> = {
    '保守': 'text-blue-400',
    '平衡': 'text-green-400',
    '進取': 'text-red-400',
    '純統計': 'text-purple-400',
    '卦象強化': 'text-amber-400',
    '夢境強化': 'text-pink-400',
  };

  return (
    <Card className="border border-amber-900/30 bg-gray-900/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-400 text-lg">
          <Settings className="w-5 h-5" />
          選號設定
          <Badge variant="outline" className={`text-[10px] ml-2 ${config.themeColor} border-current`}>
            {config.mainMin}~{config.mainMax}選{config.mainCount}
            {config.hasSpecial && config.specialMode === 'separate' ? ` + ${config.specialMin}~${config.specialMax}` : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 養號輸入 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-300 text-sm">
              第一區養號 ({config.mainCount}碼範圍{config.mainMin}~{config.mainMax}，可輸入{Math.min(2, config.mainCount)}~{config.mainCount}碼)
            </Label>
            <Input
              value={zone1Str}
              onChange={e => setZone1Str(e.target.value)}
              placeholder={`例: ${Array.from({ length: Math.min(config.mainCount, 6) }, (_, i) => config.mainMin + i * Math.floor((config.mainMax - config.mainMin) / config.mainCount)).join(',')}`}
              className="mt-1 bg-gray-800 border-gray-700 text-amber-100 placeholder:text-gray-600"
            />
            <p className="text-[10px] text-gray-500 mt-1">輸入您的養號，系統會保留高分養號並推薦其他號碼補足{config.mainCount}碼</p>
          </div>
          {config.hasSpecial && config.specialMode === 'separate' && (
            <div>
              <Label className="text-gray-300 text-sm">第二區養號 (1碼 {config.specialMin}~{config.specialMax})</Label>
              <Input
                value={zone2Str}
                onChange={e => setZone2Str(e.target.value)}
                placeholder={`例: ${config.specialMin + 2}`}
                className="mt-1 bg-gray-800 border-gray-700 text-amber-100 placeholder:text-gray-600 w-24"
              />
            </div>
          )}
        </div>

        {config.specialMode === 'same' && (
          <div className="flex items-start gap-2 p-2 rounded bg-blue-950/20 border border-blue-900/20">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-300/80">
              {config.name}的特別號由開獎時從主區再抽1碼決定，投注時只需選{config.mainCount}碼即可。
            </p>
          </div>
        )}

        {/* 日期時間 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-gray-800 border-gray-700 text-amber-100" />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-gray-800 border-gray-700 text-amber-100" />
          </div>
        </div>

        {/* 策略 + 組數 + 卦象 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-gray-300 text-sm mb-2 block">策略風格</Label>
            <RadioGroup value={strategy} onValueChange={setStrategy} className="flex flex-wrap gap-2">
              {Object.keys(strategyColors).map(s => (
                <div key={s} className="flex items-center space-x-1">
                  <RadioGroupItem value={s} id={s} className="border-amber-600 text-amber-500" />
                  <Label htmlFor={s} className={`text-sm cursor-pointer ${strategyColors[s]}`}>{s}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="text-gray-300 text-sm mb-2 block">產出組數</Label>
            <RadioGroup value={String(comboCount)} onValueChange={v => setComboCount(Number(v))} className="flex flex-wrap gap-2">
              {COMBO_OPTIONS.map(c => (
                <div key={c} className="flex items-center space-x-1">
                  <RadioGroupItem value={String(c)} id={`c${c}`} className="border-amber-600 text-amber-500" />
                  <Label htmlFor={`c${c}`} className="text-sm text-gray-300 cursor-pointer">{c}組</Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-[10px] text-amber-500/60 mt-1">選{comboCount}組必須產出{comboCount}組</p>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={enableHex} onCheckedChange={setEnableHex} className="data-[state=checked]:bg-amber-600" />
            <Label className="text-gray-300 text-sm cursor-pointer">啟用卦象輔助</Label>
          </div>
        </div>

        {/* 錯誤提示 */}
        {error && (
          <div className="p-2 rounded bg-red-950/20 border border-red-900/20">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* 產生按鈕 */}
        <Button
          onClick={handleGenerate}
          className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-gray-900 font-bold text-lg py-6"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          啟動13層選號漏斗 ({comboCount}組)
        </Button>
      </CardContent>
    </Card>
  );
}
