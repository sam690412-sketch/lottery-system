import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Activity, ArrowRight, ChartNoAxesCombined, Check, ChevronDown, ChevronRight, CircleHelp, Heart,
  ListChecks, Radar, Shuffle, Sparkles, Zap,
} from 'lucide-react';
import { getConfig, PLAY_TYPE_CONFIG } from '@/utils/lotteryConfig';
import type { CombinePlayType, LotteryType } from '@/utils/lotteryConfig';
import { analysisLink, drawQuickPick, quickPickKey, saveQuickPick } from '@/utils/quickPick';
import type { QuickPick, QuickPickConditions } from '@/utils/quickPick';
import { checkBeforeGenerate, hasPermission } from '@/utils/permissions';
import { trackFirst } from '@/utils/behaviorTracker';
import { trackFunnel } from '@/utils/funnelAnalytics';

const GAMES: { id: LotteryType; glyph: string; metal: 'gold' | 'silver'; detail: string }[] = [
  { id: 'power', glyph: '38', metal: 'gold', detail: '6 個主號＋第二區' },
  { id: 'lotto649', glyph: '49', metal: 'silver', detail: '6 個主號' },
  { id: 'daily539', glyph: '39', metal: 'gold', detail: '5 個主號' },
  { id: 'star4', glyph: '4', metal: 'silver', detail: '4 個數字' },
  { id: 'star3', glyph: '3', metal: 'silver', detail: '3 個數字' },
  { id: 'lotto49c', glyph: '49', metal: 'silver', detail: '任二、任三、任四' },
  { id: 'daily39c', glyph: '39', metal: 'gold', detail: '任二、任三、任四' },
];

interface HomeDraft {
  game: LotteryType;
  play: CombinePlayType;
  pick: QuickPick | null;
  conditions?: QuickPickConditions;
  saved?: 'saved' | 'duplicate' | 'failed';
  generationError?: string;
}

const DEFAULT_DRAFT: HomeDraft = { game: 'power', play: 'pair', pick: null };
const BALL_REVEAL_STEP_MS = 85;

const TOOLS = [
  { to: '/analysis-center', title: '歷史統計', detail: '熱號、冷號與開出分布', icon: ChartNoAxesCombined },
  { to: '/trend', title: '走勢分析', detail: '瀏覽各期號碼變化', icon: Activity },
  { to: '/live', title: '開獎資訊', detail: '查閱開獎紀錄', icon: Radar },
  { to: '/prize-check', title: '對獎工具', detail: '輸入號碼比對開獎紀錄', icon: ListChecks },
];

