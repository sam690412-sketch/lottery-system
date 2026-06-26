// ============================================================
// 號碼評分表格 - 修復可點擊性 + 數據匹配
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { NumberScore } from '@/types';
import { BarChart3, ChevronDown, ChevronUp, Star } from 'lucide-react';

interface Props {
  scores: NumberScore[];
}

// 定義要顯示的層級欄位（與評分計算輸出的 key 一致）
const LAYER_KEYS = ['歷史熱度', '遺漏', '養號', '個人化', '卦象'];

export default function ScoreTable({ scores }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [expandedNum, setExpandedNum] = useState<number | null>(null);

  const displayScores = showAll ? scores : scores.slice(0, 16);

  const gradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      case 'B': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'C': return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
      case 'D': return 'bg-red-500/20 text-red-400 border-red-500/40';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const gradeBg = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-yellow-500/10';
      case 'B': return 'bg-blue-500/5';
      case 'C': return '';
      case 'D': return 'bg-red-500/5';
      default: return '';
    }
  };

  // 安全取值
  const getLayer = (layers: Record<string, number>, key: string) => {
    return layers[key] ?? 0;
  };

  return (
    <Card className="border border-amber-900/30 bg-gray-900/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-amber-400 text-xl">
          <BarChart3 className="w-6 h-6" />
          13層評分總表
          <span className="text-base font-normal text-gray-500 ml-2">
            A:{scores.filter(s => s.grade === 'A').length} |
            B:{scores.filter(s => s.grade === 'B').length} |
            C:{scores.filter(s => s.grade === 'C').length} |
            D:{scores.filter(s => s.grade === 'D').length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 表頭 */}
        <div className="grid grid-cols-12 gap-1 text-base text-gray-500 mb-2 px-2">
          <div className="col-span-1">號碼</div>
          <div className="col-span-1">級別</div>
          <div className="col-span-2">總分</div>
          <div className="col-span-1 text-center">熱度</div>
          <div className="col-span-1 text-center">遺漏</div>
          <div className="col-span-1 text-center">養號</div>
          <div className="col-span-1 text-center">個人化</div>
          <div className="col-span-1 text-center">卦象</div>
          <div className="col-span-3"></div>
        </div>

        <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
          {displayScores.map(s => (
            <div key={s.number}>
              <div
                className={`grid grid-cols-12 gap-1 items-center px-2 py-2 rounded cursor-pointer hover:bg-gray-800/50 transition ${gradeBg(s.grade)}`}
                onClick={() => setExpandedNum(expandedNum === s.number ? null : s.number)}
              >
                <div className="col-span-1 flex items-center gap-1">
                  <span className="text-base font-bold text-gray-200">{String(s.number).padStart(2, '0')}</span>
                  {s.isUserNumber && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                </div>
                <div className="col-span-1">
                  <Badge variant="outline" className={`text-base px-2 py-0.5 ${gradeColor(s.grade)}`}>
                    {s.grade}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Progress value={s.total} className="h-2 flex-1" />
                    <span className="text-base font-bold text-amber-400 w-10 text-right">{s.total}</span>
                  </div>
                </div>
                <div className="col-span-1 text-center text-base text-gray-400">{getLayer(s.layers, '歷史熱度')}</div>
                <div className="col-span-1 text-center text-base text-gray-400">{getLayer(s.layers, '遺漏')}</div>
                <div className="col-span-1 text-center text-base text-amber-400">{getLayer(s.layers, '養號')}</div>
                <div className="col-span-1 text-center text-base text-pink-400">{getLayer(s.layers, '個人化')}</div>
                <div className="col-span-1 text-center text-base text-purple-400">{getLayer(s.layers, '卦象')}</div>
                <div className="col-span-3 flex justify-end">
                  {expandedNum === s.number ?
                    <ChevronUp className="w-5 h-5 text-gray-500" /> :
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  }
                </div>
              </div>

              {/* 展開的層級詳細 */}
              {expandedNum === s.number && (
                <div className="mx-2 px-3 py-2 bg-gray-800/40 rounded-b border-t border-gray-700/30">
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {LAYER_KEYS.map(key => (
                      <div key={key} className="text-center">
                        <div className="text-base text-gray-500">{key}</div>
                        <div className={`text-base font-bold ${
                          getLayer(s.layers, key) >= 80 ? 'text-yellow-400' :
                          getLayer(s.layers, key) >= 60 ? 'text-blue-400' :
                          getLayer(s.layers, key) >= 40 ? 'text-gray-400' : 'text-red-400'
                        }`}>{getLayer(s.layers, key)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {!showAll && scores.length > 16 && (
          <Button
            variant="ghost"
            onClick={() => setShowAll(true)}
            className="w-full mt-2 text-amber-500 hover:text-amber-400 hover:bg-amber-900/20 text-base min-h-[48px]"
          >
            顯示全部 {scores.length} 個號碼
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
