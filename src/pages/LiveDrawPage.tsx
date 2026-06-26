// ============================================================
// V19.2.1 Live Draw Center - Conversion Optimized
// Large countdown, prominent latest draw, CTA buttons
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Radio, Clock, Trophy, Calendar, ChevronLeft, PlusCircle,
  Sparkles, Zap, Hash, Star
} from 'lucide-react';
import { getLiveDrawInfo } from '@/utils/lotteryAnalytics';
import type { LotteryType } from '@/utils/lotteryAnalytics';
import { getLatestDraw, getRecentDraws } from '@/utils/officialDrawProvider';
import type { OfficialDraw } from '@/utils/officialDrawProvider';
import { trackLiveDrawView, trackAIClick } from '@/utils/analytics';
import { initializeDrawData } from '@/utils/drawSync';

const CFG: { key: LotteryType; label: string; icon: typeof Zap; color: string; desc: string }[] = [
  { key: 'power',    label: '威力彩',   icon: Zap,   color: 'text-red-400',    desc: '每週一、三、四開獎' },
  { key: 'lotto649', label: '大樂透',   icon: Star,  color: 'text-blue-400',   desc: '每週二、四開獎' },
  { key: 'daily539', label: '今彩539',  icon: Hash,  color: 'text-emerald-400', desc: '每週一至五開獎' },
];

function Countdown({ targetDate }: { targetDate: string }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const target = new Date(targetDate); target.setHours(21, 30, 0, 0);
    const update = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setTime({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setTime({ d: Math.floor(diff / 864e5), h: Math.floor((diff % 864e5) / 36e5), m: Math.floor((diff % 36e5) / 6e4), s: Math.floor((diff % 6e4) / 1e3) });
    };
    update(); const iv = setInterval(update, 1000); return () => clearInterval(iv);
  }, [targetDate]);
  const U = ({ v, l }: { v: number; l: string }) => (
    <div className="flex flex-col items-center"><div className="w-14 h-14 bg-gray-900 border-2 border-amber-700/40 rounded-xl flex items-center justify-center"><span className="text-2xl font-black text-amber-400 tabular-nums">{String(v).padStart(2, '0')}</span></div><span className="text-[10px] text-gray-500 mt-1">{l}</span></div>
  );
  return <div className="flex items-center justify-center gap-3"><U v={time.d} l="天" /><span className="text-2xl text-gray-700 font-black">:</span><U v={time.h} l="時" /><span className="text-2xl text-gray-700 font-black">:</span><U v={time.m} l="分" /><span className="text-2xl text-gray-700 font-black">:</span><U v={time.s} l="秒" /></div>;
}

export default function LiveDrawPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<LotteryType>('power');
  const [blink, setBlink] = useState(true);

  useEffect(() => { trackLiveDrawView(); }, []);
  useEffect(() => { const iv = setInterval(() => setBlink(v => !v), 1000); return () => clearInterval(iv); }, []);

  const info = useMemo(() => getLiveDrawInfo(tab), [tab]);
  const c = CFG.find(x => x.key === tab)!;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-800/50 transition"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
        <div>
          <h1 className="text-lg font-bold text-gray-100 flex items-center gap-2"><Radio className={`w-5 h-5 ${blink ? 'text-red-500' : 'text-red-800'}`} />即時開獎中心</h1>
          <p className="text-[10px] text-gray-500">最新開獎結果與下期倒數</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {CFG.map(x => { const Icon = x.icon; return (
          <button key={x.key} onClick={() => setTab(x.key)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${tab === x.key ? 'bg-gray-800 text-gray-100 border border-gray-700/50 shadow-lg' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}>
            <Icon className={`w-4 h-4 ${tab === x.key ? c.color : ''}`} />{x.label}<span className="text-[8px] opacity-50 font-normal">{x.desc}</span>
          </button>
        ); })}
      </div>

      {/* Countdown - Large */}
      <Card className="border-gray-800/50 bg-gradient-to-b from-gray-900 to-gray-950">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4"><Clock className={`w-4 h-4 ${c.color}`} /><h2 className="text-sm font-bold text-gray-200">{info.name} 下期開獎</h2><span className="text-[10px] text-gray-500 ml-auto">{info.nextDraw}</span></div>
          <Countdown targetDate={info.nextDraw} />
        </CardContent>
      </Card>

      {/* Latest Draw - Prominent */}
      {info.latestDraw && (
        <Card className="border-amber-700/50 bg-gradient-to-b from-amber-950/20 to-transparent shadow-lg shadow-amber-900/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4"><Trophy className="w-5 h-5 text-amber-400" /><h2 className="text-base font-bold text-amber-400">最新一期開獎結果</h2><span className="text-[10px] text-gray-500 ml-auto">第 {info.latestDraw.period} 期</span></div>
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              {info.latestDraw.zone1.map(n => (
                <span key={n} className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white text-base font-bold shadow-lg shadow-amber-500/20">{n}</span>
              ))}
              {info.latestDraw.zone2 > 0 && <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white text-base font-bold shadow-lg shadow-red-500/20 ml-2">{info.latestDraw.zone2}</span>}
            </div>
            <div className="flex items-center gap-2 mt-3 justify-center"><Calendar className="w-3 h-3 text-gray-500" /><span className="text-[10px] text-gray-500">{info.latestDraw.date}</span></div>

            {/* CTA Buttons */}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { trackAIClick('live_add_numbers'); }}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700/50 rounded-lg text-xs font-medium text-gray-300 transition flex items-center justify-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />加入我的號碼
              </button>
              <button onClick={() => { trackAIClick('live_ai_analysis'); navigate('/ai-analysis'); }}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold text-white transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />用這期做AI分析
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync & Analyze */}
      <button onClick={() => { trackAIClick('live_sync_data'); initializeDrawData(); window.location.reload(); }}
        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 rounded-xl text-sm font-bold text-white hover:from-cyan-500 hover:to-cyan-400 transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2">
        <Zap className="w-4 h-4" />立即分析（同步最新資料）
      </button>

      {/* Recent 10 */}
      <Card className="border-gray-800/50">
        <CardContent className="p-4">
          <h2 className="text-sm font-bold text-gray-200 mb-3">最近 10 期開獎記錄</h2>
          <div className="space-y-2">
            {info.recentDraws.map((draw, i) => (
              <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg ${i === 0 ? 'bg-amber-950/10 border border-amber-800/20' : 'bg-gray-900/30'}`}>
                <span className="text-[10px] text-gray-500 w-14 shrink-0">第{draw.period}期</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {draw.zone1.map(n => <span key={n} className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${i === 0 ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300'}`}>{n}</span>)}
                  {draw.zone2 > 0 && <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${i === 0 ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'} ml-1`}>{draw.zone2}</span>}
                </div>
                <span className="text-[9px] text-gray-600 ml-auto">{draw.date}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
