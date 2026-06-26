// ============================================================
// V18.2 AUDIT F: 測試版風險提示橫幅
// 所有含付款流程的頁面必須顯示
// ============================================================
import { AlertTriangle } from 'lucide-react';

export default function TestModeBanner() {
  return (
    <div className="rounded-lg border border-amber-700/30 bg-amber-950/20 px-3 py-2 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-[11px] font-bold text-amber-400">測試版提示</p>
        <p className="text-[10px] text-amber-400/70 leading-relaxed">
          目前為測試版本，尚未接正式金流。點擊「付款」不會實際扣款。
          正式版需串接第三方金流服務商。
        </p>
      </div>
    </div>
  );
}
