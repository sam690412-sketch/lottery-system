// ============================================================
// 個人資料來源管理
// ============================================================
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import type { AnyPersonalSource, SourceType } from '@/types/personal';
import { sourceTypeName, sourceTypeColor } from '@/utils/personalNumber';
import { POPULAR_DREAM_SYMBOLS } from '@/utils/dream';
import { UserPlus, Trash2, Edit2, AlertTriangle } from 'lucide-react';

interface Props {
  sources: AnyPersonalSource[];
  onChange: (sources: AnyPersonalSource[]) => void;
}

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'birthday', label: '生日' },
  { value: 'license', label: '車牌' },
  { value: 'phone', label: '手機' },
  { value: 'anniversary', label: '紀念日' },
  { value: 'dream', label: '夢境' },
  { value: 'lucky', label: '幸運號' },
];

export default function PersonalSources({ sources, onChange }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<SourceType>('birthday');
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formRelation, setFormRelation] = useState('');
  const [formLicense, setFormLicense] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formLast4, setFormLast4] = useState('');
  const [formUserName, setFormUserName] = useState('');
  const [formEvent, setFormEvent] = useState('');
  const [formDreamDesc, setFormDreamDesc] = useState('');
  const [formDreamSymbol, setFormDreamSymbol] = useState('');
  const [formDreamEmotion, setFormDreamEmotion] = useState<'吉' | '普通' | '不安'>('普通');
  const [formLuckyNum, setFormLuckyNum] = useState('');
  const [formLuckyReason, setFormLuckyReason] = useState('');
  const [formIsCore, setFormIsCore] = useState(false);
  const [formImportance, setFormImportance] = useState([3]);
  const [formNote, setFormNote] = useState('');

  const resetForm = () => {
    setFormType('birthday'); setFormName(''); setFormDate(''); setFormRelation('');
    setFormLicense(''); setFormOwner(''); setFormLast4(''); setFormUserName('');
    setFormEvent(''); setFormDreamDesc(''); setFormDreamSymbol('');
    setFormDreamEmotion('普通'); setFormLuckyNum(''); setFormLuckyReason('');
    setFormIsCore(false); setFormImportance([3]); setFormNote(''); setEditingId(null);
  };

  const handleAdd = () => { resetForm(); setDialogOpen(true); };

  const handleEdit = (source: AnyPersonalSource) => {
    setEditingId(source.id); setFormType(source.type); setFormName(source.name);
    setFormImportance([source.importance || 3]);
    if (source.type === 'birthday') { setFormRelation(source.relation); setFormDate(source.date); }
    if (source.type === 'license') { setFormLicense(source.licensePlate); setFormOwner(source.ownerName); }
    if (source.type === 'phone') { setFormLast4(source.last4); setFormUserName(source.userName); }
    if (source.type === 'anniversary') { setFormEvent(source.eventName); setFormDate(source.date); }
    if (source.type === 'dream') { setFormDreamDesc(source.description); setFormDate(source.date); setFormDreamEmotion(source.emotion); setFormDreamSymbol(source.mainSymbol); }
    if (source.type === 'lucky') { setFormLuckyNum(String(source.number)); setFormLuckyReason(source.reason); setFormIsCore(source.isCore); }
    setFormNote((source as any).note || '');
    setDialogOpen(true);
  };

  const handleSave = () => {
    const base: any = {
      id: editingId || `source-${Date.now()}`,
      type: formType,
      name: formName || '未命名',
      enabled: true,
      importance: formImportance[0] || 3,
      createdAt: new Date().toISOString(),
    };

    let newSource: AnyPersonalSource;
    switch (formType) {
      case 'birthday': newSource = { ...base, type: 'birthday', relation: formRelation, date: formDate, note: formNote }; break;
      case 'license': newSource = { ...base, type: 'license', licensePlate: formLicense, ownerName: formOwner, note: formNote }; break;
      case 'phone': newSource = { ...base, type: 'phone', last4: formLast4, userName: formUserName, note: formNote }; break;
      case 'anniversary': newSource = { ...base, type: 'anniversary', eventName: formEvent, date: formDate, importance: formImportance[0] || 3, note: formNote }; break;
      case 'dream': newSource = { ...base, type: 'dream', description: formDreamDesc, date: formDate, emotion: formDreamEmotion, mainSymbol: formDreamSymbol }; break;
      case 'lucky': newSource = { ...base, type: 'lucky', number: parseInt(formLuckyNum) || 1, reason: formLuckyReason, isCore: formIsCore }; break;
      default: return;
    }

    if (editingId) {
      onChange(sources.map(s => s.id === editingId ? newSource : s));
    } else {
      onChange([...sources, newSource]);
    }
    resetForm(); setDialogOpen(false);
  };

  const handleDelete = (id: string) => { onChange(sources.filter(s => s.id !== id)); };
  const toggleEnabled = (id: string) => { onChange(sources.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)); };

  const renderFormFields = () => {
    switch (formType) {
      case 'birthday': return <><div><Label className="text-gray-300 text-sm">關係</Label><Input value={formRelation} onChange={e => setFormRelation(e.target.value)} placeholder="例：我、老婆" className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div><div><Label className="text-gray-300 text-sm">生日日期</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div></>;
      case 'license': return <><div><Label className="text-gray-300 text-sm">車牌號碼</Label><Input value={formLicense} onChange={e => setFormLicense(e.target.value)} placeholder="例：ABC-1234" className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div><div><Label className="text-gray-300 text-sm">車主名稱</Label><Input value={formOwner} onChange={e => setFormOwner(e.target.value)} className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div></>;
      case 'phone': return <><div><Label className="text-gray-300 text-sm">手機末4碼</Label><Input value={formLast4} onChange={e => setFormLast4(e.target.value)} placeholder="例：8888" maxLength={4} className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div><div><Label className="text-gray-300 text-sm">使用者名稱</Label><Input value={formUserName} onChange={e => setFormUserName(e.target.value)} className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div></>;
      case 'anniversary': return <><div><Label className="text-gray-300 text-sm">事件名稱</Label><Input value={formEvent} onChange={e => setFormEvent(e.target.value)} placeholder="例：結婚紀念日" className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div><div><Label className="text-gray-300 text-sm">日期</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div></>;
      case 'dream': return <><div><Label className="text-gray-300 text-sm">夢境描述</Label><Input value={formDreamDesc} onChange={e => setFormDreamDesc(e.target.value)} placeholder="簡述夢境內容" className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div><div><Label className="text-gray-300 text-sm">主要符號</Label><Select value={formDreamSymbol} onValueChange={setFormDreamSymbol}><SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><SelectValue placeholder="選擇符號" /></SelectTrigger><SelectContent className="bg-gray-800 border-gray-700">{POPULAR_DREAM_SYMBOLS.map(s => <SelectItem key={s} value={s} className="text-gray-100">{s}</SelectItem>)}</SelectContent></Select></div><div><Label className="text-gray-300 text-sm">情緒</Label><Select value={formDreamEmotion} onValueChange={v => setFormDreamEmotion(v as '吉' | '普通' | '不安')}><SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><SelectValue /></SelectTrigger><SelectContent className="bg-gray-800 border-gray-700"><SelectItem value="吉" className="text-gray-100">吉</SelectItem><SelectItem value="普通" className="text-gray-100">普通</SelectItem><SelectItem value="不安" className="text-gray-100">不安</SelectItem></SelectContent></Select></div><div><Label className="text-gray-300 text-sm">夢境日期</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div></>;
      case 'lucky': return <><div><Label className="text-gray-300 text-sm">幸運號碼</Label><Input type="number" min={1} max={38} value={formLuckyNum} onChange={e => setFormLuckyNum(e.target.value)} className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div><div><Label className="text-gray-300 text-sm">理由</Label><Input value={formLuckyReason} onChange={e => setFormLuckyReason(e.target.value)} placeholder="為什麼這是幸運號" className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div><div className="flex items-center gap-2"><Switch checked={formIsCore} onCheckedChange={setFormIsCore} /><Label className="text-gray-300 text-sm">核心號碼(高權重)</Label></div></>;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-950/20 border border-yellow-900/30">
        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
        <p className="text-xs text-yellow-400/80">請勿輸入完整身分證號、完整住址、完整金融資料。只輸入與選號相關的部分數字即可。</p>
      </div>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-amber-400">我的資料來源 ({sources.length}個)</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="bg-amber-600 hover:bg-amber-500 text-gray-900">
              <UserPlus className="w-4 h-4 mr-1" />新增來源
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 text-gray-100 max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-amber-400">{editingId ? '編輯資料來源' : '新增資料來源'}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><Label className="text-gray-300 text-sm">來源類型</Label><Select value={formType} onValueChange={v => setFormType(v as SourceType)}><SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><SelectValue /></SelectTrigger><SelectContent className="bg-gray-800 border-gray-700">{SOURCE_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-gray-100">{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-gray-300 text-sm">名稱</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="給這個來源取個名字" className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div>
              {renderFormFields()}
              <div><Label className="text-gray-300 text-sm">重要程度: {formImportance[0]}</Label><Slider value={formImportance} onValueChange={setFormImportance} min={1} max={5} step={1} className="mt-1" /></div>
              <div><Label className="text-gray-300 text-sm">備註</Label><Input value={formNote} onChange={e => setFormNote(e.target.value)} className="mt-1 bg-gray-800 border-gray-700 text-gray-100" /></div>
              <Button onClick={handleSave} className="w-full bg-amber-600 hover:bg-amber-500 text-gray-900">儲存</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-2">
        {sources.length === 0 && <div className="text-center py-8 text-gray-500">還沒有資料來源，請點擊「新增來源」開始建立</div>}
        {sources.map(source => (
          <div key={source.id} className={`flex items-center justify-between p-3 rounded-lg border ${source.enabled ? 'bg-gray-800/60 border-gray-700/50' : 'bg-gray-900/30 border-gray-800/30 opacity-50'}`}>
            <div className="flex items-center gap-3">
              <Switch checked={source.enabled} onCheckedChange={() => toggleEnabled(source.id)} className="data-[state=checked]:bg-amber-600" />
              <div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${sourceTypeColor(source.type)}`}>{sourceTypeName(source.type)}</Badge>
                  <span className="text-sm font-bold text-gray-200">{source.name}</span>
                  <span className="text-xs text-gray-500">Lv.{source.importance || 3}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{(source as any).note || ''}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(source)} className="text-gray-400 hover:text-amber-400 hover:bg-amber-900/20"><Edit2 className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(source.id)} className="text-gray-400 hover:text-red-400 hover:bg-red-900/20"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
