import { useState } from 'react';
import { Clipboard } from 'lucide-react';

export function CopyResonance({ value, disabled }: { value: string; disabled: boolean }) {
  const [status, setStatus] = useState<'copied' | 'manual' | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
    } catch {
      setStatus('manual');
    }
  }

  return (
    <div className="v33-overlay-copy">
      <button type="button" className="v33-btn subtle" disabled={disabled} onClick={() => void copy()}>
        <Clipboard size={17} aria-hidden="true" />一鍵複製共振號碼
      </button>
      <div role="status">
        {status === 'copied' && <p className="v33-overlay-feedback">已複製，可貼上至 LINE</p>}
        {status === 'manual' && <p className="v33-overlay-note">請長按或選取下方文字複製。</p>}
      </div>
      {status === 'manual' && <div className="v33-overlay-copy-manual">
        <textarea aria-label="共振號碼文字" readOnly value={value} rows={2} onFocus={event => event.currentTarget.select()} />
      </div>}
    </div>
  );
}
