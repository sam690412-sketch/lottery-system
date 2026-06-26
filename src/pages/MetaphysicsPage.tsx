// ============================================================
// V14.0 命理頁 - 7大學派 + 權重設定
// ============================================================
import { useState } from 'react';
import { loadJson } from '@/repositories/businessDataStorage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  META_SCHOOLS, META_QUICK_MODES, applyQuickMode, analyzeMetaAllSchools, type MetaSchoolId,
  getSchoolWeights, saveSchoolWeights, validateWeights, normalizeWeights,
  saveDailyMetaWeights, clearDailyMetaWeights,
} from '@/utils/metaphysicsSchools';
import { saveBirthData, loadBirthData } from '@/utils/divination';
import { hasPermission } from '@/utils/permissions';
import { useSyncExternalStore } from 'react';
import { getBackendAuthSnapshot, subscribeBackendAuthSnapshot } from '@/utils/backendAuthSnapshot';
import { getPermGuardSource, computeBackendPermission } from '@/utils/backendPermission';
import { userSetJson, userGetJson } from '@/utils/userStorage';
import { trackFirst } from '@/utils/behaviorTracker';
import { Sparkles, Save, Check, Lock, Settings, BookOpen, Trash2 } from 'lucide-react';

type Gender = '男' | '女';

