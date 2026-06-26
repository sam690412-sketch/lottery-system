// ============================================================
// PHASE 24 — 娛樂版 MVP Landing（無個資展示版）
// 範圍：T1–T4, T7, T8。靜態三頁：/lp /lp/pricing /lp/preorder。
// 鐵則：不收 Email、不接分析 SDK、不接金流、不收款、不宣稱中獎、不接真實資料。
// 預購為「假門」：點擊只在前端顯示「已記錄你的興趣，尚未收款」，不送任何 API。
// ============================================================
import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router';

// 常駐揭露列（娛樂/不保證中獎/18+/理性購彩）
function DisclaimerBar() {
  return (
    <div className="border-t border-amber-900/40 bg-amber-950/20 px-4 py-3 text-[11px] leading-relaxed text-amber-200/70">
      本服務為娛樂與個人化工具，號碼僅供參考娛樂，<strong className="text-amber-200/90">不保證任何中獎結果</strong>。
      未滿 18 歲不得購買彩券。彩券為機率遊戲，請理性購買、量力而為；如有賭博成癮疑慮，請尋求專業協助。
    </div>
  );
}

function LpFooter() {
  return (
    <footer className="px-4 py-6 text-center text-[11px] text-gray-600">
      <div className="flex justify-center gap-4 mb-2">
        <span className="opacity-60">隱私政策（即將提供）</span>
        <span className="opacity-60">服務條款（即將提供）</span>
      </div>
      <p>這是一個娛樂與個人化選號工具。</p>
    </footer>
  );
}

function LpShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}

