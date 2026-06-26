// ============================================================
// V10.5 夢境輸入面板
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';
import { DREAM_SYMBOLS, parseDream, saveDreamRecords, loadDreamRecords } from '@/utils/dreamDB';
import type { DreamRecord } from '@/utils/dreamDB';
import { Moon, Save, AlertTriangle, Sparkles } from 'lucide-react';

interface Props {
  lotteryType: LotteryType;
}

export default function DreamInputPanel({ lotteryType }: Props) {
  const config = getConfig(lotteryType);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState<'吉' | '普通' | '不安' | '驚醒'>('普通');
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [dreamNumbers, setDreamNumbers] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<ReturnType<typeof parseDream> | null>(null);
  const [saved, setSaved] = useState(false);

  const categories = [...new Set(DREAM_SYMBOLS.map(s => s.category))];

  const toggleSymbol = (s: string) => {
    setSelectedSymbols(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleAnalyze = () => {
    const nums = dreamNumbers.split(/[,\s]+/).map(Number).filter(n => !isNaN(n));
    const res = parseDream(selectedSymbols, emotion, nums, config.mainMax);
    setResult(res);
  };

  const handleSave = () => {
    if (!result) return;
    const record: DreamRecord = {
      id: Date.now().toString(),
      date, content, emotion,
      symbols: selectedSymbols,
      dreamNumbers: dreamNumbers.split(/[,\s]+/).map(Number).filter(n => !isNaN(n)),
      note,
      luckyTails: result.luckyTails,
      avoidTails: result.avoidTails,
      suggestedNumbers: result.suggestedNumbers,
    };
    const all = [record, ...loadDreamRecords()];
    saveDreamRecords(all);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card className="border border-indigo-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-indigo-400 text-xl">
          <Moon className="w-6 h-6" />
          夢境輸入與解析
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 免責聲明 */}
        <div className="p-3 rounded bg-indigo-950/20 border border-indigo-900/20 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
          <p className="text-sm text-indigo-300/70">
            本功能為象徵性、娛樂性與個人化權重參考，不具備預測能力，不保證中獎。
          </p>
        </div>

        {/* 基本資料 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-base text-gray-300">夢境日期</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-gray-800 border-gray-700 text-gray-100 text-base mt-1" />
          </div>
          <div>
            <Label className="text-base text-gray-300">夢境情緒</Label>
            <div className="flex gap-2 mt-1">
              {(['吉', '普通', '不安', '驚醒'] as const).map(e => (
                <Button key={e} size="sm" variant={emotion === e ? 'default' : 'outline'}
                  onClick={() => setEmotion(e)}
                  className={emotion === e ? 'bg-indigo-600 text-white' : 'border-gray-600 text-gray-400'}>
                  {e}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label className="text-base text-gray-300">夢境內容</Label>
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="描述你的夢境..." className="bg-gray-800 border-gray-700 text-gray-100 text-base mt-1 h-24" />
        </div>

        {/* 符號選擇 */}
        <div>
          <Label className="text-base text-gray-300 mb-2 block">夢境符號（可多選）{selectedSymbols.length > 0 && <Badge className="ml-2 bg-indigo-600">已選 {selectedSymbols.length} 個</Badge>}</Label>
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat}>
                <p className="text-sm text-gray-500 mb-1">{cat}</p>
                <div className="flex flex-wrap gap-1.5">
                  {DREAM_SYMBOLS.filter(s => s.category === cat).map(s => (
                    <button key={s.symbol} onClick={() => toggleSymbol(s.symbol)}
                      className={`px-2.5 py-1 rounded-full text-base border transition ${
                        selectedSymbols.includes(s.symbol)
                          ? 'bg-indigo-900/40 border-indigo-500/60 text-indigo-300'
                          : 'bg-gray-800/40 border-gray-700/40 text-gray-500 hover:text-gray-300'
                      }`}>
                      {s.symbol}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-base text-gray-300">夢中出現的數字</Label>
            <Input value={dreamNumbers} onChange={e => setDreamNumbers(e.target.value)} placeholder="例：7, 12, 23" className="bg-gray-800 border-gray-700 text-gray-100 text-base mt-1" />
          </div>
          <div>
            <Label className="text-base text-gray-300">備註</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="其他細節..." className="bg-gray-800 border-gray-700 text-gray-100 text-base mt-1" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleAnalyze} className="bg-indigo-600 hover:bg-indigo-500 text-white text-base">
            <Sparkles className="w-4 h-4 mr-1" /> 解析夢境
          </Button>
          {result && (
            <Button onClick={handleSave} variant="outline" className="border-green-600 text-green-400 text-base">
              <Save className="w-4 h-4 mr-1" /> {saved ? '已儲存' : '保存紀錄'}
            </Button>
          )}
        </div>

        {/* 解析結果 */}
        {result && (
          <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-700/30 space-y-2">
            <p className="text-base font-semibold text-indigo-400">夢境解析結果</p>
            <div className="text-base text-gray-300">
              <span className="text-gray-500">五行加權：</span>
              {Object.entries(result.elementWeights).map(([el, w]) => w > 0 && (
                <Badge key={el} variant="outline" className="ml-1 text-base border-gray-600">{el}+{w}</Badge>
              ))}
            </div>
            <div className="text-base text-gray-300">
              <span className="text-gray-500">強勢尾數：</span>
              <span className="text-green-400 font-semibold">{result.luckyTails.join('、')}</span>
            </div>
            <div className="text-base text-gray-300">
              <span className="text-gray-500">忌用尾數：</span>
              <span className="text-red-400">{result.avoidTails.join('、')}</span>
            </div>
            <div className="text-base text-gray-300">
              <span className="text-gray-500">建議號碼：</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {result.suggestedNumbers.map(n => (
                  <span key={n} className="w-10 h-10 rounded-full bg-indigo-900/40 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-lg font-bold">{n}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
