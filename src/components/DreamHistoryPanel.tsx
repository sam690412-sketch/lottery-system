// ============================================================
// V10.5 夢境歷史面板
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { loadDreamRecords, saveDreamRecords } from '@/utils/dreamDB';
import type { DreamRecord } from '@/utils/dreamDB';
import { History, Trash2, Moon } from 'lucide-react';

export default function DreamHistoryPanel() {
  const [records, setRecords] = useState<DreamRecord[]>(loadDreamRecords);

  const handleClear = () => {
    saveDreamRecords([]);
    setRecords([]);
  };

  const emotionColors: Record<string, string> = {
    '吉': 'text-green-400 bg-green-900/20 border-green-700/40',
    '普通': 'text-gray-400 bg-gray-800/40 border-gray-700/40',
    '不安': 'text-orange-400 bg-orange-900/20 border-orange-700/40',
    '驚醒': 'text-red-400 bg-red-900/20 border-red-700/40',
  };

  return (
    <Card className="border border-indigo-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-indigo-400 text-xl">
          <History className="w-6 h-6" />
          夢境紀錄
          <Badge variant="outline" className="text-base border-gray-700 text-gray-400">{records.length} 筆</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.length === 0 ? (
          <div className="text-center text-gray-500 py-6 text-base">
            <Moon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            尚無夢境紀錄
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {records.slice(0, 20).map(r => (
                <div key={r.id} className="p-3 rounded bg-gray-800/40 border border-gray-700/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base text-gray-400">{r.date}</span>
                    <Badge variant="outline" className={`text-sm ${emotionColors[r.emotion] || ''}`}>{r.emotion}</Badge>
                  </div>
                  <p className="text-base text-gray-300 mb-1 line-clamp-2">{r.content}</p>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {r.symbols.map(s => (
                      <span key={s} className="text-sm px-2 py-0.5 rounded-full bg-indigo-900/20 text-indigo-400">{s}</span>
                    ))}
                  </div>
                  <div className="flex gap-3 text-sm text-gray-500">
                    <span>吉尾：{r.luckyTails.join('、')}</span>
                    {r.avoidTails.length > 0 && <span className="text-red-500">忌尾：{r.avoidTails.join('、')}</span>}
                  </div>
                  {r.note && <p className="text-sm text-gray-600 mt-1">{r.note}</p>}
                </div>
              ))}
            </div>
            {records.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleClear} className="border-red-700 text-red-400 text-base">
                <Trash2 className="w-4 h-4 mr-1" /> 清除所有夢境紀錄
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
