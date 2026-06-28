/**
 * selectionReportEngine.ts  (V24-D — AI 選號分析報告產生器)
 *
 * 定位:統計與娛樂用途分析,非預測、非中獎保證。
 * 用語一律使用:統計完整度 / 模型一致性 / 號碼平衡度 / 歷史吻合度 / 娛樂分析 / 參考建議。
 * 嚴禁任何宣稱中獎、命中、保證結果或誇大勝率的字眼。
 *
 * 純函式、無副作用;吃 selectionScoreEngine 的 SelectionScoreResult 產生結構化報告。
 * 不 import HistoryProvider / HistoryEngine / statistics.ts。
 */

import type { SelectionScoreResult } from './selectionScoreEngine';

/* ============================================================
 * 輸入 / 輸出契約
 * ========================================================== */

/** 收藏來源資訊(可選)。 */
export interface SelectionSourceMeta {
  date?: string;
  note?: string;
}

/** 使用者情境(可選,保留擴充;目前僅作標題稱呼)。 */
export interface SelectionUserContext {
  nickname?: string;
}

export interface SelectionReportInput {
  lotteryType: string;
  numbers: number[];
  scoreResult: SelectionScoreResult;
  sourceMeta?: SelectionSourceMeta;
  userContext?: SelectionUserContext;
}

export interface SelectionReportSection {
  id: string;
  title: string;
  /** 該項分數(整體統計完整度與娛樂提醒可為 undefined)。 */
  score?: number;
  /** 段落敘述。 */
  body: string;
}

export interface SelectionReport {
  title: string;
  summary: string;
  /** 整體分數的文字級別(如「統計完整度高」)。 */
  scoreLabel: string;
  sections: SelectionReportSection[];
  recommendations: string[];
  warnings: string[];
  generatedAt: string;
}

/* ============================================================
 * 小工具
 * ========================================================== */

const GAME_LABEL: Record<string, string> = {
  power: '威力彩',
  lotto649: '大樂透',
  daily539: '今彩539',
  lotto49c: '49 選 6',
  daily39c: '39 選 5',
};

function gameLabel(t: string): string {
  return GAME_LABEL[t] ?? t;
}

function fmtNumbers(nums: number[]): string {
  return nums.map((n) => String(n).padStart(2, '0')).join(' ');
}

/** 分數 → 文字級別(全部為統計用語,無中獎字眼)。 */
function levelOf(score: number): string {
  if (score >= 85) return '很高';
  if (score >= 70) return '良好';
  if (score >= 55) return '中等';
  if (score >= 40) return '偏低';
  return '低';
}

function scoreLabelOf(overall: number): string {
  return `統計完整度${levelOf(overall)}`;
}

/** 依分數產生「觀察」敘述。high/mid/low 三段語句。 */
function observe(
  score: number,
  high: string,
  mid: string,
  low: string,
): string {
  if (score >= 75) return high;
  if (score >= 50) return mid;
  return low;
}

function nowIso(): string {
  return new Date().toISOString();
}

/* ============================================================
 * 報告產生
 * ========================================================== */

