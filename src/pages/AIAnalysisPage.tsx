// ============================================================
// V19.2.1 AI Analysis Center - Plain Language Version
// 8 sections with user-friendly labels + explanations
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import {
  Flame, Snowflake, Timer, Hash, Divide, ArrowUpDown, Link2,
  Sparkles, ChevronRight, TrendingUp, Activity, BrainCircuit, Info
} from 'lucide-react';
import {
  analyzeHotCold, analyzeOmission, analyzeTail, analyzeOddEvenTrend,
  analyzeSizeTrend, analyzeConsecutive, analyzeZoneDistribution,
  generateAIRecommend, getOddEvenStats
} from '@/utils/lotteryAnalytics';
import type { LotteryType } from '@/utils/lotteryAnalytics';
import { trackAIClick } from '@/utils/analytics';

interface SectionDef { id: string; label: string; sublabel: string; icon: typeof Flame; color: string; bg: string; border: string; description: string; }

const SECTIONS: SectionDef[] = [
  { id: 'hot',    label: '最近常出', sublabel: '熱門號碼', icon: Flame,        color: 'text-red-400',    bg: 'from-red-950/30 to-transparent',     border: 'border-red-800/30',    description: '統計一段時間內最常開出的號碼，幫助你了解哪些號碼目前較活躍。' },
  { id: 'cold',   label: '很久沒出', sublabel: '冷門號碼', icon: Snowflake,    color: 'text-blue-400',   bg: 'from-blue-950/30 to-transparent',    border: 'border-blue-800/30',   description: '找出長時間未開出的號碼，這些號碼可能即將反彈出現。' },
  { id: 'omit',   label: '多久沒開', sublabel: '遺漏追蹤', icon: Timer,        color: 'text-amber-400',  bg: 'from-amber-950/30 to-transparent',   border: 'border-amber-800/30',  description: '追蹤每個號碼距離上次開出已經過了多少期，越久未開越值得留意。' },
  { id: 'tail',   label: '尾數偏好', sublabel: '尾數分析', icon: Hash,         color: 'text-purple-400', bg: 'from-purple-950/30 to-transparent',  border: 'border-purple-800/30', description: '分析 0-9 每個尾數的開出頻率，看看哪些尾數組合最常見。' },
  { id: 'oddeven',label: '奇偶比例', sublabel: '奇偶分析', icon: Divide,       color: 'text-emerald-400',bg: 'from-emerald-950/30 to-transparent', border: 'border-emerald-800/30',description: '觀察開獎結果中奇數和偶數的比例變化，找出常見的奇偶搭配模式。' },
  { id: 'size',   label: '大小分布', sublabel: '大小分析', icon: ArrowUpDown,  color: 'text-cyan-400',   bg: 'from-cyan-950/30 to-transparent',    border: 'border-cyan-800/30',   description: '比較大號碼和小號碼的出現比例，了解大小號碼的分布趨勢。' },
  { id: 'consec', label: '連號趨勢', sublabel: '連號分析', icon: Link2,        color: 'text-orange-400', bg: 'from-orange-950/30 to-transparent',  border: 'border-orange-800/30', description: '檢查最近是否頻繁出現連續號碼（如 5,6,7），掌握連號的出現規律。' },
  { id: 'airec',  label: 'AI判斷',   sublabel: '綜合推薦', icon: Sparkles,     color: 'text-amber-400',  bg: 'from-amber-950/30 to-transparent',   border: 'border-amber-800/30',  description: '結合以上所有分析，AI 自動計算出一組綜合推薦號碼，附信心分數。' },
];

const LOTTERY_TABS: { key: LotteryType; label: string }[] = [
  { key: 'power', label: '威力彩' },
  { key: 'lotto649', label: '大樂透' },
  { key: 'daily539', label: '今彩539' },
];

