// ============================================================
// V14.0 夢境頁 - 6大學派選擇 + 解析結果
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { saveDreamRecords, loadDreamRecords } from '@/utils/dreamDB';
import type { DreamRecord } from '@/utils/dreamDB';
import { DREAM_SCHOOLS, analyzeDreamAllSchools, saveDailyDreamWeights, clearDailyDreamWeights, loadSelectedDreamSchools, saveSelectedDreamSchools, type DreamAnalysisResult, type DreamSchoolId } from '@/utils/dreamSchools';
import { hasPermission } from '@/utils/permissions';
import { trackFirst } from '@/utils/behaviorTracker';
import { Moon, Save, Sparkles, Lock, BookOpen, Trash2, CheckSquare, Square } from 'lucide-react';

type Emotion = '吉' | '普通' | '不安';

export default function DreamPage() {
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState<Emotion>('普通');
  const [numbers, setNumbers] = useState('');
  const [results, setResults] = useState<DreamAnalysisResult[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [records, setRecords] = useState<DreamRecord[]>(() => loadDreamRecords());
  const [selectedSchools, setSelectedSchools] = useState<DreamSchoolId[]>(() => loadSelectedDreamSchools());
  const canUseDream = hasPermission('canUseDream');

  // V18.2.9 P0-3: 切換學派勾選
  const toggleSchool = (id: DreamSchoolId) => {
    setSelectedSchools(prev => {
      const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id];
      saveSelectedDreamSchools(next);
      return next;
    });
  };

  const handleAnalyze = () => {
    if (!content.trim()) return;
    trackFirst('first_dream'); // V18.1.1: 首次夢境追蹤
    const allResults = analyzeDreamAllSchools(content, emotion);
    setResults(allResults);
    // V18.2.9 P0-3: 只保存已勾選學派的權重
    const weights: Record<number, number> = {};
    allResults.forEach(r => {
      if (selectedSchools.includes(r.school)) {
        Object.entries(r.weights).forEach(([n, w]) => {
          weights[Number(n)] = (weights[Number(n)] || 0) + (r.school === 'ai' ? w : w * 0.15);
        });
      }
    });
    saveDailyDreamWeights(weights, content);
  };

  const handleSave = () => {
    if (!results || results.length === 0) return;
    const aiResult = results.find(r => r.school === 'ai') || results[0];
    const record: DreamRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      content,
      emotion,
      symbols: [],
      dreamNumbers: numbers.split(/[,\\s]+/).map(Number).filter(n => !isNaN(n)),
      note: '',
      luckyTails: aiResult.luckyTails,
      avoidTails: [],
      suggestedNumbers: aiResult.recommendedNumbers,
    };
    const all = [record, ...records];
    saveDreamRecords(all);
    setRecords(all);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!canUseDream) {
    return (
      <div className="space-y-6 pb-24">
        <h1 className="text-2xl font-bold text-gray-100">夢境選牌</h1>
        <Card className="border border-gray-800 bg-gray-900/80">
          <CardContent className="p-6 text-center">
            <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">註冊免費會員即可使用夢境選牌</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2"><Moon className="w-6 h-6 text-indigo-400" />夢境選牌</h1>
        <p className="text-sm text-gray-500">6大學派解析夢境，轉為選號權重</p>
      </div>

      {/* V18.2.9 P0-3: 學派勾選 */}
      <Card className="border border-gray-800 bg-gray-900/40">
        <CardContent className="p-3">
          <p className="text-xs text-gray-500 mb-2">選擇要使用的學派（解析時只使用已勾選）：</p>
          <div className="flex flex-wrap gap-2">
            {DREAM_SCHOOLS.filter(s => s.id !== 'ai').map(s => {
              const isSelected = selectedSchools.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSchool(s.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/30 text-indigo-300'
                      : 'border-gray-700 bg-gray-800/30 text-gray-500'
                  }`}
                >
                  {isSelected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                  {s.name}
                </button>
              );
            })}
          </div>
          {selectedSchools.includes('ai') && (
            <Badge className="mt-2 bg-amber-600/20 text-amber-400 border-amber-700 text-xs">AI綜合：自動加權所有已勾選學派</Badge>
          )}
        </CardContent>
      </Card>

      {/* 輸入 */}
      <Card className="border border-indigo-900/30 bg-gray-900/80">
        <CardHeader className="pb-2"><CardTitle className="text-indigo-400 text-lg flex items-center gap-2"><BookOpen className="w-5 h-5" />夢境輸入</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">我夢到什麼？</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="描述你的夢境，例如：夢到蛇在水裡遊，天空有龍..." className="bg-gray-800 border-gray-700 text-gray-100 mt-1 h-24" />
          </div>
          <div>
            <Label className="text-gray-300">夢境感覺</Label>
            <div className="flex gap-2 mt-1">
              {(['吉', '普通', '不安'] as Emotion[]).map(e => (
                <Button key={e} size="sm" variant={emotion === e ? 'default' : 'outline'}
                  onClick={() => setEmotion(e)}
                  className={emotion === e ? 'bg-indigo-600 text-white' : 'border-gray-600 text-gray-400'}>{e}</Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-gray-300">夢中數字（選填）</Label>
            <Input value={numbers} onChange={e => setNumbers(e.target.value)} placeholder="例如：7, 12, 23" className="bg-gray-800 border-gray-700 text-gray-100 mt-1" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAnalyze} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Sparkles className="w-4 h-4 mr-1" /> 解析夢境（{selectedSchools.length}學派）
            </Button>
            {results && (
              <Button onClick={handleSave} variant="outline" className="border-emerald-600 text-emerald-400">
                <Save className="w-4 h-4 mr-1" /> {saved ? '已儲存' : '保存'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* V14.1: 解析成功自動套用權重 */}
      {results && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-indigo-400">解析結果（{results.filter(r => selectedSchools.includes(r.school)).length}個已勾選學派）</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { clearDailyDreamWeights(); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
              className="border-gray-600 text-gray-400 text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" /> 清除權重
            </Button>
          </div>
          {/* 自動套用提示 */}
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/30">
            <p className="text-sm text-emerald-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> 夢境權重已自動套用
            </p>
            <p className="text-xs text-gray-500 mt-1">
              解析成功後權重已自動保存，回首頁產號即可生效。
            </p>
          </div>
          {results.filter(r => selectedSchools.includes(r.school)).map(r => (
            <Card key={r.school} className={`border ${r.school === 'ai' ? 'border-amber-700 bg-amber-950/10' : 'border-indigo-800/30 bg-gray-900/60'}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className={`font-bold ${r.school === 'ai' ? 'text-amber-400' : 'text-indigo-400'}`}>{r.schoolName}</p>
                  {r.school === 'ai' && <Badge className="bg-amber-600 text-white text-xs">AI綜合</Badge>}
                </div>
                <p className="text-xs text-gray-500">{r.basis}</p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500">推薦號碼：</span>
                  {r.recommendedNumbers.map(n => (
                    <span key={n} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${r.school === 'ai' ? 'bg-amber-600 text-white' : 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/30'}`}>{n}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-500">推薦尾數：{r.luckyTails.join('、')}</p>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-gray-500">夢境解析結果會自動加入 dreamWeights，影響選號評分。</p>
        </div>
      )}

      {/* 紀錄 */}
      <div>
        <h3 className="text-lg font-bold text-gray-200 mb-2">夢境紀錄 ({records.length})</h3>
        {records.length === 0 ? <p className="text-sm text-gray-600">尚無夢境紀錄</p> : (
          <div className="space-y-2">
            {records.slice(0, 5).map(r => (
              <Card key={r.id} className="border border-gray-800 bg-gray-900/60">
                <CardContent className="p-3">
                  <p className="text-sm text-gray-300">{r.content || '無內容'}</p>
                  <p className="text-xs text-gray-500 mt-1">{r.date} · 感覺：{r.emotion}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
