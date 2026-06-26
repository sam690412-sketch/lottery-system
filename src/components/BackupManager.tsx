// ============================================================
// V8 備份管理：匯出 / 匯入 / 重置
// ============================================================
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Download,
  Upload,
  Trash2,
  Save,
  FileJson,
  AlertTriangle,
  CheckCircle,
  Copy,
} from 'lucide-react';
import type { DrawRecordV8 } from '@/utils/dataSource';
import { exportBackup, importBackup, exportToCSV, clearAllData } from '@/utils/dataSource';

interface Props {
  records: DrawRecordV8[];
  onUpdate: () => void;
}

export default function BackupManager({ records, onUpdate }: Props) {
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 匯出 JSON 備份
  const handleExportJSON = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `威力彩備份_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ type: 'success', message: 'JSON 備份已下載' });
  };

  // 匯出 CSV
  const handleExportCSV = () => {
    const csv = exportToCSV(records);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `威力彩開獎資料_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ type: 'success', message: 'CSV 已下載' });
  };

  // 複製到剪貼簿
  const handleCopyJSON = () => {
    const json = exportBackup();
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setStatus({ type: 'success', message: '已複製到剪貼簿' });
    });
  };

  // 從文字匯入
  const handleImportText = () => {
    setStatus({ type: null, message: '' });
    if (!importText.trim()) {
      setStatus({ type: 'error', message: '請貼上備份 JSON' });
      return;
    }
    const ok = importBackup(importText);
    if (ok) {
      setImportText('');
      onUpdate();
      setStatus({ type: 'success', message: '備份已還原成功' });
    } else {
      setStatus({ type: 'error', message: '還原失敗，請確認 JSON 格式正確' });
    }
  };

  // 從檔案匯入
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const ok = importBackup(text);
      if (ok) {
        onUpdate();
        setStatus({ type: 'success', message: `已從 ${file.name} 還原備份` });
      } else {
        setStatus({ type: 'error', message: '檔案格式不正確' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 清除全部資料
  const handleClearAll = () => {
    clearAllData();
    onUpdate();
    setStatus({ type: 'success', message: '已清除所有資料並重置為範例資料' });
  };

  return (
    <Card className="border border-purple-900/30 bg-gray-900/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-purple-400 text-lg">
          <Save className="w-5 h-5" />
          備份與還原
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 匯出區域 */}
        <div className="p-3 rounded-lg bg-gray-800/40 border border-gray-700/30">
          <p className="text-xs text-gray-400 mb-2 font-semibold">匯出資料</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleExportJSON} className="bg-blue-600 hover:bg-blue-500 text-white">
              <FileJson className="w-4 h-4 mr-1" /> JSON 備份
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportCSV} className="border-green-700 text-green-400 hover:bg-green-900/20">
              <Download className="w-4 h-4 mr-1" /> CSV 開獎資料
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopyJSON} className="border-gray-600 text-gray-400 hover:bg-gray-700">
              {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? '已複製' : '複製到剪貼簿'}
            </Button>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">JSON 備份包含：開獎資料、個人化來源、實測日誌</p>
        </div>

        {/* 匯入區域 */}
        <div className="p-3 rounded-lg bg-gray-800/40 border border-gray-700/30">
          <p className="text-xs text-gray-400 mb-2 font-semibold">還原資料</p>

          {/* 檔案上傳 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="border-amber-700 text-amber-400 hover:bg-amber-900/20 mb-2"
          >
            <Upload className="w-4 h-4 mr-1" /> 選擇備份檔案
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-gray-800 px-2 text-gray-500">或貼上 JSON</span>
            </div>
          </div>

          <Textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder="貼上備份 JSON 內容..."
            className="h-24 bg-gray-800 border-gray-700 text-gray-100 text-xs font-mono placeholder:text-gray-600"
          />
          <Button
            size="sm"
            onClick={handleImportText}
            className="mt-2 bg-amber-600 hover:bg-amber-500 text-gray-900"
          >
            <Upload className="w-4 h-4 mr-1" /> 還原
          </Button>
        </div>

        {/* 狀態 */}
        {status.type && (
          <div className={`flex items-center gap-2 p-2 rounded border ${status.type === 'success' ? 'bg-green-950/20 border-green-900/20' : 'bg-red-950/20 border-red-900/20'}`}>
            {status.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
            <p className="text-xs text-gray-300">{status.message}</p>
          </div>
        )}

        {/* 目前資料摘要 */}
        <div className="p-2 rounded bg-gray-800/40">
          <p className="text-xs text-gray-400">目前資料摘要</p>
          <div className="flex flex-wrap gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">{records.length} 期開獎</Badge>
            <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">{records.filter(r => r.source === 'manual').length} 筆手動</Badge>
            <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">{records.filter(r => r.source === 'sample').length} 筆範例</Badge>
          </div>
        </div>

        {/* 危險操作 */}
        <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/20">
          <p className="text-xs text-red-400 mb-2 font-semibold">危險操作</p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-red-700 text-red-400 hover:bg-red-900/20">
                <Trash2 className="w-4 h-4 mr-1" /> 清除所有資料
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-700 text-gray-100">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-400">確認清除所有資料？</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400 text-xs">
                  此操作會刪除所有開獎資料、個人化來源和實測日誌，並重置為範例資料。此動作無法復原，建議先匯出備份。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} className="bg-red-600 text-white hover:bg-red-500">確認清除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
