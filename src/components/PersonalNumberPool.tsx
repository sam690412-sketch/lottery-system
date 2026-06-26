// ============================================================
// 個人化號碼池
// ============================================================
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { NumberScore } from '@/types';
import type { PersonalPool } from '@/types/personal';
import { sourceTypeColor } from '@/utils/personalNumber';
import { Fish, Star } from 'lucide-react';

interface Props {
  pool: PersonalPool;
  scores: NumberScore[];
  userNumbers: number[];
}

export default function PersonalNumberPool({ pool, scores, userNumbers }: Props) {
  if (!pool.entries.length) return (
    <Card className="border border-gray-800 bg-gray-900/60">
      <CardContent className="py-8 text-center text-gray-500">
        尚未有個人化資料，請先在「個人資料來源」頁面新增資料
      </CardContent>
    </Card>
  );

  const gradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'B': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'C': return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
      default: return 'text-red-400 bg-red-500/10 border-red-500/30';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-amber-400">{pool.entries.length}</div>
          <div className="text-xs text-gray-500">候選號碼</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-blue-400">{pool.entries.filter((e: {number:number}) => (scores.find(s => s.number === e.number)?.total || 0) >= 60).length}</div>
          <div className="text-xs text-gray-500">B級以上</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-green-400">{pool.overlapsWithUser.length}</div>
          <div className="text-xs text-gray-500">與養號交集</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-purple-400">{pool.entries.filter((e: {totalWeight:number}) => e.totalWeight >= 5).length}</div>
          <div className="text-xs text-gray-500">高權重(5+)</div>
        </div>
      </div>

      <Card className="border border-gray-800 bg-gray-900/60">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-amber-400 text-lg"><Fish className="w-5 h-5" />個人化號碼池</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {pool.entries.map((entry: {number:number; totalWeight:number; sources:{sourceId:string; sourceName:string; sourceType:string; weight:number}[]}) => {
              const score = scores.find(s => s.number === entry.number);
              const isUserNum = userNumbers.includes(entry.number);
              return (
                <div key={entry.number} className={`flex items-center justify-between p-2 rounded border ${isUserNum ? 'bg-amber-900/20 border-amber-700/30' : 'bg-gray-800/40 border-gray-700/20'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${score ? gradeColor(score.grade) : ''}`}>
                      {String(entry.number).padStart(2, '0')}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        {isUserNum && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                        <span className="text-xs text-gray-400">權重:{entry.totalWeight}</span>
                        {score && <Badge variant="outline" className={`text-[10px] px-1 ${gradeColor(score.grade)}`}>{score.grade}</Badge>}
                      </div>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {entry.sources.map((s: {sourceId:string; sourceName:string; sourceType:string; weight:number}) => (
                          <span key={s.sourceId} className={`text-[10px] px-1.5 py-0.5 rounded ${sourceTypeColor(s.sourceType as any)}`}>
                            {s.sourceName}({s.weight})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {score?.total || '--'}分
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
