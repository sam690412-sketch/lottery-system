// ============================================================
// V11 資料模板下載 / 複製
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';
import { Copy, Download, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';

interface Props {
  lotteryType: LotteryType;
}

const TEMPLATES: Partial<Record<LotteryType, { header: string; example: string; note: string }>> = {
  power: {
    header: 'date,period,n1,n2,n3,n4,n5,n6,special',
    example: `date,period,n1,n2,n3,n4,n5,n6,special
2025-01-02,114000001,3,12,18,25,31,36,7
2025-01-06,114000002,5,9,17,22,28,35,3
2025-01-09,114000003,1,8,15,23,30,38,5`,
    note: 'special 為第二區號碼，範圍 1~8',
  },
  lotto649: {
    header: 'date,period,n1,n2,n3,n4,n5,n6,special',
    example: `date,period,n1,n2,n3,n4,n5,n6,special
2025-01-03,114000010,5,12,19,27,33,42,7
2025-01-07,114000011,2,8,15,22,31,45,39
2025-01-10,114000012,1,9,17,25,34,48,6`,
    note: 'special 為開獎特別號（非投注號碼），範圍 1~49',
  },
  daily539: {
    header: 'date,period,n1,n2,n3,n4,n5',
    example: `date,period,n1,n2,n3,n4,n5
2025-01-02,114000020,3,12,18,25,31
2025-01-03,114000021,5,9,17,22,28
2025-01-04,114000022,1,8,15,23,30`,
    note: '今彩539無特別號，共5碼',
  },
};

export default function CsvTemplatePanel({ lotteryType }: Props) {
  const config = getConfig(lotteryType);
  const tmpl = TEMPLATES[lotteryType] || TEMPLATES['power']!;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(tmpl.example).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob(['\ufeff' + tmpl.example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name}_CSV範本_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border border-blue-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-blue-400 text-lg">
          <BookOpen className="w-5 h-5" />
          {config.name} CSV 範本
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${config.themeColor} border-current`}>{config.name}</Badge>
          <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">{config.mainMin}~{config.mainMax}選{config.mainCount}</Badge>
        </div>

        <div className="flex items-start gap-2 p-2 rounded bg-blue-950/20 border border-blue-900/20">
          <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-300/80 space-y-1">
            <p>欄位格式：<code className="bg-blue-900/30 px-1 rounded">{tmpl.header}</code></p>
            <p>{tmpl.note}</p>
            <p>日期格式：YYYY-MM-DD（例：2025-01-02）</p>
            <p>號碼不可重複，用逗號分隔</p>
            <p>資料來源：台灣彩券官網 <a href="https://www.taiwanlottery.com.tw" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">https://www.taiwanlottery.com.tw</a></p>
          </div>
        </div>

        <Textarea
          value={tmpl.example}
          readOnly
          className="h-32 bg-gray-800 border-gray-700 text-gray-300 text-xs font-mono"
        />

        <div className="flex gap-2">
          <Button size="sm" onClick={handleDownload} className="bg-blue-600 hover:bg-blue-500 text-white">
            <Download className="w-4 h-4 mr-1" /> 下載 CSV 範本
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy} className="border-gray-600 text-gray-400">
            {copied ? <CheckCircle className="w-4 h-4 mr-1 text-green-400" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? '已複製' : '複製範本'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
