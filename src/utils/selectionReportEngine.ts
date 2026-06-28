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

/** 把報告轉成純文字(供複製 / 未來 PDF)。 */
export function exportSelectionReportAsText(report: SelectionReport): string {
  const lines: string[] = [];
  lines.push(report.title);
  lines.push('='.repeat(Math.min(40, report.title.length * 2)));
  lines.push(`產生時間:${report.generatedAt}`);
  lines.push(`整體評語:${report.scoreLabel}`);
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
    lines.push('參考建議:');
    for (const r of report.recommendations) lines.push(`- ${r}`);
    lines.push('');
  }
  if (report.warnings.length) {
    lines.push('提醒:');
    for (const w of report.warnings) lines.push(`- ${w}`);
  }
  return lines.join('\n');
}

/** 把報告轉成簡單 HTML 字串(供未來 PDF / 分享)。 */
export function exportSelectionReportAsHtml(report: SelectionReport): string {
  const esc = (str: string): string =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const secHtml = report.sections
    .map((sec) => {
      const head = sec.score !== undefined ? `${esc(sec.title)}(${sec.score} 分)` : esc(sec.title);
      return `<section><h3>${head}</h3><p>${esc(sec.body)}</p></section>`;
    })
    .join('');
  const recHtml = report.recommendations.length
    ? `<h3>參考建議</h3><ul>${report.recommendations.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`
    : '';
  const warnHtml = report.warnings.length
    ? `<h3>提醒</h3><ul>${report.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`
    : '';
  return [
    `<article>`,
    `<h1>${esc(report.title)}</h1>`,
    `<p><small>產生時間:${esc(report.generatedAt)}</small></p>`,
    `<p><strong>${esc(report.scoreLabel)}</strong></p>`,
    `<p>${esc(report.summary)}</p>`,
    secHtml,
    recHtml,
    warnHtml,
    `</article>`,
  ].join('');
}

/* ============================================================
 * 保留接口(PDF,本版不實作)
 * ========================================================== */

export interface SelectionReportPdfOptions {
  report: SelectionReport;
  fileName?: string;
}
// 之後版本補上 exportSelectionReportAsPdf(options: SelectionReportPdfOptions): Promise<Blob>。

export default generateSelectionReport;
