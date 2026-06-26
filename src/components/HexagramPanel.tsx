// ============================================================
// 卦象分析面板
// ============================================================
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HexagramSet } from '@/types';
import { BookOpen, Flame, Droplets, TreePine, Mountain, Wind } from 'lucide-react';

interface Props {
  hexagrams: HexagramSet | null;
}

const elementIcons: Record<string, React.ReactNode> = {
  '金': <Mountain className="w-4 h-4 text-yellow-400" />,
  '木': <TreePine className="w-4 h-4 text-green-400" />,
  '水': <Droplets className="w-4 h-4 text-blue-400" />,
  '火': <Flame className="w-4 h-4 text-red-400" />,
  '土': <Wind className="w-4 h-4 text-amber-600" />,
};

export default function HexagramPanel({ hexagrams }: Props) {
  if (!hexagrams) return null;

  const { timeHex, plumHex, sixYao, fiveElements, userHex } = hexagrams;

  return (
    <div className="space-y-4">
      <Card className="border border-amber-900/30 bg-gray-900/80 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-400 text-lg">
            <BookOpen className="w-5 h-5" />
            今日卦象分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 時間卦 */}
            <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-amber-500">時間起卦</span>
              </div>
              <p className="text-sm text-gray-200 font-medium">{timeHex.name}</p>
              <p className="text-xs text-gray-400 mt-1">{timeHex.mainHex}</p>
              <p className="text-xs text-gray-400">互卦：{timeHex.huHex} | 變卦：{timeHex.bianHex}</p>
              <p className="text-xs text-amber-300/80 mt-1">{timeHex.advice}</p>
            </div>

            {/* 梅花易數 */}
            <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-amber-500">梅花易數</span>
              </div>
              <p className="text-sm text-gray-200 font-medium">{plumHex.name}</p>
              <p className="text-xs text-gray-400 mt-1">{plumHex.mainHex}</p>
              <p className="text-xs text-amber-300/80 mt-1">{plumHex.advice}</p>
            </div>

            {/* 六爻 */}
            <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-amber-500">六爻簡化</span>
              </div>
              <div className="flex gap-1 mb-2">
                {sixYao.yaoList.map((yao, i) => (
                  <div key={i} className={`w-6 h-8 flex items-center justify-center rounded text-xs font-bold ${
                    yao === 1 ? 'bg-amber-700/40 text-amber-300' : 'bg-gray-700/40 text-gray-400'
                  }`}>
                    {yao === 1 ? '━━' : '━┅'}
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-300/80">{sixYao.advice}</p>
              <div className="flex gap-3 mt-1">
                <span className="text-xs text-blue-400">傾向：{sixYao.tendency}</span>
                <span className="text-xs text-purple-400">奇偶：{sixYao.oddEven}</span>
              </div>
            </div>

            {/* 五行數字法 */}
            <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-amber-500">五行數字法</span>
                {elementIcons[fiveElements.dominant]}
              </div>
              <p className="text-sm text-gray-200">今日主五行：<span className={`font-bold ${
                fiveElements.dominant === '金' ? 'text-yellow-400' :
                fiveElements.dominant === '木' ? 'text-green-400' :
                fiveElements.dominant === '水' ? 'text-blue-400' :
                fiveElements.dominant === '火' ? 'text-red-400' : 'text-amber-600'
              }`}>{fiveElements.dominant}</span></p>
              <p className="text-xs text-gray-400 mt-1">
                強勢尾數：
                {fiveElements.luckyTails.map(t => (
                  <span key={t} className="inline-block px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-300 mx-0.5">{t}</span>
                ))}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                忌用尾數：
                {fiveElements.avoidTails.map(t => (
                  <span key={t} className="inline-block px-1.5 py-0.5 rounded bg-red-900/20 text-red-400 mx-0.5">{t}</span>
                ))}
              </p>
            </div>

            {/* 養號卦 */}
            <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50 md:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-amber-500">養號卦</span>
              </div>
              <p className="text-xs text-amber-300/80">{userHex.advice}</p>
              <div className="flex gap-4 mt-2">
                <div>
                  <span className="text-xs text-green-400">保留：</span>
                  {userHex.keep.map(n => (
                    <span key={n} className="inline-block px-1.5 py-0.5 rounded bg-green-900/30 text-green-300 mx-0.5 text-xs">{n}</span>
                  ))}
                </div>
                <div>
                  <span className="text-xs text-orange-400">替換：</span>
                  {userHex.replace.map(n => (
                    <span key={n} className="inline-block px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-300 mx-0.5 text-xs">{n}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
