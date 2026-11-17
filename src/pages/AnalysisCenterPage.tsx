import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, ChartNoAxesCombined, Heart, Layers3, Shuffle } from 'lucide-react';
import { getConfig } from '@/utils/lotteryConfig';
import type { HistoricalDraw } from '@/data/historicalData';
import { getByRange, RANGE_OPTIONS, type AnalysisRange } from '@/utils/historyAnalysisEngine';
import { getDataSummary } from '@/utils/historyEngine';
import { getDataSourceKind } from '@/providers/historyProvider';
import { calcHotCold, calcOddEven, calcBigSmall, calcSumAnalysis, calcTailAnalysis } from '@/utils/statistics';
import { validateAllBuiltInHistory } from '@/utils/historyValidation';
import { CONDITIONS, getNumberObservations, makeSumBins, overlayObservations, parseOverlayNumbers, type ConditionId, type ConditionNumbers } from '@/utils/analysisOverlay';
import { analysisLink, drawQuickPick, saveQuickPick, type QuickPickConditions, type SavedNumbers } from '@/utils/quickPick';
import { checkBeforeGenerate, hasPermission } from '@/utils/permissions';
import { getCurrentUserId, userGetJson, USER_KEYS } from '@/utils/userStorage';
import { loadDailyDreamWeights } from '@/utils/dreamSchools';
import { loadDreamRecords } from '@/utils/dreamDB';
import { loadDailyMetaWeights } from '@/utils/metaphysicsSchools';
import { calcMetaphysicsWeights, loadBirthData, runAllDivinations } from '@/utils/divination';
import DataSourceBadge from '@/components/data/DataSourceBadge';
import { Columns, Donut, Duel, formatBall, Matrix, ResonanceBadge, SumDistribution } from '@/components/analysis/OverlayCharts';
import { AnalysisInstallPrompt } from '@/pwa/PwaControls';
import { CopyResonance } from '@/components/analysis/CopyResonance';
import DrawStatus from '@/components/analysis/DrawStatus';
import type { PublishedDrawGame } from '@/utils/latestPublishedDraw';
import '@/analysis-center.css';

const GAMES = ['power', 'lotto649', 'daily539'] as const;
const RANGE_LABEL: Record<AnalysisRange, string> = { 100: '近100期', 300: '近300期', 500: '近500期', 1000: '近1000期', all: '全部歷史' };
const BIG_THRESHOLD: Record<string, number> = { power: 19, lotto649: 25, daily539: 20 };
const VIEWS = [
  { id: 'matrix', label: '熱力號碼盤' },
  { id: 'duel', label: '雙向對決條' },
  { id: 'sum', label: '和值鐘形分佈圖' },
] as const;
type View = typeof VIEWS[number]['id'];
type ManualKey = 'dream' | 'personal' | 'anchors' | 'excluded';

const FIELDS: { id: ManualKey; label: string; placeholder: string }[] = [
  { id: 'dream', label: '夢境靈感號碼', placeholder: '例如 05、17、26' },
  { id: 'personal', label: '生日與命理號碼', placeholder: '例如 08、12、23' },
  { id: 'anchors', label: '手動膽碼', placeholder: '優先放入選號的主號' },
  { id: 'excluded', label: '手動殺號', placeholder: '從選號與收藏排除的主號' },
];

function getCalendarStats(draws: HistoricalDraw[]) {
  const month: Record<number, number> = {}, year: Record<number, number> = {}, weekday: Record<number, number> = {};
  for (const draw of draws) {
    const date = new Date(draw.date);
    if (!Number.isFinite(date.getTime())) continue;
    month[date.getMonth() + 1] = (month[date.getMonth() + 1] || 0) + 1;
    year[date.getFullYear()] = (year[date.getFullYear()] || 0) + 1;
    weekday[date.getDay()] = (weekday[date.getDay()] || 0) + 1;
  }
  const column = (items: Record<number, number>, format: (key: number) => string) =>
    Object.entries(items).map(([key, count]) => ({ label: format(Number(key)), count }));
  return {
    month: column(month, n => n + '月'),
    year: column(year, String),
    weekday: column(weekday, n => '週' + ['日', '一', '二', '三', '四', '五', '六'][n]),
  };
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="v33-panel v33-overlay-panel"><h2>{title}</h2>{children}</section>;
}

function topPositive(weights: Record<number, number> | null, limit = Infinity) {
  return Object.entries(weights ?? {}).filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1]).slice(0, limit).map(([number]) => Number(number));
}