export function generateSelectionReport(
  input: SelectionReportInput,
): SelectionReport {
  const { lotteryType, numbers, scoreResult: s, sourceMeta, userContext } = input;

  const who = userContext?.nickname ? `${userContext.nickname}的` : '此組';
  const title = `${who}${gameLabel(lotteryType)}號碼・統計分析報告`;

  const sections: SelectionReportSection[] = [
    {
      id: 'overall',
      title: '整體統計完整度',
      score: s.overallScore,
      body: `這組號碼的整體統計完整度為 ${s.overallScore} 分(${levelOf(
        s.overallScore,
      )}),由九項指標加權而成,反映號碼在歷史統計上的平衡與吻合程度。`,
    },
    {
      id: 'hot',
      title: '熱門號觀察',
      score: s.hotScore,
      body: observe(
        s.hotScore,
        '熱門號的比例與歷史常態相當吻合。',
        '熱門號比例尚屬合理,與歷史平均略有差距。',
        '熱門號比例偏離歷史常態較多。',
      ),
    },
    {
      id: 'cold',
      title: '冷門號觀察',
      score: s.coldScore,
      body: observe(
        s.coldScore,
        '冷門號的搭配平衡,與歷史分佈接近。',
        '冷門號搭配尚可,平衡度中等。',
        '冷門號比例與歷史分佈差距較大。',
      ),
    },
    {
      id: 'oddEven',
      title: '奇偶比例',
      score: s.oddEvenScore,
      body: observe(
        s.oddEvenScore,
        '奇偶比例與歷史常見分佈一致。',
        '奇偶比例尚屬合理。',
        '奇偶比例偏向其中一側。',
      ),
    },
    {
      id: 'bigSmall',
      title: '大小比例',
      score: s.bigSmallScore,
      body: observe(
        s.bigSmallScore,
        '大小號比例分佈均衡。',
        '大小號比例尚可。',
        '大小號比例偏向其中一側。',
      ),
    },
    {
      id: 'tail',
      title: '尾數分散',
      score: s.tailScore,
      body: observe(
        s.tailScore,
        '尾數分散度佳,涵蓋多種尾數。',
        '尾數分散度中等。',
        '尾數較為集中。',
      ),
    },
    {
      id: 'sum',
      title: '和值區間',
      score: s.sumScore,
      body: observe(
        s.sumScore,
        '和值落在歷史常見區間內。',
        '和值接近常見區間。',
        '和值偏離歷史常見區間。',
      ),
    },
    {
      id: 'distribution',
      title: '區域分布',
      score: s.distributionScore,
      body: observe(
        s.distributionScore,
        '號碼平衡度佳,跨越多個號段。',
        '號碼分布尚可。',
        '號碼集中於部分區域。',
      ),
    },
    {
      id: 'trend',
      title: '近期趨勢',
      score: s.trendScore,
      body: observe(
        s.trendScore,
        '與近期統計趨勢的歷史吻合度佳。',
        '與近期趨勢部分吻合。',
        '與近期趨勢的吻合度較低。',
      ),
    },
    {
      id: 'entertainment',
      title: '娛樂用途提醒',
      body: '本報告為歷史統計與模型一致性的整理,僅供娛樂分析與參考建議,不作為投注依據。請理性購買、量力而為。',
    },
  ];

  // 摘要:挑出最高 / 最低面向(排除娛樂提醒)
  const scored = sections.filter(
    (sec) => typeof sec.score === 'number' && sec.id !== 'overall',
  ) as (SelectionReportSection & { score: number })[];
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a), scored[0]);
  const worst = scored.reduce((a, b) => (b.score < a.score ? b : a), scored[0]);

  const summary =
    `這組 ${gameLabel(lotteryType)} 號碼(${fmtNumbers(numbers)})整體統計完整度 ${s.overallScore} 分,` +
    `${best ? `在「${best.title}」表現較佳` : ''}` +
    `${worst && worst.id !== best?.id ? `,在「${worst.title}」相對較弱` : ''}。` +
    (sourceMeta?.note ? `(收藏備註:${sourceMeta.note})` : '');

  // 參考建議(中性、統計取向,非投注建議)
  const recommendations: string[] = [];
  if (s.tailScore < 55) recommendations.push('可考慮讓尾數更分散,提升號碼平衡度。');
  if (s.distributionScore < 55) recommendations.push('號碼較集中,可考慮跨越更多號段。');
  if (s.sumScore < 55) recommendations.push('和值偏離常見區間,可參考歷史和值分佈調整。');
  if (s.oddEvenScore < 55) recommendations.push('奇偶比例偏向一側,可參考歷史奇偶分佈。');
  if (s.bigSmallScore < 55) recommendations.push('大小比例偏向一側,可參考歷史大小分佈。');
  if (recommendations.length === 0)
    recommendations.push('各項統計指標大致均衡,符合歷史常見分佈。');

  const warnings: string[] = [
    '本報告為娛樂用途,不具任何結果保證。',
    '統計分析無法改變每期開獎的隨機性。',
  ];

  return {
    title,
    summary,
    scoreLabel: scoreLabelOf(s.overallScore),
    sections,
    recommendations,
    warnings,
    generatedAt: nowIso(),
  };
}

/* ============================================================
 * 匯出(文字 / HTML)。PDF 之後再做,先保留接口。
 * ========================================================== */

/** 匯出附帶資訊(讓文字/HTML/檔名能明確帶出彩種、號碼、整體分數)。 */
export interface SelectionReportExportContext {
  lotteryType?: string;
  numbers?: number[];
  overallScore?: number;
}

const EXPORT_GAME_LABEL: Record<string, string> = {
  power: '威力彩',
  lotto649: '大樂透',
  daily539: '今彩539',
  lotto49c: '49選6',
  daily39c: '39選5',
};

function exportGameLabel(t?: string): string {
  if (!t) return '';
  return EXPORT_GAME_LABEL[t] ?? t;
}

function fmtNums(nums?: number[]): string {
  return (nums ?? []).map((n) => String(n).padStart(2, '0')).join(' ');
}

