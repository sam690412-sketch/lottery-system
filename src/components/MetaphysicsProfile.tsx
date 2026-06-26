// ============================================================
// V10.5 命理資料輸入區
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BirthData } from '@/utils/divination';
import { saveBirthData, loadBirthData } from '@/utils/divination';
import { User, Save, AlertTriangle } from 'lucide-react';

export default function MetaphysicsProfile() {
  const existing = loadBirthData();
  const [year, setYear] = useState(existing?.year || 1990);
  const [month, setMonth] = useState(existing?.month || 1);
  const [day, setDay] = useState(existing?.day || 1);
  const [hour, setHour] = useState(existing?.hour || 12);
  const [gender, setGender] = useState<'男' | '女'>(existing?.gender || '男');
  const [isLunar, setIsLunar] = useState(existing?.isLunar ?? false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const data: BirthData = { year, month, day, hour, gender, isLunar };
    saveBirthData(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card className="border border-pink-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-pink-400 text-xl">
          <User className="w-6 h-6" />
          命理資料輸入
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded bg-pink-950/20 border border-pink-900/20 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
          <p className="text-sm text-pink-300/70">
            本功能為娛樂性質的個人化權重參考，不具備預測能力。僅輸入年月日時即可，請勿輸入完整姓名或身份證號。
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-base text-gray-300">出生年</Label>
            <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} min={1900} max={2030} className="bg-gray-800 border-gray-700 text-gray-100 text-base mt-1" />
          </div>
          <div>
            <Label className="text-base text-gray-300">月</Label>
            <Input type="number" value={month} onChange={e => setMonth(Number(e.target.value))} min={1} max={12} className="bg-gray-800 border-gray-700 text-gray-100 text-base mt-1" />
          </div>
          <div>
            <Label className="text-base text-gray-300">日</Label>
            <Input type="number" value={day} onChange={e => setDay(Number(e.target.value))} min={1} max={31} className="bg-gray-800 border-gray-700 text-gray-100 text-base mt-1" />
          </div>
          <div>
            <Label className="text-base text-gray-300">時辰 (0-23)</Label>
            <Input type="number" value={hour} onChange={e => setHour(Number(e.target.value))} min={0} max={23} className="bg-gray-800 border-gray-700 text-gray-100 text-base mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-base text-gray-300 mb-2 block">性別</Label>
            <div className="flex gap-2">
              {(['男', '女'] as const).map(g => (
                <Button key={g} size="sm" variant={gender === g ? 'default' : 'outline'}
                  onClick={() => setGender(g)}
                  className={gender === g ? 'bg-pink-600 text-white text-base' : 'border-gray-600 text-gray-400 text-base'}>
                  {g}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-base text-gray-300 mb-2 block">曆法</Label>
            <div className="flex gap-2">
              {([false, true] as const).map(l => (
                <Button key={String(l)} size="sm" variant={isLunar === l ? 'default' : 'outline'}
                  onClick={() => setIsLunar(l)}
                  className={isLunar === l ? 'bg-pink-600 text-white text-base' : 'border-gray-600 text-gray-400 text-base'}>
                  {l ? '農曆' : '國曆'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full bg-pink-600 hover:bg-pink-500 text-white text-base">
          <Save className="w-4 h-4 mr-1" /> {saved ? '已儲存命理資料' : '儲存命理資料'}
        </Button>
      </CardContent>
    </Card>
  );
}
