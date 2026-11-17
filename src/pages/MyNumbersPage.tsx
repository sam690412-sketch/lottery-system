import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowRight, ChartNoAxesCombined, Heart, Lock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getConfig, LOTTERY_CONFIGS, type LotteryType } from '@/utils/lotteryConfig';
import { userGetJson, userSetJson, USER_KEYS } from '@/utils/userStorage';
import { hasPermission } from '@/utils/permissions';
import { analysisLink, type SavedNumbers } from '@/utils/quickPick';

const STORAGE_KEY = USER_KEYS.KEEP_SETS;
const GAMES = Object.keys(LOTTERY_CONFIGS) as LotteryType[];
const DISPLAY_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
});

function savedDate(id: string) {
  const timestamp = Number(String(id).split('-')[0]);
  const date = new Date(timestamp);
  return timestamp > 1e12 && Number.isFinite(date.getTime()) ? DISPLAY_DATE.format(date) : undefined;
}

function SavedCard({ set, confirmDelete, onRequestDelete, onCancelDelete, onDelete }: {
  set: SavedNumbers;
  confirmDelete: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const config = getConfig(set.type);
  const date = savedDate(set.id);
  const legacyZone = config.specialMode === 'separate'
    ? set.note?.match(/^由打造流程產生・第二區 ([1-8])$/)?.[1] : undefined;
  const secondZone = set.secondZone ?? (legacyZone ? Number(legacyZone) : undefined);
  const note = legacyZone ? '由打造流程產生' : set.note;

  return (
    <article className="v33-saved-card v33-panel">
      <header>
        <div className="v33-saved-context">
          <span>{config.name}</span>
          {date && <time dateTime={date}>{date}</time>}
        </div>
        <h2>{set.name}</h2>
      </header>
      <div className="v33-saved-values">
        <ul className="v33-saved-balls" aria-label={config.category === 'digit' ? '依位序排列的收藏數字' : '收藏主號'}>
          {set.numbers.map((number, index) => (
            <li key={index} className="v33-sphere v33-saved-ball">
              <span className="v33-ball-face">{config.category === 'digit' ? number : String(number).padStart(2, '0')}</span>
            </li>
          ))}
        </ul>
        {secondZone !== undefined && (
          <div className="v33-saved-zone">
            <span>第二區</span>
            <span className="v33-sphere v33-saved-ball v33-ball-data">
              <span className="v33-ball-face">{String(secondZone).padStart(2, '0')}</span>
            </span>
          </div>
        )}
      </div>
      {note && <p className="v33-saved-note">{note}</p>}
      <footer className="v33-saved-actions">
        <Link to={analysisLink(set.type, set.numbers, set.note, date)} className="v33-btn subtle">
          <ChartNoAxesCombined size={17} aria-hidden="true" />
          {config.category === 'lotto6' ? '分析這組' : '查看彩種分析'}
        </Link>
        <button type="button" className="v33-saved-remove" aria-label={'刪除' + set.name}
          aria-expanded={confirmDelete} onClick={confirmDelete ? onCancelDelete : onRequestDelete}>
          <Trash2 size={17} aria-hidden="true" />
        </button>
      </footer>
      {confirmDelete && (
        <div className="v33-saved-confirm">
          <p>確定刪除這組收藏？</p>
          <Button type="button" variant="outline" onClick={onCancelDelete}>取消</Button>
          <Button type="button" variant="destructive" onClick={onDelete}>確認刪除</Button>
        </div>
      )}
    </article>
  );
}

export default function MyNumbersPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('game');
  const lotteryType = GAMES.find(game => game === requested);
  const canSave = hasPermission('canSaveNumbers');
  const [keepSets, setKeepSets] = useState<SavedNumbers[]>(() => userGetJson(STORAGE_KEY, []));
  const [showAdd, setShowAdd] = useState(false);
  const [draftGame, setDraftGame] = useState<LotteryType>('power');
  const [newName, setNewName] = useState('');
  const [newNumbers, setNewNumbers] = useState('');
  const [newNote, setNewNote] = useState('');
  const [validation, setValidation] = useState('');
  const [feedback, setFeedback] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const draftConfig = getConfig(draftGame);
  const visibleSets = lotteryType ? keepSets.filter(set => set.type === lotteryType) : keepSets;

  function openAdd() {
    setDraftGame(lotteryType ?? 'power');
    setValidation('');
    setFeedback('');
    setShowAdd(true);
  }

  function addSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    const numbers = newNumbers.trim().split(/[,，\s]+/).filter(Boolean).map(Number);
    if (numbers.length < 2 || numbers.some(number => !Number.isInteger(number) || number < draftConfig.mainMin || number > draftConfig.mainMax)) {
      setValidation(`請輸入至少兩個 ${draftConfig.mainMin}–${draftConfig.mainMax} 的有效號碼。`);
      return;
    }
    const latest = userGetJson<SavedNumbers[]>(STORAGE_KEY, []);
    const newSet: SavedNumbers = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: newName.trim() || `養號組 ${latest.length + 1}`,
      numbers,
      type: draftGame,
      note: newNote.trim(),
    };
    userSetJson(STORAGE_KEY, [newSet, ...latest]);
    const stored = userGetJson<SavedNumbers[]>(STORAGE_KEY, []);
    if (!stored.some(set => set.id === newSet.id)) {
      setValidation('本機儲存未完成，請重試。');
      return;
    }
    setKeepSets(stored);
    setNewName('');
    setNewNumbers('');
    setNewNote('');
    setValidation('');
    setShowAdd(false);
    setParams({ game: draftGame });
    setFeedback('已新增收藏。');
  }

  function deleteSet(id: string) {
    if (!canSave) return;
    const latest = userGetJson<SavedNumbers[]>(STORAGE_KEY, []);
    userSetJson(STORAGE_KEY, latest.filter(set => set.id !== id));
    const stored = userGetJson<SavedNumbers[]>(STORAGE_KEY, []);
    if (stored.some(set => set.id === id)) {
      setFeedback('未能移除收藏，請重試。');
      return;
    }
    setKeepSets(stored);
    setPendingDelete(null);
    setFeedback('已刪除收藏。');
  }

  return (
    <div className="v33-workbench v33-saved-page">
      <header className="v33-saved-header">
        <div>
          <h1 className="v33-workbench-title"><Heart size={25} aria-hidden="true" />我的收藏</h1>
          <p>整理快速選號、打造結果與自訂養號。</p>
        </div>
        {canSave && !showAdd && (
          <button type="button" onClick={openAdd} className="v33-btn primary">
            <Plus size={18} aria-hidden="true" /> 新增養號組
          </button>
        )}
      </header>

      {!canSave ? (
        <section className="v33-saved-empty v33-panel">
          <div className="v33-saved-emblem"><Lock size={24} aria-hidden="true" /></div>
          <h2>登入後即可管理收藏</h2>
          <p>使用免費會員帳號保存與分析你的號碼。</p>
          <Link className="v33-btn primary" to="/member">前往會員中心 <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      ) : (
        <>
          <p className="v33-saved-local">收藏保存在目前的瀏覽器。</p>
          <div className="v33-saved-filters" role="group" aria-label="收藏彩種">
            <button type="button" aria-pressed={!lotteryType}
              onClick={() => { setParams({}); setPendingDelete(null); }}>全部 <span>{keepSets.length}</span></button>
            {GAMES.map(game => (
              <button key={game} type="button" aria-pressed={lotteryType === game}
                onClick={() => { setParams({ game }); setPendingDelete(null); }}>
                {getConfig(game).name} <span>{keepSets.filter(set => set.type === game).length}</span>
              </button>
            ))}
          </div>

          {showAdd && (
            <form className="v33-saved-form v33-panel" onSubmit={addSet}>
              <h2>新增養號組</h2>
              <div className="v33-saved-fields">
                <div><Label htmlFor="keep-game">彩種</Label>
                  <select id="keep-game" value={draftGame} onChange={event => {
                    setDraftGame(event.target.value as LotteryType);
                    setValidation('');
                  }}>
                    {GAMES.map(game => <option key={game} value={game}>{getConfig(game).name}</option>)}
                  </select>
                </div>
                <div><Label htmlFor="keep-name">名稱</Label>
                  <Input id="keep-name" value={newName} onChange={event => setNewName(event.target.value)} placeholder="例如：我的固定號" /></div>
                <div><Label htmlFor="keep-numbers">號碼（以逗號或空格分隔）</Label>
                  <Input id="keep-numbers" value={newNumbers} onChange={event => setNewNumbers(event.target.value)}
                    aria-invalid={validation.startsWith('請輸入') || undefined} aria-describedby={validation ? 'keep-validation' : undefined}
                    placeholder={`${draftConfig.mainMin}–${draftConfig.mainMax}`} /></div>
                <div><Label htmlFor="keep-note">備註</Label>
                  <Input id="keep-note" value={newNote} onChange={event => setNewNote(event.target.value)} placeholder="選填" /></div>
              </div>
              {validation && <p id="keep-validation" role="alert">{validation}</p>}
              <div className="v33-saved-actions">
                <button type="submit" className="v33-btn primary">儲存收藏</button>
                <button type="button" className="v33-btn subtle" onClick={() => setShowAdd(false)}>取消</button>
              </div>
            </form>
          )}

          {feedback && <p className="v33-saved-feedback" role="status">{feedback}</p>}
          {visibleSets.length === 0 ? (
            <section className="v33-saved-empty v33-panel">
              <div className="v33-saved-emblem"><Heart size={24} aria-hidden="true" /></div>
              <h2>{lotteryType ? `還沒有${getConfig(lotteryType).name}收藏` : '還沒有收藏號碼'}</h2>
              <p>從快速選號或打造號碼收藏結果，也可以手動新增一組。</p>
              <Link className="v33-btn subtle" to="/">前往快速選號 <ArrowRight size={16} aria-hidden="true" /></Link>
            </section>
          ) : (
            <div className="v33-saved-grid">
              {visibleSets.map(set => (
                <SavedCard key={set.id} set={set} confirmDelete={pendingDelete === set.id}
                  onRequestDelete={() => setPendingDelete(set.id)}
                  onCancelDelete={() => setPendingDelete(null)}
                  onDelete={() => deleteSet(set.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