function subscribeLocalOwner(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener('pageshow', onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener('pageshow', onChange);
  };
}

function loadLocalSettings(owner: string, canSave: boolean) {
  if (owner === 'guest' || !canSave) return { dream: [], personal: [], saved: [] };
  const savedDream = topPositive(loadDailyDreamWeights({ ownOnly: true }));
  const recentDream = savedDream.length ? undefined : loadDreamRecords()?.[0];
  const dream = savedDream.length ? savedDream : [...(recentDream?.suggestedNumbers ?? []), ...(recentDream?.dreamNumbers ?? [])];
  const birth = loadBirthData();
  const savedMeta = topPositive(loadDailyMetaWeights({ ownOnly: true }));
  const birthNumbers = birth && Number.isInteger(birth.day)
    ? [birth.month, birth.day, ...(!savedMeta.length ? topPositive(calcMetaphysicsWeights(runAllDivinations(birth)), 10) : [])]
    : [];
  const saved = userGetJson<SavedNumbers[]>(USER_KEYS.KEEP_SETS, []);
  return { dream, personal: [...savedMeta, ...birthNumbers], saved: Array.isArray(saved) ? saved : [] };
}

const EMPTY_SETTINGS = loadLocalSettings('guest', false);

export default function AnalysisCenterPage() {
  const owner = useSyncExternalStore(subscribeLocalOwner, getCurrentUserId, () => 'guest');
  return <AnalysisCenter key={owner} owner={owner} />;
}