export default function V33HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawSequence, setDrawSequence] = useState(0);
  const draft = (location.state?.quickPick as HomeDraft | undefined) ?? DEFAULT_DRAFT;
  const { game, play, pick, saved } = draft;
  const config = getConfig(game);
  const canSave = hasPermission('canSaveNumbers');
  const gameHref = config.category === 'combine' ? '/combine/' + game
    : config.category === 'digit' ? '/analysis/' + game : '/builder?game=' + game;

  useEffect(() => {
    trackFunnel('visitors');
    trackFirst('first_login');
  }, []);

  useEffect(() => {
    if (location.hash !== '#quick-pick') return;
    const quickPick = document.getElementById('quick-pick');
    quickPick?.focus({ preventScroll: true });
    quickPick?.scrollIntoView({ block: 'start' });
  }, [location.hash]);

  function update(next: Partial<HomeDraft>) {
    navigate('/', { replace: true, state: { quickPick: { ...draft, ...next } }, preventScrollReset: true });
  }

  function selectGame(nextGame: LotteryType) {
    if (nextGame !== game) update({ game: nextGame, pick: null, saved: undefined, conditions: undefined, generationError: undefined });
  }

  function generatePick() {
    const allowance = checkBeforeGenerate();
    if (!allowance.allowed) {
      update({ generationError: allowance.message });
      return;
    }
    let next = drawQuickPick(game, play, draft.conditions);
    if (pick && quickPickKey(next) === quickPickKey(pick)) next = drawQuickPick(game, play, draft.conditions);
    setDrawSequence(sequence => sequence + 1);
    update({ pick: next, saved: undefined, generationError: undefined });
  }

  return (
    <div className="v33-home">
      <section className="v33-hero v33-panel" aria-labelledby="home-title">
        <div className="v33-hero-copy">
          <div className="v33-kicker"><span /> 台灣彩券選號工具</div>
          <h1 id="home-title">今天，<em>選哪組？</em></h1>
          <p>一鍵產生號碼，也能用歷史統計打造你的組合。</p>
          <div className="v33-hero-actions">
            <a className="v33-btn primary" href="#quick-pick"><Zap size={17} aria-hidden="true" /> 開始快速選號</a>
            <Link className="v33-btn subtle" to="/builder">打造號碼 <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
        <div className="v33-hero-art" aria-hidden="true">
          <div className="v33-orbit v33-orbit-one" />
          <div className="v33-orbit v33-orbit-two" />
          <span className="v33-art-ball v33-sphere v33-ball-silver ball-c"><span className="v33-ball-face">17</span></span>
          <span className="v33-art-ball v33-sphere ball-a"><span className="v33-ball-face">39</span></span>
          <span className="v33-art-ball v33-sphere v33-ball-silver ball-b"><span className="v33-ball-face">08</span></span>
        </div>
      </section>

      <div className="v33-home-grid">
        <section id="quick-pick" tabIndex={-1} className="v33-quick v33-panel" aria-labelledby="quick-title">
          <div className="v33-quick-heading">
            <div className="v33-quick-icon"><Shuffle size={21} aria-hidden="true" /></div>
            <h2 id="quick-title">快速選號</h2>
            <div className="v33-game-select">
              <select aria-label="快速選號彩種" value={game} onChange={event => selectGame(event.target.value as LotteryType)}>
                {GAMES.map(({ id }) => <option key={id} value={id}>{getConfig(id).name}</option>)}
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </div>
          </div>
          {config.category === 'combine' && (
            <div className="v33-option-row" aria-label="樂合彩玩法">
              {(Object.keys(PLAY_TYPE_CONFIG) as CombinePlayType[]).map(key => (
                <button type="button" className="v33-btn subtle" key={key} aria-pressed={play === key}
                  onClick={() => update({ play: key, pick: null, saved: undefined })}>{PLAY_TYPE_CONFIG[key].label}</button>
              ))}
            </div>
          )}
          {draft.conditions && (
            <div className="v33-pick-conditions">
              <p>已帶入 {draft.conditions.preferred.length} 個優先號碼、排除 {draft.conditions.excluded.length} 個主號。</p>
              <button type="button" className="v33-btn subtle" onClick={() => update({ conditions: undefined, pick: null, saved: undefined, generationError: undefined })}>清除條件</button>
            </div>
          )}
          <div className="v33-pick-area" aria-live="polite">
            {pick ? (
              <>
                <div key={drawSequence} className={'v33-result-balls' + (drawSequence ? ' v33-draw-reveal' : '')} aria-label="選號結果">
                  {pick.numbers.map((number, index) => (
                    <span className="v33-pick-well" key={index}>
                      <span className="v33-number-ball v33-sphere" style={{ animationDelay: `${index * BALL_REVEAL_STEP_MS}ms` }}>
                        <span className="v33-ball-face">{config.category === 'digit' ? number : String(number).padStart(2, '0')}</span>
                      </span>
                    </span>
                  ))}
                  {pick.secondZone !== undefined && (
                    <span className="v33-pick-well second-zone">
                      <span className="v33-number-ball v33-sphere v33-ball-data" style={{ animationDelay: `${pick.numbers.length * BALL_REVEAL_STEP_MS}ms` }}>
                        <span className="v33-ball-face" aria-label={'第二區 ' + pick.secondZone}>{String(pick.secondZone).padStart(2, '0')}</span>
                      </span>
                    </span>
                  )}
                </div>
                {pick.secondZone !== undefined && <small>藍色球為第二區</small>}
              </>
            ) : (
              <div className="v33-pick-placeholder">
                <div className="v33-empty-balls" aria-hidden="true">
                  {Array.from({ length: config.category === 'combine' ? PLAY_TYPE_CONFIG[play].k : config.mainCount }, (_, i) => <span className="v33-pick-well" key={i} />)}
                </div>
                <span>按下方按鈕開始選號</span>
              </div>
            )}
          </div>
          <button type="button" className="v33-btn primary v33-generate" onClick={generatePick}>
            <Shuffle size={17} aria-hidden="true" />{pick ? '重新選號' : '產生一組'}
          </button>
          {draft.generationError && <p className="v33-pick-error" role="status">{draft.generationError}</p>}
          {pick && (
            <div className="v33-pick-actions">
              {canSave ? (
                <button type="button" className="v33-btn subtle"
                  disabled={saved === 'saved' || saved === 'duplicate'}
                  onClick={() => update({ saved: saveQuickPick(game, pick) })}>
                  <Heart size={17} aria-hidden="true" />{saved === 'saved' ? '已收藏' : saved === 'duplicate' ? '已在收藏' : '收藏這組'}
                </button>
              ) : (
                <button type="button" className="v33-btn subtle"
                  onClick={() => window.dispatchEvent(new CustomEvent('v12-navigate', { detail: 'member' }))}>
                  <Heart size={17} aria-hidden="true" /> 登入後收藏
                </button>
              )}
              <Link className="v33-btn subtle" to={analysisLink(game, pick.numbers)}>
                <Activity size={17} aria-hidden="true" />{config.category === 'lotto6' ? '分析這組' : '查看彩種分析'}
              </Link>
              {(saved === 'saved' || saved === 'duplicate') && <Link className="v33-game-more" to={'/my-numbers?game=' + game}>查看我的號碼 <ArrowRight size={15} aria-hidden="true" /></Link>}
              {saved === 'failed' && <p role="status">本機儲存未完成，請重試。</p>}
            </div>
          )}
          <Link className="v33-game-more" to={gameHref}>
            {config.category === 'lotto6' ? '用統計與條件打造號碼' : '進入' + config.name}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
        <section className="v33-games" aria-labelledby="games-title">
          <div className="v33-section-heading">
            <h2 id="games-title">選擇彩種</h2>
            <span>共七種彩券</span>
          </div>
          <div className="v33-game-grid">
            {GAMES.map(item => (
              <button key={item.id} type="button" aria-pressed={game === item.id}
                className="v33-game v33-panel"
                onClick={() => {
                  selectGame(item.id);
                  if (window.matchMedia('(max-width: 740px)').matches) {
                    document.getElementById('quick-pick')?.scrollIntoView({ block: 'nearest' });
                  }
                }}>
                <span className={'v33-game-glyph v33-sphere v33-ball-' + item.metal} aria-hidden="true">
                  <span className="v33-ball-face">{item.glyph}</span>
                </span>
                <span className="v33-game-copy">
                  <strong>{getConfig(item.id).name}</strong>
                  <small>{item.detail}</small>
                </span>
                {game === item.id ? <Check size={16} className="v33-game-selected" aria-hidden="true" /> : <ChevronRight size={16} className="v33-game-arrow" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </section>

      </div>

      <section aria-labelledby="tools-title">
        <div className="v33-section-heading"><h2 id="tools-title">分析與開獎工具</h2></div>
        <div className="v33-tools">
          {TOOLS.map(({ to, title, detail, icon: Icon }) => (
            <Link key={to} to={to} className="v33-panel">
              <Icon size={20} aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
      <div className="v33-more-links">
        <Link to="/guided"><Sparkles size={17} aria-hidden="true" /> 進階選號與自訂方法</Link>
        <Link to="/verify"><CircleHelp size={17} aria-hidden="true" /> 資料來源與驗證</Link>
      </div>
    </div>
  );
}
