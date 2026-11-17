import { useId } from 'react';
import type { OverlayNumber } from '@/utils/analysisOverlay';

export const formatBall = (number: number) => String(number).padStart(2, '0');

export function ResonanceBadge({ item }: { item: OverlayNumber }) {
  return item.matches.length >= 2 ? (
    <span className="v33-resonance-badge">
      <span aria-hidden="true">🔥 </span>{item.matches.length}重共振
    </span>
  ) : null;
}

export function Matrix({ items, select, active }: { items: OverlayNumber[]; select: (number: number) => void; active: number }) {
  const countMax = Math.max(1, ...items.map(item => item.count));
  const missingMax = Math.max(1, ...items.map(item => item.missing ?? 0));

  return (
    <div className="v33-overlay-matrix" role="group" aria-label="全號碼熱力盤">
      {items.map(item => {
        const count = item.count / countMax;
        const missing = (item.missing ?? 0) / missingMax;
        const isCold = missing > count;
        const glow = 0.12 + Math.max(count, missing) * 0.45;

        return (
          <button
            key={item.number}
            type="button"
            aria-pressed={item.number === active}
            className="v33-overlay-cell"
            data-tone={isCold ? 'cold' : 'hot'}
            data-resonance={item.matches.length >= 2 || undefined}
            data-excluded={item.excluded || undefined}
            onClick={() => select(item.number)}
            style={{ backgroundImage: `radial-gradient(ellipse at 50% 12%, rgba(${isCold ? '56,189,248' : '245,158,11'},${glow}),transparent 92%)` }}
          >
            <strong className="v33-overlay-ball">{formatBall(item.number)}</strong>
            <ResonanceBadge item={item} />
            <span className="v33-overlay-cell-stats">
              <span>{item.count}次</span><span aria-hidden="true">·</span>
              <span>{item.missing === null ? '漏—' : `漏${item.missing}期`}</span>
            </span>
            {item.excluded && <span className="v33-overlay-excluded">已排除</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Duel({ items, select, active }: { items: OverlayNumber[]; select: (number: number) => void; active: number }) {
  const maxCount = Math.max(1, ...items.map(item => item.count));
  const maxMissing = Math.max(1, ...items.map(item => item.missing ?? 0));

  return (
    <div className="v33-overlay-duel" role="group" aria-label="熱門與遺漏對照">
      <div className="v33-overlay-duel-head"><span>歷史開出次數</span><span>號碼</span><span>目前遺漏期數</span></div>
      {items.map(item => (
        <button
          key={item.number}
          type="button"
          aria-pressed={item.number === active}
          onClick={() => select(item.number)}
          data-resonance={item.matches.length >= 2 || undefined}
          data-excluded={item.excluded || undefined}
        >
          <span className="v33-duel-side v33-duel-hot">
            <b>{item.count} 次</b>
            <span className="v33-overlay-duel-track" aria-hidden="true"><i style={{ width: `${100 * item.count / maxCount}%` }} /></span>
          </span>
          <span className="v33-duel-label">
            <strong className="v33-overlay-ball">{formatBall(item.number)}</strong>
            <ResonanceBadge item={item} />
            {item.excluded && <span className="v33-overlay-excluded">已排除</span>}
          </span>
          <span className="v33-duel-side v33-duel-cold">
            <span className="v33-overlay-duel-track" aria-hidden="true"><i style={{ width: `${100 * (item.missing ?? 0) / maxMissing}%` }} /></span>
            <b>{item.missing === null ? '—' : `${item.missing} 期`}</b>
          </span>
        </button>
      ))}
    </div>
  );
}

interface Column { label: string; count: number }

export function Columns({ data, label, markExtremes = false }: { data: Column[]; label: string; markExtremes?: boolean }) {
  if (!data.length) return <p>此區間沒有資料。</p>;
  const max = Math.max(...data.map(entry => entry.count));
  const min = Math.min(...data.map(entry => entry.count));

  return (
    <ul className="v33-overlay-columns" aria-label={label} tabIndex={0} style={{ gridTemplateColumns: `repeat(${data.length},minmax(53px,1fr))` }}>
      {data.map(entry => {
        const peak = markExtremes && max > min && entry.count === max;
        const low = markExtremes && max > min && entry.count === min;

        return (
          <li key={entry.label} data-extreme={peak ? 'highest' : low ? 'lowest' : undefined}>
            <strong>{entry.count}</strong>
            <span className="v33-overlay-column-track" aria-hidden="true">
              <i style={{ height: `${max ? 100 * entry.count / max : 0}%` }} />
            </span>
            <span>{entry.label}</span>
            {peak && <span className="v33-overlay-column-extreme">最高</span>}
            {low && <span className="v33-overlay-column-extreme">最低</span>}
          </li>
        );
      })}
    </ul>
  );
}

const SUM_BASELINE = 91;
const SUM_GRID_LINES = [12, 32, 52, 72, SUM_BASELINE];

export function SumDistribution({ bins }: { bins: { low: number; high: number; count: number }[] }) {
  const fillId = useId();
  if (!bins.length) return <p>此區間沒有和值資料。</p>;
  const max = Math.max(1, ...bins.map(bin => bin.count));
  const points = bins.map((bin, index) => [
    (index + 0.5) * 100 / bins.length,
    SUM_BASELINE - bin.count / max * 79,
  ] as const);
  const line = points.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `0,${SUM_BASELINE} ${line} 100,${SUM_BASELINE}`;

  return (
    <figure className="v33-overlay-histogram">
      <div className="v33-overlay-histogram-plot" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
          <defs>
            <linearGradient id={fillId} x1="0%" x2="0%" y1="12%" y2="91%" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fbbf24" stopOpacity=".48" />
              <stop offset="1" stopColor="#f59e0b" stopOpacity=".04" />
            </linearGradient>
          </defs>
          <g className="v33-overlay-histogram-grid">
            {SUM_GRID_LINES.map(y => <line key={y} x1="0" x2="100" y1={y} y2={y} vectorEffect="non-scaling-stroke" />)}
          </g>
          <polygon points={area} fill={`url(#${fillId})`} />
          <polyline points={line} vectorEffect="non-scaling-stroke" />
        </svg>
        {points.map(([x, y], index) => (
          <span key={bins[index].low} className="v33-overlay-histogram-dot" style={{ left: `${x}%`, top: `${y}%` }} />
        ))}
      </div>
      <figcaption>主號和值的實測次數分佈 · 由左至右為低至高</figcaption>
      <ul aria-label="和值區間與出現期數">
        {bins.map(bin => (
          <li key={bin.low}>
            <span>{bin.low === bin.high ? bin.low : `${bin.low}–${bin.high}`}</span>
            <strong>{bin.count} 期</strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function Donut({ labels, rates, counts }: { labels: [string, string]; rates: [string, string]; counts: [number, number] }) {
  const total = counts[0] + counts[1];
  const first = total ? counts[0] * 100 / total : 0;
  const dominant = counts[0] >= counts[1] ? 0 : 1;
  const centerLabel = !total ? '無資料' : counts[0] === counts[1] ? '各半' : labels[dominant];

  return (
    <div className="v33-overlay-donut">
      <div className="v33-overlay-donut-ring" aria-hidden="true">
        <svg viewBox="0 0 100 100" focusable="false">
          <circle className="v33-overlay-donut-track" cx="50" cy="50" r="42" />
          {!!total && <>
            <circle className="v33-overlay-donut-cold" cx="50" cy="50" r="42" />
            <circle className="v33-overlay-donut-hot" cx="50" cy="50" r="42" pathLength="100"
              strokeDasharray={`${first} ${100 - first}`} transform="rotate(-90 50 50)" />
          </>}
        </svg>
        <div className="v33-overlay-donut-center" data-tone={total && dominant === 1 ? 'cold' : undefined}>
          <span>{centerLabel}</span>
          <strong>{total ? `${rates[dominant]}%` : '—'}</strong>
        </div>
      </div>
      <dl>{labels.map((label, index) => (
        <div key={label}>
          <dt><span>{label}</span><span>{counts[index]} 次</span></dt>
          <dd>{rates[index]}%</dd>
        </div>
      ))}</dl>
    </div>
  );
}