function AnalysisCenter({ owner }: { owner: string }) {
  const navigate = useNavigate();
  const [game, setGame] = useState<PublishedDrawGame>('power');
  const [range, setRange] = useState<AnalysisRange>(100);
  const [view, setView] = useState<View>('matrix');
  const [conditionChoices, setConditionChoices] = useState<Partial<Record<ConditionId, boolean>>>({});
  const [draftText, setDraftText] = useState<Partial<Record<ManualKey, string>>>({});
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [selected, setSelected] = useState(1);
  const detailRef = useRef<HTMLElement>(null);
  const [feedback, setFeedback] = useState('');
  const [pickError, setPickError] = useState('');
  const canSave = hasPermission('canSaveNumbers');
  const config = getConfig(game);

  useEffect(() => {
    setSettings(loadLocalSettings(owner, canSave));
  }, [owner, canSave]);

  const withinGame = (numbers: number[]) => [...new Set(numbers)].filter(number =>
    Number.isInteger(number) && number >= config.mainMin && number <= config.mainMax);
  const importedDream = withinGame(settings.dream);
  const importedPersonal = withinGame(settings.personal);
  const availableSaved = new Set(withinGame(settings.saved
    .filter(set => set?.type === game && Array.isArray(set.numbers)).flatMap(set => set.numbers)));
  const isEnabledByDefault: Record<ConditionId, boolean> = {
    hot: true, missing: true, manual: false,
    dream: importedDream.length > 0, personal: importedPersonal.length > 0, saved: availableSaved.size > 0,
  };
  const enabled = new Set(CONDITIONS.filter(({ id }) => conditionChoices[id] ?? isEnabledByDefault[id]).map(({ id }) => id));
  const text: Record<ManualKey, string> = {
    dream: importedDream.map(formatBall).join('、'), personal: importedPersonal.map(formatBall).join('、'),
    anchors: '', excluded: '', ...draftText,
  };

  const results = useMemo(() => getByRange(game, range), [game, range]);
  const draws = useMemo<HistoricalDraw[]>(() => results.map(draw => ({
    period: String(draw.issue), mainNumbers: draw.zone1, specialNumber: draw.special ?? undefined, date: draw.date,
  })), [results]);
  const summary = useMemo(() => getDataSummary(game), [game]);
  const validations = useMemo(() => validateAllBuiltInHistory(), []);
  const validation = validations[game];
  const data = useMemo(() => {
    const observations = getNumberObservations(draws, game);
    return {
      observations,
      hot: draws.length ? calcHotCold(draws, 'hot', 10) : [],
      cold: draws.length ? calcHotCold(draws, 'cold', 10) : [],
      overdue: draws.length ? [...observations].sort((a, b) => (b.missing ?? 0) - (a.missing ?? 0) || a.number - b.number).slice(0, 10) : [],
      oddEven: calcOddEven(draws), bigSmall: calcBigSmall(draws, BIG_THRESHOLD[game] ?? 20),
      sum: draws.length ? calcSumAnalysis(draws) : null,
      histogram: makeSumBins(draws), tails: calcTailAnalysis(draws), calendar: getCalendarStats(draws),
    };
  }, [draws, game]);

  const manual = Object.fromEntries(FIELDS.map(field => [field.id, parseOverlayNumbers(text[field.id], game)])) as
    Record<ManualKey, ReturnType<typeof parseOverlayNumbers>>;
  const conditions: ConditionNumbers = {
    hot: new Set(data.hot.map(item => item.number)),
    missing: new Set(data.overdue.map(item => item.number)),
    dream: new Set(manual.dream.values),
    personal: new Set(manual.personal.values),
    saved: availableSaved,
    manual: new Set(manual.anchors.values),
  };
  const items = overlayObservations(data.observations, enabled, conditions, new Set(manual.excluded.values));
  const byNumber = new Map(items.map(item => [item.number, item]));
  const current = byNumber.get(selected) ?? items[0];
  const high = items.filter(item => item.matches.length >= 2 && !item.excluded)
    .sort((a, b) => b.matches.length - a.matches.length || a.number - b.number);
  const anchors = enabled.has('manual') ? manual.anchors.values : [];
  const excluded = enabled.has('manual') ? manual.excluded.values : [];
  const pickConditions: QuickPickConditions = {
    preferred: [...new Set([...anchors, ...high.map(item => item.number)])].slice(0, config.mainCount),
    excluded,
  };
  const manualWarning = anchors.some(number => excluded.includes(number)) ? '同一個號碼不能同時列為膽碼和殺號。'
    : anchors.length > config.mainCount ? `膽碼最多可填 ${config.mainCount} 個。`
    : items.length - excluded.length < config.mainCount ? '排除後的主號不足一組。' : '';
  const invalidEnabled = FIELDS.some(field => {
    const condition = field.id === 'anchors' || field.id === 'excluded' ? 'manual' : field.id;
    return enabled.has(condition) && manual[field.id].invalid.length > 0;
  });
  const canCarry = high.length > 0 && !manualWarning && !invalidEnabled;
  const canCollect = high.length >= 2 && canCarry;
  const sortedCandidates = high.map(item => item.number).sort((a, b) => a - b);
  const copyValue = `【選號漏斗｜${config.name}共振推薦】${sortedCandidates.map(formatBall).join(', ')}`;
  const homeDraft = { game, play: 'pair' as const, pick: null, conditions: pickConditions };

  useEffect(() => setPickError(''), [copyValue, canCarry]);

  function selectNumber(number: number) {
    setSelected(number);
    if (window.matchMedia('(max-width: 879px)').matches) {
      detailRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }

  function toggle(id: ConditionId) {
    setConditionChoices(previous => ({ ...previous, [id]: !enabled.has(id) }));
    setFeedback('');
  }

  function importLocalSettings() {
    const latest = loadLocalSettings(owner, canSave);
    setSettings(latest);
    setDraftText(previous => {
      const next = { ...previous };
      if (withinGame(latest.dream).length) delete next.dream;
      if (withinGame(latest.personal).length) delete next.personal;
      return next;
    });
    setFeedback(canSave ? '已重新讀取本機設定。' : '登入後可同步已儲存的個人設定。');
  }

  function pickNow() {
    if (!canCarry) return;
    const allowance = checkBeforeGenerate();
    if (!allowance.allowed) {
      setPickError(allowance.message ?? '目前無法選號，請稍後再試。');
      return;
    }
    const pick = drawQuickPick(game, homeDraft.play, pickConditions);
    navigate('/#quick-pick', { state: { quickPick: { ...homeDraft, pick } } });
  }

  function collect() {
    if (!canSave || !canCollect) return;
    const result = saveQuickPick(game, { numbers: sortedCandidates }, config.name + ' · 共振候選');
    setFeedback(result === 'failed' ? '保存未完成，請重試。'
      : result === 'duplicate' ? '這組候選號碼已在收藏中。' : `已收藏 ${sortedCandidates.length} 個候選主號。`);
  }

  return (
    <div className="v33-workbench v33-analysis-center v33-overlay-page">
      <header className="v33-analysis-header">
        <div><h1 className="v33-workbench-title"><ChartNoAxesCombined size={26} aria-hidden="true" />AI 分析中心</h1>
          <p>比較開出次數、遺漏期數與自訂條件。</p></div>
        <Link className="v33-btn subtle" to={analysisLink(game, [])}>分析我的號碼 <ArrowRight size={16} aria-hidden="true" /></Link>
      </header>
      <DataSourceBadge sourceKind={getDataSourceKind()} validation={validation?.summary.severity ?? 'yellow'}
        totalRecords={summary.count} dateRange={validation?.dateRange ?? { from: null, to: null }}
        latestDate={summary.latestDate} mode="analysis" compact updatedAt={summary.updatedAt} />
      <div className="v33-analysis-filters">
        <div role="group" aria-label="彩種">
          {GAMES.map(type => <button key={type} type="button" aria-pressed={game === type} onClick={() => { setGame(type); setFeedback(''); }}>{getConfig(type).name}</button>)}
        </div>
        <div role="group" aria-label="分析期數">
          {RANGE_OPTIONS.map(value => <button key={value} type="button" aria-pressed={range === value} onClick={() => { setRange(value); setFeedback(''); }}>{RANGE_LABEL[value]}</button>)}
        </div>
      </div>

      <DrawStatus key={game} game={game} />
      <AnalysisInstallPrompt />

      <Panel title="多條件重合共振控制台">
        <div className="v33-overlay-pills" role="group" aria-label="重合條件">
          {CONDITIONS.map(condition => <button key={condition.id} type="button" aria-pressed={enabled.has(condition.id)} onClick={() => toggle(condition.id)}>
            <span aria-hidden="true">{condition.icon}</span>{condition.label}<small>{conditions[condition.id].size}</small>
          </button>)}
        </div>
        <div className="v33-overlay-inputs">
          {FIELDS.map(field => <label key={field.id}>{field.label}
            <input value={text[field.id]} placeholder={field.placeholder} maxLength={256}
              aria-invalid={manual[field.id].invalid.length > 0 || undefined}
              onChange={event => { const value = event.target.value; setDraftText(previous => ({ ...previous, [field.id]: value })); setFeedback(''); }} />
            {manual[field.id].invalid.length > 0 && <small>請輸入 {config.mainMin}–{config.mainMax} 的整數，以空格或逗號分隔。</small>}
          </label>)}
        </div>
        <div className="v33-overlay-actions">
          <button type="button" className="v33-btn subtle" onClick={importLocalSettings}><Layers3 size={17} aria-hidden="true" />帶入本機設定</button>
          {canCarry ? <Link className="v33-btn primary" to="/" state={{ quickPick: homeDraft }}>帶入快速選號 <ArrowRight size={17} aria-hidden="true" /></Link>
            : <button type="button" className="v33-btn primary" disabled>帶入快速選號</button>}
          {canSave ? <button className="v33-btn subtle" type="button" disabled={!canCollect} onClick={collect}><Heart size={17} aria-hidden="true" />收藏候選號碼</button>
            : <Link className="v33-btn subtle" to="/member"><Heart size={17} aria-hidden="true" />登入後收藏</Link>}
          <CopyResonance key={copyValue} value={copyValue} disabled={!canCarry} />
        </div>
        {manualWarning && <p className="v33-overlay-warning" role="alert">{manualWarning}</p>}
        <p className="v33-overlay-note">歷史熱門與遺漏各取前 10 名。膽碼優先，殺號不帶入選號及收藏。重合數與遺漏期數僅反映條件與歷史記錄。</p>
        {enabled.has('saved') && availableSaved.size === 0 && <p>這個彩種沒有可帶入的本機收藏。</p>}
        {feedback && <p className="v33-overlay-feedback" role="status">{feedback}</p>}
      </Panel>

      <section className="v33-panel v33-overlay-panel">
        <div className="v33-overlay-view-head">
          <h2>號碼分佈</h2>
          <div className="v33-overlay-pills" role="group" aria-label="圖表視圖">
            {VIEWS.map(mode => <button key={mode.id} type="button" aria-pressed={view === mode.id} onClick={() => setView(mode.id)}>{mode.label}</button>)}
          </div>
        </div>
        <div className="v33-overlay-summary">
          <span><strong>{results.length}</strong> 期樣本</span>
          <span><strong>{high.length}</strong> 個高重合候選</span>
          <span><strong>{items.length}</strong> 個主號</span>
          <CopyResonance key={copyValue} value={copyValue} disabled={!canCarry} />
        </div>
        {view === 'sum' ? <SumDistribution bins={data.histogram} /> : (
          <div className="v33-overlay-chart-layout">
            <div>
              {view === 'matrix' ? <>
                <div className="v33-overlay-legend"><span>● 高頻強度</span><span>● 遺漏強度</span><span>◎ 兩項以上重合</span></div>
                <Matrix items={items} select={selectNumber} active={current.number} />
              </> : <Duel items={items} select={selectNumber} active={current.number} />}
            </div>
            <aside ref={detailRef} className="v33-overlay-detail" aria-label="號碼明細" aria-live="polite">
              <strong>號碼 {formatBall(current.number)}</strong>
              <ResonanceBadge item={current} />
              {current.excluded && <p className="v33-overlay-warning">已列為殺號</p>}
              <dl><div><dt>歷史開出</dt><dd>{current.count} 次</dd></div>
                <div><dt>目前遺漏</dt><dd>{current.missing === null ? '—' : `${current.missing} 期`}</dd></div></dl>
              <p>{current.matches.length ? current.matches.map(id => CONDITIONS.find(condition => condition.id === id)?.label).join('、')
                : '未符合已開啟的條件。'}</p>
            </aside>
          </div>
        )}
        {view !== 'sum' && <details className="v33-overlay-rank">
          <summary>查看原有冷熱門次數排行</summary>
          <div>{([['熱門號', data.hot], ['冷門號', data.cold]] as const).map(([label, ranking]) => (
            <section key={label}><h3>{label} · 前 10</h3><ol>{ranking.map(item => (
              <li key={item.number} data-resonance={((byNumber.get(item.number)?.matches.length ?? 0) >= 2) || undefined}>
                <button type="button" onClick={() => selectNumber(item.number)}>{formatBall(item.number)} <span>{item.count} 次</span></button>
                {byNumber.has(item.number) && <ResonanceBadge item={byNumber.get(item.number)!} />}
              </li>
            ))}</ol></section>
          ))}</div>
        </details>}
      </section>

      <div className="v33-overlay-two">
        <Panel title="奇偶比例"><Donut labels={['奇數', '偶數']} rates={[data.oddEven.oddRate, data.oddEven.evenRate]} counts={[data.oddEven.oddCount, data.oddEven.evenCount]} /></Panel>
        <Panel title="大小比例"><Donut labels={['大號', '小號']} rates={[data.bigSmall.bigRate, data.bigSmall.smallRate]} counts={[data.bigSmall.bigCount, data.bigSmall.smallCount]} />
          <p className="v33-overlay-note">大號門檻為 {data.bigSmall.threshold}。</p></Panel>
      </div>
      <Panel title="和值統計">
        <dl className="v33-overlay-sum-stats">{[['平均', data.sum?.avgSum], ['最小', data.sum?.minSum], ['最大', data.sum?.maxSum], ['常見區間', data.sum?.commonRange]].map(([label, value]) =>
          <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>
      </Panel>
      <Panel title="尾數分析"><Columns label="0 尾至 9 尾開出次數" markExtremes data={data.tails.map(item => ({ label: item.tail + '尾', count: item.count }))} /></Panel>
      <Panel title="月份分析"><Columns label="各月份期數" data={data.calendar.month} /></Panel>
      <div className="v33-overlay-two">
        <Panel title="星期分析"><Columns label="各星期開獎期數" data={data.calendar.weekday} /></Panel>
        <Panel title="年份分析"><Columns label="各年份期數" data={data.calendar.year} /></Panel>
      </div>
      <p className="v33-overlay-note">以上為歷史統計與娛樂分析。示意資料請以官方開獎為準。</p>
      {high.length > 0 && <aside className="v33-overlay-mobile-actions" aria-label="共振快捷列">
        <div className="v33-overlay-mobile-candidates">
          <span className="v33-overlay-draw-label">{high.length} 個共振候選</span>
          <ul aria-label="共振候選號碼" tabIndex={0}>
            {high.map(item => <li key={item.number} className="v33-sphere v33-overlay-mini-ball">
              <span className="v33-ball-face">{formatBall(item.number)}</span>
            </li>)}
          </ul>
        </div>
        <button type="button" className="v33-btn primary" onClick={pickNow} disabled={!canCarry}>
          <Shuffle size={17} aria-hidden="true" />一鍵選號
        </button>
        {pickError && <p className="v33-overlay-warning" role="alert">{pickError}</p>}
      </aside>}
    </div>
  );
}
