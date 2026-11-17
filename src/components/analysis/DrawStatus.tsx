import { useEffect, useRef, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { getConfig } from '@/utils/lotteryConfig';
import { comparePublishedDraws, fetchLatestPublishedDraw, formatDrawCountdown, getRegularDrawSchedule, readPublishedDrawCache, rememberPublishedDraw, type PublishedDrawGame } from '@/utils/latestPublishedDraw';
import { useOnline } from '@/pwa/PwaControls';
import { formatBall } from './OverlayCharts';

export default function DrawStatus({ game }: { game: PublishedDrawGame }) {
  const config = getConfig(game);
  const online = useOnline();
  const [now, setNow] = useState(Date.now);
  const [draw, setDraw] = useState(() => readPublishedDrawCache(game));
  const lastDraw = useRef(draw);
  const [status, setStatus] = useState<'updating' | 'confirmed' | 'unavailable'>('updating');
  const { next, previousDate } = getRegularDrawSchedule(game, now);

  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    const timer = window.setInterval(updateClock, 15000);
    document.addEventListener('visibilitychange', updateClock);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', updateClock);
    };
  }, []);

  useEffect(() => {
    if (!online) return;
    let active = true;
    let request: AbortController | null = null;
    let lastAttempt = -Infinity;
    let nextRefresh = 0;

    async function refresh(onForeground = false) {
      if (document.hidden || request || Date.now() - lastAttempt < 60000
        || (!onForeground && Date.now() < nextRefresh)) return;
      lastAttempt = Date.now();
      const controller = new AbortController();
      request = controller;
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      setStatus('updating');
      try {
        const latest = await fetchLatestPublishedDraw(game, controller.signal);
        if (!active) return;
        if (!latest) throw new Error('No published draw available');
        if (lastDraw.current && comparePublishedDraws(latest, lastDraw.current) < 0) throw new Error('Older draw was returned');
        const current = rememberPublishedDraw(game, latest);
        lastDraw.current = current;
        setDraw(current);
        const confirmed = comparePublishedDraws(current, latest) === 0;
        setStatus(confirmed ? 'confirmed' : 'unavailable');
        nextRefresh = confirmed ? Date.now() + 5 * 60000 : 0;
      } catch {
        nextRefresh = 0;
        if (active) setStatus('unavailable');
      } finally {
        window.clearTimeout(timeout);
        request = null;
      }
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 60000);
    const onVisibility = () => void refresh(true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      request?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [game, online]);

  const cached = draw && (!online || status !== 'confirmed');
  const message = !online ? draw ? '離線中 · 顯示前次快取。' : '離線中，連線後可查看最新獎號。'
    : status === 'updating' ? draw ? '更新中 · 顯示前次快取。' : '更新中 · 正在讀取台彩獎號。'
    : status === 'unavailable' ? draw ? '暫未取得最新獎號 · 顯示前次快取。' : '暫未取得台彩獎號，稍後自動重試。'
    : draw && draw.date < previousDate ? '本次例行開獎獎號尚未取得。' : '';

  return (
    <section className="v33-overlay-draw" aria-label={config.name + '開獎快訊'}>
      <div>
        <p className="v33-overlay-draw-label">{cached ? '前次快取獎號' : '最近公布獎號'} <span>· {config.name}</span></p>
        {draw && <>
          <p className="v33-overlay-note">第 {draw.issue} 期 · <time dateTime={draw.date}>{draw.date}</time></p>
          <div className="v33-overlay-draw-balls">
            <ul aria-label="開獎主號">
              {draw.numbers.map(number => (
                <li key={number} className="v33-sphere v33-overlay-mini-ball"><span className="v33-ball-face">{formatBall(number)}</span></li>
              ))}
            </ul>
            {draw.special !== null && <div className="v33-overlay-draw-extra">
              <span>{config.specialMode === 'separate' ? '第二區' : '特別號'}</span>
              <span className="v33-sphere v33-ball-data v33-overlay-mini-ball"><span className="v33-ball-face">{formatBall(draw.special)}</span></span>
            </div>}
          </div>
        </>}
        <p className="v33-overlay-note" role="status">{message}</p>
      </div>
      <div className="v33-overlay-draw-countdown">
        <p className="v33-overlay-draw-label"><Clock3 size={16} aria-hidden="true" /> 距離開獎還有</p>
        <strong>{formatDrawCountdown(next - now)}</strong>
        <a href="https://www.taiwanlottery.com/run_lottery/schedule/" target="_blank" rel="noreferrer">台灣時間 20:30 · 例行時程</a>
      </div>
    </section>
  );
}
