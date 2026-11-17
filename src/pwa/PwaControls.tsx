import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Check, Download, Ellipsis, PlusSquare, RefreshCw, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface InstallEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function subscribeOnline(change: () => void) {
  function onOnline() {
    document.querySelector('meta[name="lottery-offline-shell"]')?.remove();
    change();
  }
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', change);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', change);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine && !document.querySelector('meta[name="lottery-offline-shell"]'), () => true);
}

function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isAppleMobile() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function PwaControls() {
  const online = useOnline();
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(standalone);
  const [guide, setGuide] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [applying, setApplying] = useState(false);
  const [reload, setReload] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [availability, setAvailability] = useState<'pending' | 'ready' | 'error'>('pending');

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const onInstall = () => {
      setInstalled(true);
      setPrompt(null);
      setGuide(false);
    };
    const onDisplay = () => setInstalled(standalone());
    const media = window.matchMedia('(display-mode: standalone)');
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstall);
    media.addEventListener('change', onDisplay);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstall);
      media.removeEventListener('change', onDisplay);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) {
      setAvailability('error');
      return;
    }
    const sw = navigator.serviceWorker;
    let registration: ServiceWorkerRegistration | undefined;
    let active = true;
    const observed = new Set<ServiceWorker>();
    let hadController = !!sw.controller;

    function onControllerChange() {
      setOfflineReady(true);
      setWaiting(null);
      if (hadController) setReload(true);
      hadController = true;
    }
    function inspect(event?: Event) {
      if (registration?.waiting) setWaiting(registration.waiting);
      if (sw.controller) setOfflineReady(true);
      const worker = event?.target as ServiceWorker | undefined;
      if (worker?.state === 'redundant' && !sw.controller && !registration?.installing) {
        setAvailability('error');
      }
    }
    function onUpdate() {
      const worker = registration?.installing;
      if (!worker || observed.has(worker)) return;
      observed.add(worker);
      worker.addEventListener('statechange', inspect);
    }
    function check() {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void registration?.update().catch(() => {});
      }
    }

    sw.addEventListener('controllerchange', onControllerChange);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', check);
    const interval = window.setInterval(check, 30 * 60 * 1000);
    void sw.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(result => {
      if (!active) return;
      registration = result;
      setAvailability('ready');
      registration.addEventListener('updatefound', onUpdate);
      onUpdate();
      inspect();
      check();
    }).catch(() => { if (active) setAvailability('error'); });
    return () => {
      active = false;
      window.clearInterval(interval);
      sw.removeEventListener('controllerchange', onControllerChange);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', check);
      registration?.removeEventListener('updatefound', onUpdate);
      observed.forEach(worker => worker.removeEventListener('statechange', inspect));
    };
  }, []);

  useEffect(() => {
    if (reload && applying) window.location.reload();
  }, [reload, applying]);

  useEffect(() => {
    if (!applying || reload) return;
    const timeout = window.setTimeout(() => {
      setApplying(false);
      setUpdateError(true);
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [applying, reload]);

  async function install() {
    if (!prompt || !online) return setGuide(true);
    setPrompt(null);
    try {
      const choice = await prompt.prompt();
      if (choice.outcome === 'accepted') setGuide(false);
    } catch {
      setGuide(true);
    }
  }

  return (
    <>
      <InstallGuide open={guide} onOpenChange={setGuide} installed={installed}
        note={availability === 'error' ? '這個瀏覽器或網址目前無法啟用離線功能。'
          : offlineReady ? '離線資源已準備完成。' : '首次使用時，請保持連線以準備離線資源。'}>
        <button type="button" className="v33-install-trigger" onClick={event => { event.preventDefault(); void install(); }}>
          {installed ? <Check size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
          <span>{installed ? 'App 已安裝' : '安裝 App'}</span>
        </button>
      </InstallGuide>
      <div className="v33-app-messages">
        {!online && (
          <div className="v33-app-message" role="status">
            <WifiOff size={18} aria-hidden="true" />
            <span>目前離線。可使用快速選號與本機資料，即時開獎及帳戶服務需要連線。</span>
          </div>
        )}
        {(waiting || reload) && (
          <div className="v33-app-message v33-update" role="status">
            <RefreshCw size={17} aria-hidden="true" />
            <span>{updateError ? '更新尚未完成，請重試。' : '新版已就緒，更新前請先完成目前的操作。'}</span>
            <button type="button" disabled={applying} onClick={() => {
              if (reload) return window.location.reload();
              setUpdateError(false);
              setApplying(true);
              waiting?.postMessage({ type: 'ACTIVATE_LOTTERY_UPDATE' });
            }}>{applying ? '更新中…' : '更新並重新載入'}</button>
          </div>
        )}
      </div>
    </>
  );
}

function InstallGuide({ open, onOpenChange, installed = false, note, children }: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  installed?: boolean;
  note?: string;
  children: ReactNode;
}) {
  const [platform, setPlatform] = useState<'ios' | 'android'>(() => isAppleMobile() ? 'ios' : 'android');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="v33-install-dialog" showCloseButton={false}>
        <DialogClose type="button" className="v33-close-guide" aria-label="關閉安裝說明">
          <X size={19} aria-hidden="true" />
        </DialogClose>
        <DialogTitle>{installed ? '從主畫面開啟選號漏斗' : '將選號漏斗加到主畫面'}</DialogTitle>
        <DialogDescription>
          {installed ? '點選主畫面的選號漏斗圖示，即可直接開啟。'
            : '選擇裝置，查看加入主畫面的步驟。'}
        </DialogDescription>
        {!installed && (
          <div className="v33-option-row" aria-label="安裝說明裝置">
            <button type="button" className="v33-btn subtle" aria-pressed={platform === 'ios'} onClick={() => setPlatform('ios')}>iPhone／iPad</button>
            <button type="button" className="v33-btn subtle" aria-pressed={platform === 'android'} onClick={() => setPlatform('android')}>Android</button>
          </div>
        )}
        {!installed && (platform === 'ios' ? (
          <ol>
            <li><Share size={19} aria-hidden="true" /> 用 Safari 開啟此頁，點選「分享」。</li>
            <li><PlusSquare size={19} aria-hidden="true" /> 選擇「加入主畫面」。</li>
            <li><Check size={19} aria-hidden="true" /> 若看到「以網頁 App 開啟」，保持開啟，再點「加入」。</li>
          </ol>
        ) : (
          <ol>
            <li><Ellipsis size={19} aria-hidden="true" /> 用 Chrome 開啟此頁，點選右上角的選單。</li>
            <li><Download size={19} aria-hidden="true" /> 選擇「安裝應用程式」或「新增至主畫面」。</li>
            <li><Check size={19} aria-hidden="true" /> 確認後，從主畫面開啟。</li>
          </ol>
        ))}
        {note && <p className="v33-install-note">{note}</p>}
      </DialogContent>
    </Dialog>
  );
}

const ANALYSIS_INSTALL_DISMISSAL = 'lottery-analysis-install-dismissed';

export function AnalysisInstallPrompt() {
  const [guide, setGuide] = useState(false);
  const [installed, setInstalled] = useState(standalone);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(ANALYSIS_INSTALL_DISMISSAL) === '1'; }
    catch { return false; }
  });
  const mobile = isAppleMobile() || /Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (!mobile || dismissed) return;
    const media = window.matchMedia('(display-mode: standalone)');
    const check = () => setInstalled(standalone());
    const onInstall = () => {
      setInstalled(true);
      setGuide(false);
    };
    media.addEventListener('change', check);
    window.addEventListener('appinstalled', onInstall);
    return () => {
      media.removeEventListener('change', check);
      window.removeEventListener('appinstalled', onInstall);
    };
  }, [mobile, dismissed]);

  if (!mobile || installed || dismissed) return null;
  return (
    <aside className="v33-overlay-install" aria-label="App 安裝提示">
      <InstallGuide open={guide} onOpenChange={setGuide}>
        <button type="button" className="v33-overlay-install-trigger">
          <Smartphone size={18} aria-hidden="true" />加到手機主畫面，開獎前 1 秒快速看共振
        </button>
      </InstallGuide>
      <button type="button" className="v33-overlay-install-dismiss" aria-label="關閉安裝提示" onClick={() => {
        setDismissed(true);
        try { localStorage.setItem(ANALYSIS_INSTALL_DISMISSAL, '1'); }
        catch { /* Storage may be unavailable in private browsing. */ }
      }}><X size={18} aria-hidden="true" /></button>
    </aside>
  );
}
