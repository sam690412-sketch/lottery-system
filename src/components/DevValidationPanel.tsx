// ============================================================
// V10 開發驗收測試面板
// ============================================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LotteryType } from '@/utils/lotteryConfig';
import { getConfig } from '@/utils/lotteryConfig';
import { generateCombos } from '@/utils/comboGenerator';
import { getPrizeTier } from '@/utils/prize';
import { Bug, CheckCircle, XCircle, Play } from 'lucide-react';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

interface Props {
  lotteryType: LotteryType;
}

export default function DevValidationPanel({ lotteryType }: Props) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runTests = () => {
    setRunning(true);
    const tests: TestResult[] = [];

    // 測試1: 產出指定組數
    const testCounts = [1, 2, 3, 5, 10];
    testCounts.forEach(count => {
      const mockScores = Array.from({ length: getConfig(lotteryType).mainMax }, (_, i) => ({
        number: i + 1,
        total: 50 + Math.random() * 40,
        grade: (Math.random() > 0.7 ? 'A' : Math.random() > 0.4 ? 'B' : Math.random() > 0.2 ? 'C' : 'D') as any,
        layers: {},
        isRecommended: true,
        isUserNumber: false,
      }));
      const { combos, logs } = generateCombos(lotteryType, mockScores, [5, 9, 15], '平衡', count, true);
      tests.push({
        name: `產出 ${count} 組`,
        passed: combos.length === count,
        message: combos.length === count ? `成功產出 ${combos.length} 組` : `失敗：只產出 ${combos.length} 組（需${count}組）${logs.length > 0 ? ' | 降級:' + logs.join('; ') : ''}`,
      });
    });

    // 測試2: 每組格式驗證
    const config = getConfig(lotteryType);
    const mockScores2 = Array.from({ length: config.mainMax }, (_, i) => ({
      number: i + 1, total: 60, grade: 'A' as any, layers: {}, isRecommended: true, isUserNumber: false,
    }));
    const { combos: formatCombos } = generateCombos(lotteryType, mockScores2, [5, 9], '平衡', 3, true);
    formatCombos.forEach((combo, i) => {
      const hasDuplicates = new Set(combo.zone1).size !== combo.zone1.length;
      const inRange = combo.zone1.every(n => n >= config.mainMin && n <= config.mainMax);
      const correctCount = combo.zone1.length === config.mainCount;
      const zone2Correct = config.specialMode === 'separate'
        ? (combo.zone2 >= config.specialMin && combo.zone2 <= config.specialMax)
        : (combo.zone2 === 0);

      tests.push({
        name: `第${i + 1}組格式`,
        passed: !hasDuplicates && inRange && correctCount && zone2Correct,
        message: `主區:${combo.zone1.length}碼 範圍:${inRange ? 'OK' : 'NG'} 重複:${hasDuplicates ? 'NG' : 'OK'} ${config.specialMode === 'separate' ? `二區:${combo.zone2}` : '無二區'}`,
      });
    });

    // 測試3: 獎項判斷
    if (lotteryType === 'power') {
      tests.push({ name: '威力彩頭獎判斷', passed: getPrizeTier('power', 6, true).tier === '頭獎', message: '6碼+第二區=頭獎' });
      tests.push({ name: '威力彩普獎判斷', passed: getPrizeTier('power', 3, false).tier === '普獎', message: '3碼無第二區=普獎' });
      tests.push({ name: '威力彩未中獎', passed: !getPrizeTier('power', 1, false).isWin, message: '1碼=未中獎' });
    } else if (lotteryType === 'lotto649') {
      tests.push({ name: '大樂透頭獎', passed: getPrizeTier('lotto649', 6, true).tier === '頭獎', message: '6碼+特別號=頭獎' });
      tests.push({ name: '大樂透普獎', passed: getPrizeTier('lotto649', 2, true).tier === '普獎', message: '2碼+特別號=普獎' });
    } else {
      tests.push({ name: '今彩539頭獎', passed: getPrizeTier('daily539', 5, false).tier === '頭獎', message: '5碼=頭獎' });
      tests.push({ name: '今彩539未中獎', passed: !getPrizeTier('daily539', 1, false).isWin, message: '1碼=未中獎' });
    }

    // 測試4: 組間不重複
    const zone1Keys = formatCombos.map(c => c.zone1.join(','));
    const hasDupes = zone1Keys.length !== new Set(zone1Keys).size;
    tests.push({ name: '組間不重複', passed: !hasDupes, message: hasDupes ? '發現重複組合' : '所有組合均不相同' });

    setResults(tests);
    setRunning(false);
  };

  const passCount = results.filter(r => r.passed).length;

  return (
    <Card className="border border-red-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-red-400 text-lg">
          <Bug className="w-5 h-5" />
          驗收測試面板
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">{getConfig(lotteryType).name}</Badge>
          {results.length > 0 && (
            <Badge className={passCount === results.length ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
              {passCount}/{results.length} 通過
            </Badge>
          )}
        </div>

        <Button size="sm" onClick={runTests} disabled={running} className="bg-red-600 hover:bg-red-500 text-white">
          <Play className="w-4 h-4 mr-1" /> {running ? '測試中...' : `執行${getConfig(lotteryType).name}驗收測試`}
        </Button>

        {results.length > 0 && (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center gap-2 p-1.5 rounded ${r.passed ? 'bg-green-950/20' : 'bg-red-950/20'}`}>
                {r.passed ? <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                <span className="text-[10px]">
                  <span className={r.passed ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{r.name}</span>
                  <span className="text-gray-500 ml-1">{r.message}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
