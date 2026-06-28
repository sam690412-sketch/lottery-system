// ============================================================
// V12 我的號碼 - 管理養號、生日、車牌等個人化來源
// ============================================================
import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';
import { userGetJson, userSetJson } from '@/utils/userStorage';
import { hasPermission } from '@/utils/permissions';
import { Heart, Plus, Trash2, AlertCircle, Lock } from 'lucide-react';

interface KeepSet {
  id: string;
  name: string;
  numbers: number[];
  type: LotteryType;
  note: string;
}

const STORAGE_KEY = 'v12-keep-sets';

/** 由收藏組建立 /selection-analysis 連結,帶入彩種、號碼、日期(由 id 反推)、備註。 */
function buildAnalysisHref(set: KeepSet): string {
  const params = new URLSearchParams();
  params.set('game', set.type);
  params.set('numbers', set.numbers.join(','));
  if (set.note) params.set('note', set.note);
  const ts = Number(set.id);
  if (Number.isFinite(ts) && ts > 1e12) {
    params.set('date', new Date(ts).toISOString().slice(0, 10));
  }
  return `/selection-analysis?${params.toString()}`;
}

export default function MyNumbersPage() {
  const [lotteryType, setLotteryType] = useState<LotteryType>('power');
  const [keepSets, setKeepSets] = useState<KeepSet[]>(() => userGetJson(STORAGE_KEY, []));
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNumbers, setNewNumbers] = useState('');
  const [newNote, setNewNote] = useState('');
  const canSave = hasPermission('canSaveNumbers');

  const config = getConfig(lotteryType);

  const saveSets = useCallback((sets: KeepSet[]) => {
    setKeepSets(sets);
    userSetJson(STORAGE_KEY, sets);
  }, []);

  const addSet = () => {
    const nums = newNumbers.split(/[,\s]+/).map(Number).filter(n => !isNaN(n) && n >= config.mainMin && n <= config.mainMax);
    if (nums.length < 2) return;
    const newSet: KeepSet = {
      id: Date.now().toString(),
      name: newName || `養號組 ${keepSets.length + 1}`,
      numbers: nums,
      type: lotteryType,
      note: newNote,
    };
    saveSets([newSet, ...keepSets]);
    setNewName(''); setNewNumbers(''); setNewNote(''); setShowAdd(false);
  };

  const deleteSet = (id: string) => {
    saveSets(keepSets.filter(s => s.id !== id));
  };

  const filteredSets = keepSets.filter(s => s.type === lotteryType);

  if (!canSave) {
    return (
      <div className="space-y-6 pb-24">
        <h1 className="text-2xl font-bold text-gray-100">我的號碼</h1>
        <Card className="border border-gray-800 bg-gray-900/80">
          <CardContent className="p-6 text-center">
            <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">註冊免費會員即可保存養號</p>
            <p className="text-sm text-gray-500 mt-2">訪客模式下養號不會被保存</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-100">我的號碼</h1>
      <p className="text-sm text-gray-500">管理你的固定養號、生日、車牌等個人化來源</p>
      <p className="text-xs text-amber-400/80 rounded-lg border border-amber-900/40 bg-amber-950/15 px-3 py-2">
        訪客模式僅保存在本機瀏覽器，清除瀏覽器資料或換裝置後可能消失；登入會員後可永久保存。
      </p>

      {/* 彩種切換 */}
      <div className="flex gap-2">
        {(['power', 'lotto649', 'daily539'] as LotteryType[]).map(t => (
          <Button
            key={t}
            size="sm"
            variant={lotteryType === t ? 'default' : 'outline'}
            onClick={() => setLotteryType(t)}
            className={lotteryType === t ? 'bg-amber-600' : 'border-gray-700 text-gray-400'}
          >
            {t === 'power' ? '威力彩' : t === 'lotto649' ? '大樂透' : '今彩539'}
          </Button>
        ))}
      </div>

      {/* 新增按鈕 */}
      {!showAdd && (
        <Button onClick={() => setShowAdd(true)} className="w-full bg-gray-800 hover:bg-gray-700">
          <Plus className="w-4 h-4 mr-2" /> 新增養號組
        </Button>
      )}

      {/* 新增表單 */}
      {showAdd && (
        <Card className="border border-gray-800 bg-gray-900/80">
          <CardContent className="p-4 space-y-3">
            <Label className="text-gray-300">名稱</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="例如：我的固定號" className="bg-gray-800 border-gray-700 text-gray-100" />
            <Label className="text-gray-300">號碼（用逗號或空格分隔）</Label>
            <Input value={newNumbers} onChange={e => setNewNumbers(e.target.value)} placeholder={`${config.mainMin}-${config.mainMax} 之間`} className="bg-gray-800 border-gray-700 text-gray-100" />
            <Label className="text-gray-300">備註</Label>
            <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="選填" className="bg-gray-800 border-gray-700 text-gray-100" />
            <div className="flex gap-2">
              <Button onClick={addSet} className="bg-emerald-600 hover:bg-emerald-500">儲存</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)} className="border-gray-700 text-gray-400">取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 養號列表 */}
      <div className="space-y-2">
        {filteredSets.length === 0 && (
          <Alert className="border-gray-800 bg-gray-900/40">
            <AlertCircle className="w-4 h-4 text-gray-500" />
            <AlertDescription className="text-gray-500">尚無養號，請點擊上方按鈕新增</AlertDescription>
          </Alert>
        )}
        {filteredSets.map(set => (
          <Card key={set.id} className="border border-gray-800 bg-gray-900/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <p className="font-bold text-gray-200">{set.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {set.numbers.map(n => (
                      <Badge key={n} variant="outline" className="border-amber-500/30 text-amber-400">{String(n).padStart(2, '0')}</Badge>
                    ))}
                  </div>
                  {set.note && <p className="text-xs text-gray-500 mt-1">{set.note}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <a
                    href={buildAnalysisHref(set)}
                    className="inline-flex items-center justify-center rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300 transition-colors hover:bg-orange-500/20"
                  >
                    分析
                  </a>
                  <button onClick={() => deleteSet(set.id)} className="text-gray-600 hover:text-red-400 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