const ENTERTAINMENT_NOTICE =
  '本報告為歷史統計與模型一致性的整理,僅供娛樂分析與參考建議,不作為投注依據。理性購買、量力而為。';

/** 把報告轉成純文字(適合貼到 LINE / Facebook 社團)。 */
export function exportSelectionReportAsText(
  report: SelectionReport,
  ctx: SelectionReportExportContext = {},
): string {
  const lines: string[] = [];
  lines.push(report.title);
  lines.push('────────────────────');
  lines.push(`產生時間:${new Date(report.generatedAt).toLocaleString()}`);
  if (ctx.lotteryType) lines.push(`彩種:${exportGameLabel(ctx.lotteryType)}`);
  if (ctx.numbers && ctx.numbers.length) lines.push(`號碼:${fmtNums(ctx.numbers)}`);
  const overall =
    ctx.overallScore ?? report.sections.find((s) => s.id === 'overall')?.score;
  if (overall !== undefined) lines.push(`整體統計完整度:${overall} 分(${report.scoreLabel})`);
  lines.push('');
  lines.push(report.summary);
  lines.push('');
  for (const sec of report.sections) {
    const head = sec.score !== undefined ? `${sec.title}(${sec.score} 分)` : sec.title;
    lines.push(`【${head}】`);
    lines.push(sec.body);
    lines.push('');
  }
  if (report.recommendations.length) {
    lines.push('◆ 參考建議');
    for (const r of report.recommendations) lines.push(`・${r}`);
    lines.push('');
  }
  if (report.warnings.length) {
    lines.push('◆ 提醒');
    for (const w of report.warnings) lines.push(`・${w}`);
    lines.push('');
  }
  lines.push(ENTERTAINMENT_NOTICE);
  return lines.join('\n');
}

/** 把報告轉成完整、可獨立開啟的 HTML 文件(含彩種/號碼/整體分數/娛樂聲明)。 */
export function exportSelectionReportAsHtml(
  report: SelectionReport,
  ctx: SelectionReportExportContext = {},
): string {
  const esc = (str: string): string =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const overall =
    ctx.overallScore ?? report.sections.find((s) => s.id === 'overall')?.score;

  const metaRows: string[] = [];
  metaRows.push(`<tr><th>產生時間</th><td>${esc(new Date(report.generatedAt).toLocaleString())}</td></tr>`);
  if (ctx.lotteryType) metaRows.push(`<tr><th>彩種</th><td>${esc(exportGameLabel(ctx.lotteryType))}</td></tr>`);
  if (ctx.numbers && ctx.numbers.length) metaRows.push(`<tr><th>號碼</th><td>${esc(fmtNums(ctx.numbers))}</td></tr>`);
  if (overall !== undefined) metaRows.push(`<tr><th>整體分數</th><td>${overall} 分(${esc(report.scoreLabel)})</td></tr>`);

  const secHtml = report.sections
    .map((sec) => {
      const head = sec.score !== undefined ? `${esc(sec.title)}(${sec.score} 分)` : esc(sec.title);
      return `<section class="sec"><h3>${head}</h3><p>${esc(sec.body)}</p></section>`;
    })
    .join('');
  const recHtml = report.recommendations.length
    ? `<h2>參考建議</h2><ul>${report.recommendations.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`
    : '';
  const warnHtml = report.warnings.length
    ? `<h2>提醒</h2><ul>${report.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`
    : '';

  return [
    '<!DOCTYPE html>',
    '<html lang="zh-Hant"><head><meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${esc(report.title)}</title>`,
    '<style>',
    'body{font-family:-apple-system,"Noto Sans TC",sans-serif;max-width:760px;margin:24px auto;padding:0 16px;background:#0a0a0a;color:#e5e5e5;line-height:1.7}',
    'h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:20px 0 8px;color:#fdba74}h3{font-size:14px;margin:0 0 4px;color:#f5f5f5}',
    'table{border-collapse:collapse;margin:12px 0;width:100%}th,td{text-align:left;padding:4px 8px;border-bottom:1px solid #262626;font-size:13px}th{color:#a3a3a3;width:96px;white-space:nowrap}',
    '.summary{background:#171717;border:1px solid #262626;border-radius:10px;padding:12px;font-size:13px}',
    '.sec{border:1px solid #1f1f1f;border-radius:10px;padding:10px 12px;margin:8px 0}.sec p{margin:4px 0 0;font-size:13px;color:#a3a3a3}',
    'ul{margin:6px 0;padding-left:20px}li{font-size:13px;margin:2px 0}',
    '.notice{margin-top:20px;padding-top:12px;border-top:1px solid #262626;font-size:12px;color:#737373}',
    '.print-hint{margin:0 0 16px;padding:10px 12px;border:1px solid #f59e0b55;background:#f59e0b1a;border-radius:10px;font-size:12px;color:#fbbf24}',
    '@media print{',
    '  .print-hint{display:none}',
    '  body{background:#fff;color:#111;margin:0}',
    '  h2{color:#b45309}h3{color:#111}',
    '  th{color:#444}td{color:#111}',
    '  table th,table td{border-bottom:1px solid #ccc}',
    '  .summary{background:#f6f6f6;border-color:#ddd;color:#111}',
    '  .sec{border-color:#ccc}.sec p{color:#333}',
    '  .notice{color:#555;border-color:#ccc}',
    '  @page{margin:16mm}',
    '}',
    '</style></head><body>',
    '<div class="print-hint">列印 / 另存 PDF:請使用瀏覽器列印功能(Ctrl / Cmd + P),並在印表機選擇「另存為 PDF」。</div>',
    `<h1>${esc(report.title)}</h1>`,
    `<table>${metaRows.join('')}</table>`,
    `<p class="summary">${esc(report.summary)}</p>`,
    '<h2>分析段落</h2>',
    secHtml,
    recHtml,
    warnHtml,
    `<p class="notice">${esc(ENTERTAINMENT_NOTICE)}</p>`,
    '</body></html>',
  ].join('');
}