export default function AIAnalysisPage() {
  const navigate = useNavigate();
  const [lottery, setLottery] = useState<LotteryType>('power');
  const [activeSection, setActiveSection] = useState('hot');

  useEffect(() => { trackAIClick(activeSection); }, [activeSection]);

  const hotCold = useMemo(() => analyzeHotCold(lottery, 10), [lottery]);
  const omissions = useMemo(() => analyzeOmission(lottery), [lottery]);
  const tails = useMemo(() => analyzeTail(lottery), [lottery]);
  const oddEvenTrend = useMemo(() => analyzeOddEvenTrend(lottery, 20), [lottery]);
  const sizeTrend = useMemo(() => analyzeSizeTrend(lottery, 20), [lottery]);
  const consecutive = useMemo(() => analyzeConsecutive(lottery), [lottery]);
  const zones = useMemo(() => analyzeZoneDistribution(lottery), [lottery]);
  const aiRec = useMemo(() => generateAIRecommend(lottery), [lottery]);
  const oddEvenStats = useMemo(() => getOddEvenStats(lottery), [lottery]);
  const section = SECTIONS.find(s => s.id === activeSection)!;

  const Nb = ({ n, c = 'bg-gray-800' }: { n: number; c?: string }) => (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${c} text-white`}>{n}</span>
  );

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-100 flex items-center gap-2"><Activity className="w-5 h-5 text-amber-400" />AI分析中心</h1>
          <p className="text-[10px] text-gray-500">用數據幫你選號</p>
        </div>
        <button onClick={() => { trackAIClick('live_draw_link'); navigate('/live'); }} className="text-[10px] bg-gray-800 text-gray-300 rounded-lg px-2 py-1.5 hover:bg-gray-700 transition flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />開獎中心
        </button>
      </div>

      {/* Lottery Tabs */}
      <div className="flex gap-2">
        {LOTTERY_TABS.map(t => (
          <button key={t.key} onClick={() => setLottery(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${lottery === t.key ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}>{t.label}</button>
        ))}
      </div>

      {/* Section Nav - 4x2 grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {SECTIONS.map(sec => {
          const Icon = sec.icon; const isActive = activeSection === sec.id;
          return (
            <button key={sec.id} onClick={() => setActiveSection(sec.id)}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all ${isActive ? `${sec.border} bg-gradient-to-b ${sec.bg} ${sec.color}` : 'border-gray-800/30 text-gray-500 hover:text-gray-300'}`}>
              <Icon className="w-4 h-4" />
              <span className="text-[10px] leading-tight text-center font-bold">{sec.label}</span>
              <span className="text-[8px] opacity-60">{sec.sublabel}</span>
            </button>
          );
        })}
      </div>

      {/* Description Card */}
      <div className={`bg-gradient-to-r ${section.bg} border ${section.border} rounded-xl p-3 flex items-start gap-2`}>
        <Info className={`w-4 h-4 ${section.color} shrink-0 mt-0.5`} />
        <p className="text-[11px] text-gray-400 leading-relaxed">{section.description}</p>
      </div>

      {/* Content */}
      <div className="animate-in fade-in duration-200">
        {activeSection === 'hot' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-1.5 mb-2"><Flame className="w-4 h-4" />最常開出的號碼 Top 10</h3>
              <p className="text-[10px] text-gray-500 mb-2">這些號碼在最近開獎中出現次數最多</p>
              <div className="flex flex-wrap gap-1.5">
                {hotCold.hotNumbers.map(h => (
                  <div key={h.number} className="flex items-center gap-1 bg-red-950/20 border border-red-800/30 rounded-lg px-2 py-1">
                    <Nb n={h.number} c="bg-gradient-to-br from-red-500 to-red-600" />
                    <div className="text-[10px]"><div className="text-gray-300 font-bold">{h.count}次</div><div className="text-gray-500">{h.percentage}%</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-400 mb-2">較少出現的號碼</h3>
              <div className="flex flex-wrap gap-1.5">
                {hotCold.coldNumbers.slice(0, 5).map(c => (
                  <div key={c.number} className="flex items-center gap-1 bg-gray-900/50 border border-gray-800/30 rounded-lg px-2 py-1">
                    <Nb n={c.number} c="bg-gray-700" />
                    <div className="text-[10px]"><div className="text-gray-400">{c.count}次</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'cold' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-blue-400 flex items-center gap-1.5 mb-2"><Snowflake className="w-4 h-4" />很久沒開出的號碼</h3>
              <p className="text-[10px] text-gray-500 mb-2">這些號碼出現次數較少，可能快要反彈</p>
              <div className="flex flex-wrap gap-1.5">
                {hotCold.coldNumbers.map(c => (
                  <div key={c.number} className="flex items-center gap-1 bg-blue-950/20 border border-blue-800/30 rounded-lg px-2 py-1">
                    <Nb n={c.number} c="bg-gradient-to-br from-blue-500 to-blue-600" />
                    <div className="text-[10px]"><div className="text-gray-300 font-bold">{c.count}次</div><div className="text-gray-500">{c.percentage}%</div></div>
                  </div>
                ))}
              </div>
            </div>
            <Card className="border-blue-800/30 bg-blue-950/10">
              <CardContent className="p-3">
                <h4 className="text-xs font-bold text-blue-400 mb-1">冷門反彈策略</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed">冷門號碼在連續多期未開出後，出現的機會會逐漸提高。建議把冷門號和熱門號混合搭配選擇，不要全選冷門號。</p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'omit' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5"><Timer className="w-4 h-4" />每個號碼多久沒開了</h3>
            <p className="text-[10px] text-gray-500">數字越大表示越久沒開出，值得留意</p>
            <div className="space-y-1.5">
              {omissions.slice(0, 15).map(o => (
                <div key={o.number} className="flex items-center gap-2 text-[11px]">
                  <Nb n={o.number} c={o.currentGap > o.avgGap * 1.5 ? 'bg-amber-600' : 'bg-gray-700'} />
                  <div className="flex-1">
                    <div className="flex justify-between"><span className="text-gray-300">已經 <span className="text-amber-400 font-bold">{o.currentGap}</span> 期沒開</span><span className="text-gray-500">平均 {o.avgGap} 期開一次</span></div>
                    <div className="h-1.5 bg-gray-800 rounded-full mt-0.5 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all" style={{ width: `${Math.min(100, (o.currentGap / (o.avgGap * 2)) * 100)}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'tail' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-purple-400 flex items-center gap-1.5"><Hash className="w-4 h-4" />哪個尾數最常開出</h3>
            <p className="text-[10px] text-gray-500 mb-2">尾數就是號碼的個位數（如 12 的尾數是 2）</p>
            <div className="grid grid-cols-2 gap-2">
              {tails.map(t => (
                <div key={t.tail} className="bg-gray-900/50 border border-gray-800/30 rounded-lg p-2">
                  <div className="flex items-center justify-between mb-1"><span className="text-sm font-bold text-purple-400">尾數 {t.tail}</span><span className="text-[10px] text-gray-500">{t.count} 次</span></div>
                  <div className="flex flex-wrap gap-0.5">{t.numbers.map(n => <span key={n} className="text-[10px] bg-purple-950/30 text-purple-300 rounded px-1.5 py-0.5">{n}</span>)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'oddeven' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5"><Divide className="w-4 h-4" />奇數 vs 偶數</h3><span className="text-[10px] text-gray-500">近20期</span></div>
            <div className="flex items-center justify-around bg-emerald-950/10 border border-emerald-800/20 rounded-lg p-3">
              <div className="text-center"><div className="text-2xl font-bold text-emerald-400">{oddEvenStats.avgOdd}</div><div className="text-[10px] text-gray-500">平均奇數</div></div>
              <div className="text-gray-600">:</div>
              <div className="text-center"><div className="text-2xl font-bold text-teal-400">{oddEvenStats.avgEven}</div><div className="text-[10px] text-gray-500">平均偶數</div></div>
            </div>
            <div className="space-y-1">
              {oddEvenTrend.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]"><span className="text-gray-500 w-16">{t.period}</span>
                  <div className="flex-1 flex gap-0.5">{Array.from({ length: t.odd }).map((_, j) => <div key={j} className="w-3 h-3 rounded-sm bg-emerald-500" />)}{Array.from({ length: t.even }).map((_, j) => <div key={j} className="w-3 h-3 rounded-sm bg-teal-600" />)}</div>
                  <span className="text-gray-400 w-8">{t.ratio}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'size' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-cyan-400 flex items-center gap-1.5"><ArrowUpDown className="w-4 h-4" />大號碼 vs 小號碼</h3><span className="text-[10px] text-gray-500">近20期</span></div>
            <p className="text-[10px] text-gray-500">中間值以上為大號，以下為小號</p>
            <div className="space-y-1">
              {sizeTrend.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]"><span className="text-gray-500 w-16">{t.period}</span>
                  <div className="flex-1 flex gap-0.5">{Array.from({ length: t.big }).map((_, j) => <div key={j} className="w-3 h-3 rounded-sm bg-cyan-500" />)}{Array.from({ length: t.small }).map((_, j) => <div key={j} className="w-3 h-3 rounded-sm bg-sky-700" />)}</div>
                  <span className="text-gray-400 w-8">{t.ratio}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'consec' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-orange-400 flex items-center gap-1.5"><Link2 className="w-4 h-4" />連號出現情況</h3>
            <p className="text-[10px] text-gray-500">連號就是連續開出的數字（如 3,4,5）</p>
            <div className="flex items-center justify-between">
              <Card className="flex-1 border-orange-800/30 bg-orange-950/10 mr-2"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-orange-400">{consecutive.count}</div><div className="text-[10px] text-gray-500">總連號次數</div></CardContent></Card>
              <Card className="flex-1 border-orange-800/30 bg-orange-950/10"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-orange-400">{consecutive.maxLength}</div><div className="text-[10px] text-gray-500">最長連號</div></CardContent></Card>
            </div>
            {consecutive.consecutive.length > 0 && <div><h4 className="text-xs font-bold text-gray-300 mb-2">最近連號記錄</h4><div className="flex flex-wrap gap-1.5">{consecutive.consecutive.map((c, i) => <div key={i} className="flex items-center gap-0.5 bg-orange-950/20 border border-orange-800/20 rounded-lg px-2 py-1">{c.map((n, j) => <span key={j} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-600 text-white text-[9px] font-bold">{n}</span>)}</div>)}</div></div>}
            <Card className="border-gray-800/30 bg-gray-900/30"><CardContent className="p-3"><h4 className="text-xs font-bold text-gray-300 mb-1">號碼落在哪個區間</h4><div className="space-y-1.5">{zones.map(z => <div key={z.zone} className="flex items-center gap-2 text-[11px]"><span className="text-gray-400 w-12">{z.zone}</span><div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" style={{ width: `${z.percentage}%` }} /></div><span className="text-gray-500 w-8 text-right">{z.percentage}%</span></div>)}</div></CardContent></Card>
          </div>
        )}

        {activeSection === 'airec' && (
          <div className="space-y-4">
            <Card className="border-amber-600/40 bg-gradient-to-b from-amber-950/20 to-transparent">
              <CardContent className="p-4 text-center">
                <BrainCircuit className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-amber-400">AI 綜合判斷</h3>
                <p className="text-[10px] text-gray-500 mb-3">結合熱門、冷門、遺漏、奇偶等多項分析</p>
                <div className="flex items-center justify-center gap-2.5 mb-4">
                  {aiRec.numbers.map((n, i) => (
                    <span key={n} className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/20">{n}</span>
                  ))}
                </div>
                <div className="bg-gray-900/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-400">AI 信心度</span><span className="text-lg font-bold text-amber-400">{aiRec.confidence}%</span></div>
                  <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-600 via-amber-500 to-amber-400 rounded-full" style={{ width: `${aiRec.confidence}%` }} /></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-800/30"><CardContent className="p-3"><h4 className="text-xs font-bold text-gray-300 mb-2">為什麼推薦這組號碼</h4><ul className="space-y-1.5">{aiRec.reasons.map((r, i) => <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5"><span className="text-amber-500 font-bold">{i+1}.</span>{r}</li>)}</ul></CardContent></Card>
            <button onClick={() => { trackAIClick('goto_recommend'); navigate('/ai-recommend'); }} className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 rounded-xl text-sm font-bold text-white hover:from-amber-500 hover:to-amber-400 transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />查看完整 AI 推薦分析<ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <button onClick={() => { trackAIClick('goto_trend'); navigate('/trend'); }} className="w-full py-3 bg-gray-900 border border-gray-800/50 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-800 transition flex items-center justify-center gap-2">
        <TrendingUp className="w-4 h-4 text-cyan-400" />查看完整趨勢分析<ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