// ---------- 首頁 /lp ----------
function LpHome() {
  const navigate = useNavigate();
  return (
    <LpShell>
      {/* Hero */}
      <section className="px-5 pt-12 pb-8 text-center">
        <p className="text-xs tracking-widest text-amber-400/80 mb-3">娛樂選號 · 屬於你的儀式感</p>
        <h1 className="text-3xl font-extrabold leading-tight mb-3">把你的故事，<br />變成一組號碼</h1>
        <p className="text-sm text-gray-400 leading-relaxed mb-7">
          夢境、生日、個人化 —— 我們幫你產生一組有理由、有儀式感的號碼。好玩，而且只屬於你。
        </p>
        <button
          onClick={() => navigate('/builder')}
          className="w-full rounded-xl bg-amber-500 py-3.5 text-base font-bold text-gray-950 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition"
        >
          免費試玩
        </button>
        <button
          onClick={() => navigate('/lp/preorder')}
          className="mt-3 w-full rounded-xl border border-gray-700 py-3 text-sm font-medium text-gray-300 active:scale-[0.98] transition"
        >
          搶先預約 VIP
        </button>
      </section>

      {/* 三功能卡 */}
      <section className="px-5 py-4 space-y-3">
        {[
          { t: '夢境選號', d: '昨晚夢到水、蛇還是飛機？把夢變成一組號碼，讓選號變得有感覺。', cta: '試試解夢選號' },
          { t: '生日個人化', d: '用你的生日、紀念日與幸運數字，產生只屬於你的號碼。', cta: '用生日選號' },
          { t: '養號清單', d: '把喜歡的號碼存起來、命名、追蹤，養成你的專屬幸運清單。', cta: '開始養號' },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
            <h3 className="text-lg font-bold text-amber-300 mb-1.5">{c.t}</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-3">{c.d}</p>
            <button onClick={() => navigate('/builder')} className="text-sm font-medium text-amber-400 active:opacity-70">
              {c.cta} →
            </button>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="px-5 py-6">
        <h2 className="text-base font-bold text-gray-200 mb-4">怎麼玩</h2>
        <ol className="space-y-3">
          {['輸入你的夢境或生日', '系統幫你產生一組有故事的號碼', '存進你的養號清單，隨時回來看'].map((s, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <span className="text-sm text-gray-300 leading-relaxed pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="px-5 py-6">
        <h2 className="text-base font-bold text-gray-200 mb-4">常見問題</h2>
        <div className="space-y-4">
          {[
            { q: '這會幫我中獎嗎？', a: '不會。這是娛樂與個人化工具，幫你產生有故事的號碼；中獎與否取決於開獎，與本服務無關。' },
            { q: '需要付費嗎？', a: '免費就能玩；VIP / PRO 解鎖更多玩法（全夢境、命理選號、養號儲存等）。' },
            { q: '我的資料安全嗎？', a: '我們會依隱私政策處理你的資料，僅用於提供服務。' },
            { q: '適合誰玩？', a: '想讓選號更有趣、有儀式感的成年使用者（18 歲以上）。' },
          ].map((f) => (
            <div key={f.q}>
              <p className="text-sm font-semibold text-gray-200 mb-1">{f.q}</p>
              <p className="text-sm text-gray-400 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="px-5 pb-2">
        <button onClick={() => navigate('/lp/pricing')} className="w-full rounded-xl border border-amber-700/50 py-3 text-sm font-bold text-amber-300 active:scale-[0.98] transition">
          看看方案
        </button>
      </div>

      <DisclaimerBar />
      <LpFooter />
    </LpShell>
  );
}

// ---------- 價格頁 /lp/pricing ----------
function LpPricing() {
  const navigate = useNavigate();
  const plans = [
    { name: 'Free', price: 'NT$0', tag: '', features: ['個人化選號（基本）', '夢境選號（部分）', '產號組合 A / B', '每日 10 次'], reason: '免費體驗、養成選號習慣' },
    { name: 'VIP', price: 'NT$149 / 月', tag: '最受歡迎', features: ['完整夢境玩法', '命理選號（多派）', '產號組合 A–E', '養號清單儲存', '完整來源占比報告', '每日充足次數'], reason: '解鎖全部玩法 + 儲存與追蹤我的號碼' },
    { name: 'PRO', price: 'NT$399 / 月', tag: '', features: ['VIP 全部功能', '自訂權重', '五組比較與匯出', '進階命理玩法', '優先客服'], reason: '深度玩家、可匯出收藏與分享' },
  ];
  return (
    <LpShell>
      <section className="px-5 pt-10 pb-4 text-center">
        <h1 className="text-2xl font-extrabold mb-2">選擇你的玩法</h1>
        <p className="text-sm text-gray-400">免費就能開始；想玩更多花樣，再升級。</p>
      </section>

      <section className="px-5 py-4 space-y-4">
        {plans.map((p) => (
          <div key={p.name} className={`rounded-2xl border p-5 ${p.tag ? 'border-amber-500/60 bg-amber-950/10' : 'border-gray-800 bg-gray-900/40'}`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-gray-100">{p.name}</h3>
              {p.tag && <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-gray-950">{p.tag}</span>}
            </div>
            <p className="text-xl font-extrabold text-amber-300 mb-3">{p.price}</p>
            <ul className="space-y-1.5 mb-4">
              {p.features.map((f) => (
                <li key={f} className="text-sm text-gray-300 flex gap-2"><span className="text-amber-400">·</span>{f}</li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mb-4">{p.reason}</p>
            <button onClick={() => navigate('/lp/preorder')} className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-gray-950 active:scale-[0.98] transition">
              搶先預約
            </button>
          </div>
        ))}
      </section>

      {/* 比較表（橫向可捲） */}
      <section className="px-5 py-4">
        <h2 className="text-sm font-bold text-gray-300 mb-3">方案比較</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-xs min-w-[380px]">
            <thead>
              <tr className="bg-gray-900/60 text-gray-400">
                <th className="px-3 py-2 text-left font-medium">項目</th>
                <th className="px-3 py-2 font-medium">Free</th>
                <th className="px-3 py-2 font-medium">VIP</th>
                <th className="px-3 py-2 font-medium">PRO</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {[
                ['夢境玩法', '部分', '全部', '全部'],
                ['命理選號', '—', '多派', '多派+進階'],
                ['產號組合', 'A/B', 'A–E', 'A–E+自訂'],
                ['養號儲存', '—', '✓', '✓ 多組'],
                ['來源占比報告', '簡', '完整', '完整+匯出'],
                ['每日次數', '10', '999', '999'],
              ].map((r) => (
                <tr key={r[0]} className="border-t border-gray-800">
                  <td className="px-3 py-2 text-left text-gray-400">{r[0]}</td>
                  <td className="px-3 py-2 text-center">{r[1]}</td>
                  <td className="px-3 py-2 text-center">{r[2]}</td>
                  <td className="px-3 py-2 text-center">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="px-5 py-4">
        <button onClick={() => navigate('/lp')} className="text-sm text-gray-500 active:opacity-70">← 回首頁</button>
      </div>

      <DisclaimerBar />
      <LpFooter />
    </LpShell>
  );
}

// ---------- 預購頁 /lp/preorder（假門，不收款、不收 Email） ----------
function LpPreorder() {
  const navigate = useNavigate();
  const [recorded, setRecorded] = useState(false);
  return (
    <LpShell>
      <section className="px-5 pt-12 pb-6 text-center">
        <p className="text-xs tracking-widest text-amber-400/80 mb-3">敬請期待</p>
        <h1 className="text-2xl font-extrabold mb-3">VIP 即將推出</h1>
        <p className="text-sm text-gray-400 leading-relaxed mb-2">
          我們正在打造完整的 VIP 玩法：全夢境、命理選號、養號清單與來源報告。
        </p>
        <p className="text-sm font-semibold text-amber-300">目前尚未收款，你不會被收取任何費用。</p>
      </section>

      <section className="px-5 py-4">
        {!recorded ? (
          <button
            onClick={() => setRecorded(true)}
            className="w-full rounded-xl bg-amber-500 py-3.5 text-base font-bold text-gray-950 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition"
          >
            我有興趣，VIP 上線通知我
          </button>
        ) : (
          <div className="rounded-2xl border border-amber-700/50 bg-amber-950/20 p-5 text-center">
            <p className="text-base font-bold text-amber-300 mb-1">已記錄你的興趣！</p>
            <p className="text-sm text-gray-400">VIP 開放時會通知你。<strong className="text-amber-200">目前尚未收款。</strong></p>
          </div>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-gray-500 text-center">
          這是預約／候補階段，<strong className="text-gray-400">尚未收款、不會扣款</strong>。預約不代表購買；正式開放後你可自行決定是否訂閱。
        </p>
      </section>

      <div className="px-5 py-4 text-center">
        <button onClick={() => navigate('/lp')} className="text-sm text-gray-500 active:opacity-70">← 回首頁</button>
      </div>

      <DisclaimerBar />
      <LpFooter />
    </LpShell>
  );
}

// ---------- /lp 路由群 ----------
export default function LandingPage() {
  return (
    <Routes>
      <Route path="/lp" element={<LpHome />} />
      <Route path="/lp/pricing" element={<LpPricing />} />
      <Route path="/lp/preorder" element={<LpPreorder />} />
    </Routes>
  );
}