/** 產生匯出檔名:selection-report-{彩種}-YYYYMMDD-HHmm.{ext}。 */
export function createSelectionReportFilename(
  lotteryType: string,
  ext: 'txt' | 'html',
  generatedAt?: string,
): string {
  const d = generatedAt ? new Date(generatedAt) : new Date();
  const base = Number.isNaN(d.getTime()) ? new Date() : d;
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${base.getFullYear()}${p(base.getMonth() + 1)}${p(base.getDate())}-${p(base.getHours())}${p(base.getMinutes())}`;
  // 檔名用彩種代碼(ASCII,跨平台安全)
  const slug = (lotteryType || 'lottery').replace(/[^a-zA-Z0-9_-]/g, '');
  return `selection-report-${slug}-${stamp}.${ext}`;
}

/** 在瀏覽器觸發下載一個文字 Blob;非瀏覽器環境安全略過。 */
function triggerDownload(content: string, filename: string, mime: string): boolean {
  try {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch {
    return false;
  }
}

/** 下載純文字報告。回傳是否成功觸發。 */
export function downloadSelectionReportText(
  report: SelectionReport,
  ctx: SelectionReportExportContext = {},
): boolean {
  const content = exportSelectionReportAsText(report, ctx);
  const filename = createSelectionReportFilename(ctx.lotteryType ?? 'lottery', 'txt', report.generatedAt);
  return triggerDownload(content, filename, 'text/plain;charset=utf-8');
}

/** 下載 HTML 報告。回傳是否成功觸發。 */
export function downloadSelectionReportHtml(
  report: SelectionReport,
  ctx: SelectionReportExportContext = {},
): boolean {
  const content = exportSelectionReportAsHtml(report, ctx);
  const filename = createSelectionReportFilename(ctx.lotteryType ?? 'lottery', 'html', report.generatedAt);
  return triggerDownload(content, filename, 'text/html;charset=utf-8');
}

/* ============================================================
 * 列印(瀏覽器原生,讓使用者自行另存 PDF)
 * ========================================================== */

/**
 * 開新視窗載入 HTML 報告並觸發瀏覽器列印(使用者可於印表機選擇「另存為 PDF」)。
 * 回傳是否成功開啟視窗;若被 popup 阻擋或非瀏覽器環境則回傳 false。
 */
export function openSelectionReportPrintWindow(
  report: SelectionReport,
  ctx: SelectionReportExportContext = {},
): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const html = exportSelectionReportAsHtml(report, ctx);
    const win = window.open('', '_blank');
    if (!win) return false; // popup 被阻擋
    win.document.open();
    win.document.write(html);
    win.document.close();
    // 等內容渲染後再列印(不阻塞主執行緒)
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        /* 使用者可手動 Ctrl/Cmd+P */
      }
    }, 300);
    return true;
  } catch {
    return false;
  }
}

/* ============================================================
 * 保留接口(PDF,本版不實作)
 * ========================================================== */

export interface SelectionReportPdfOptions {
  report: SelectionReport;
  fileName?: string;
}
// 之後版本補上 exportSelectionReportAsPdf(options: SelectionReportPdfOptions): Promise<Blob>。
// 目前不依賴任何外部套件、不產生 PDF。

export default generateSelectionReport;