export default function MetaphysicsPage() {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [gender, setGender] = useState<Gender>('男');
  const [saved, setSaved] = useState(false);
  const [results, setResults] = useState<ReturnType<typeof analyzeMetaAllSchools> | null>(null);
  const [weights, setWeights] = useState<Record<string, number>>(() => getSchoolWeights());
  const [enabledSchools, setEnabledSchools] = useState<MetaSchoolId[]>(() =>
    userGetJson<MetaSchoolId[]>('enabled-meta-schools', META_SCHOOLS.map(s => s.id))
  );
  const [showWeightPanel, setShowWeightPanel] = useState(false);

  // Batch 3d-3a: 灰度。預設 localStorage（行為不變）；flag=backend 時改讀後端快照。
  const permSource = getPermGuardSource();
  const snapshot = useSyncExternalStore(subscribeBackendAuthSnapshot, getBackendAuthSnapshot, getBackendAuthSnapshot);
  const backendPerm = computeBackendPermission(snapshot, 'metaphysics');
  const canUseMeta = permSource === 'backend'
    ? backendPerm.state === 'allow'
    : hasPermission('canUseMetaphysics');

  const handleToggleSchool = (id: MetaSchoolId) => {
    setEnabledSchools(prev => {
      const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id];
      userSetJson('enabled-meta-schools', next);
      return next;
    });
  };

  const handleWeightChange = (id: string, val: number) => {
    setWeights(prev => {
      const next = { ...prev, [id]: Math.max(0, Math.min(100, val)) };
      const normalized = normalizeWeights(next);
      saveSchoolWeights(normalized as Record<MetaSchoolId, number>);
      return normalized;
    });
  };

  const handleSaveBirth = () => {
    if (!year || !month || !day) return;
    const birthData = {
      year: parseInt(year), month: parseInt(month), day: parseInt(day),
      hour: parseInt(hour || '0'), gender, isLunar: false,
    };
    saveBirthData(birthData);
    setSaved(true);
    trackFirst('first_fortune'); // V18.1.1: 首次命理追蹤
    const analysisResults = analyzeMetaAllSchools(
      birthData.year, birthData.month, birthData.day,
      birthData.hour, birthData.gender, enabledSchools
    );
    setResults(analysisResults);
    // V14.1: 解析成功自動保存權重
    const metaWeights: Record<number, number> = {};
    analysisResults.forEach(r => {
      const w = r.userWeight / 100;
      Object.entries(r.weights).forEach(([n, weight]) => {
        metaWeights[Number(n)] = (metaWeights[Number(n)] || 0) + weight * w;
      });
    });
    saveDailyMetaWeights(metaWeights);
    setTimeout(() => setSaved(false), 2000);
  };

  const existingBirth = loadBirthData();
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  // Batch 3d-3a: backend 模式 loading → 驗證中（不閃鎖定、不誤判）
  if (permSource === 'backend' && backendPerm.state === 'loading') {
    return (
      <div className="space-y-6 pb-24">
        <h1 className="text-2xl font-bold text-gray-100">命理輔助</h1>
        <Card className="border border-gray-800 bg-gray-900/80">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400 text-sm">驗證中…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canUseMeta) {
    const lockMsg = permSource === 'backend' ? backendPerm.message : undefined;
    return (
      <div className="space-y-6 pb-24">
        <h1 className="text-2xl font-bold text-gray-100">命理輔助</h1>
        <Card className="border border-gray-800 bg-gray-900/80">
          <CardContent className="p-6 text-center">
            <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            {lockMsg ? <p className="text-amber-300 text-sm mb-2">{lockMsg}</p> : null}
            <p className="text-gray-400">命理輔助為 VIP 功能</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2"><Sparkles className="w-6 h-6 text-amber-400" />命理輔助</h1>
        <p className="text-sm text-gray-500">7大學派，可勾選、可設權重，總權重100%</p>
      </div>

      {/* V14.1: 命理快捷模式 */}
      <Card className="border border-amber-800/30 bg-amber-950/10">
        <CardHeader className="pb-2"><CardTitle className="text-amber-400 text-lg">命理快捷模式</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-gray-500">一鍵配置學派與權重，也可使用下方「自訂模式」手動調整</p>
          <div className="grid grid-cols-5 gap-2">
            {META_QUICK_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => {
                  applyQuickMode(mode.id);
                  setWeights(getSchoolWeights());
                  setEnabledSchools(loadJson('enabled-meta-schools', []));
                  setSaved(true);
                  setTimeout(() => setSaved(false), 1500);
                }}
                className="p-2 rounded-lg bg-gray-800 border border-gray-700 hover:border-amber-500 hover:bg-gray-750 transition text-center"
              >
                <p className="text-xs font-bold text-amber-300">{mode.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{mode.description.slice(0, 6)}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 學派選擇 + 權重設定 */}
      <Card className="border border-gray-800 bg-gray-900/80">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-amber-400 text-lg flex items-center gap-2"><BookOpen className="w-5 h-5" />自訂模式</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowWeightPanel(!showWeightPanel)} className="border-gray-600 text-gray-400">
              <Settings className="w-3 h-3 mr-1" />權重設定
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* 學派勾選 */}
          <div className="space-y-2">
            {META_SCHOOLS.map(s => {
              const isEnabled = enabledSchools.includes(s.id);
              return (
                <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border transition ${
                  isEnabled ? 'border-amber-700/40 bg-amber-950/10' : 'border-gray-800 bg-gray-900/20'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToggleSchool(s.id)}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <div>
                      <p className={`font-bold text-sm ${isEnabled ? 'text-amber-300' : 'text-gray-500'}`}>{s.name}</p>
                      <p className="text-xs text-gray-500">{s.origin} · {s.description}</p>
                    </div>
                  </div>
                  {isEnabled && <Badge className="bg-amber-600 text-xs">{Math.round(weights[s.id] || s.defaultWeight)}%</Badge>}
                </div>
              );
            })}
          </div>

          {/* 權重設定面板 */}
          {showWeightPanel && (
            <div className="mt-3 p-3 rounded-lg border border-gray-700 bg-gray-800/30 space-y-2">
              <p className="text-sm text-gray-300 font-medium">學派權重調整（總和: {Math.round(totalWeight)}%）</p>
              {!validateWeights(weights as Record<MetaSchoolId, number>) && (
                <p className="text-xs text-red-400">總權重需為100%</p>
              )}
              {META_SCHOOLS.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-20">{s.name}</span>
                  <input
                    type="range" min="0" max="50" value={Math.round(weights[s.id] || s.defaultWeight)}
                    onChange={e => handleWeightChange(s.id, parseInt(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="text-xs text-gray-300 w-10 text-right">{Math.round(weights[s.id] || s.defaultWeight)}%</span>
                </div>
              ))}
              <Button size="sm" onClick={() => { const n = normalizeWeights(Object.fromEntries(META_SCHOOLS.map(s => [s.id, s.defaultWeight]))); setWeights(n); saveSchoolWeights(n as Record<MetaSchoolId, number>); }} className="bg-gray-700 hover:bg-gray-600 text-xs">
                重置預設
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 出生資料 */}
      <Card className="border border-amber-900/30 bg-gray-900/80">
        <CardHeader className="pb-2"><CardTitle className="text-amber-400 text-lg">輸入出生資料</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">僅輸入年月日時即可</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-gray-300">出生年</Label><Input value={year} onChange={e => setYear(e.target.value)} placeholder="1990" className="bg-gray-800 border-gray-700 text-gray-100 mt-1" /></div>
            <div><Label className="text-gray-300">月</Label><Input value={month} onChange={e => setMonth(e.target.value)} placeholder="1-12" className="bg-gray-800 border-gray-700 text-gray-100 mt-1" /></div>
            <div><Label className="text-gray-300">日</Label><Input value={day} onChange={e => setDay(e.target.value)} placeholder="1-31" className="bg-gray-800 border-gray-700 text-gray-100 mt-1" /></div>
            <div><Label className="text-gray-300">時辰 (0-23)</Label><Input value={hour} onChange={e => setHour(e.target.value)} placeholder="0-23" className="bg-gray-800 border-gray-700 text-gray-100 mt-1" /></div>
          </div>
          <div>
            <Label className="text-gray-300">性別</Label>
            <div className="flex gap-2 mt-1">
              {(['男', '女'] as Gender[]).map(g => (
                <Button key={g} size="sm" variant={gender === g ? 'default' : 'outline'}
                  onClick={() => setGender(g)}
                  className={gender === g ? 'bg-amber-600 text-white' : 'border-gray-600 text-gray-400'}>{g}</Button>
              ))}
            </div>
          </div>
          <Button onClick={handleSaveBirth} className="bg-amber-600 hover:bg-amber-500">
            <Save className="w-4 h-4 mr-1" /> {saved ? '已儲存' : '儲存並解析'}
          </Button>

          {/* V14.1: 解析成功自動套用權重 */}
          {results && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold text-amber-400">解析結果（{results.length}個學派）</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { clearDailyMetaWeights(); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
                  className="border-gray-600 text-gray-400 text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> 清除權重
                </Button>
              </div>
              {/* 自動套用提示 */}
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/30">
                <p className="text-sm text-emerald-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> 命理權重已自動套用
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  儲存並解析後權重已自動保存，回首頁產號即可生效。
                </p>
              </div>
              {results.map(r => (
                <div key={r.school} className="p-3 rounded-lg bg-gray-900/40 border border-gray-800">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-200 text-sm">{r.schoolName}</p>
                    <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">權重{r.userWeight}%</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{r.basis}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.recommendedNumbers.map(n => (
                      <Badge key={n} variant="outline" className="text-xs border-gray-700">{n}</Badge>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500">命理分析結果會依權重加入 metaphysicsWeights，影響選號評分。</p>
            </div>
          )}
        </CardContent>
      </Card>

      {existingBirth && (
        <Alert className="border-emerald-800/40 bg-emerald-950/20">
          <Check className="w-4 h-4 text-emerald-400" />
          <AlertDescription className="text-emerald-300">
            已儲存命理資料：{existingBirth.year}年{existingBirth.month}月{existingBirth.day}日 {existingBirth.gender}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
