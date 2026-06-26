// ============================================================
// V19.0 PHASE G: Admin Payment Center
// 管理員付款管理中心
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { exportPaymentCSV } from '@/utils/paymentModel';
import { submitRefund } from '@/payment/refundManager';
import { loadJson } from '@/repositories/businessDataStorage';
import {
  ArrowLeft, CreditCard, Users, DollarSign,
  RefreshCw, Download, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Search
} from 'lucide-react';

interface PaymentView {
  id: string;
  userId: string;
  plan: string;
  amount: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  provider: string;
}

interface SubscriptionView {
  id: string;
  userId: string;
  plan: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  autoRenew: boolean;
}

export default function AdminPaymentCenterPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentView[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionView[]>([]);
  const [tab, setTab] = useState<'overview' | 'payments' | 'subscriptions' | 'refunds'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRefund, setExpandedRefund] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPayments: 0,
    activeSubs: 0,
    pendingRefunds: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load payments
    const paymentsRaw = loadJson<PaymentView[]>('lottery-v18-payments', []);
    setPayments(paymentsRaw);

    // Load subscriptions
    const subsRaw = loadJson<SubscriptionView[]>('lottery-v18-subscriptions', []);
    setSubscriptions(subsRaw);

    // Calculate stats
    const completed = paymentsRaw.filter(p => p.status === 'completed');
    const revenue = completed.reduce((sum, p) => sum + p.amount, 0);
    const active = subsRaw.filter(s => s.status === 'active').length;
    const pendingRef = paymentsRaw.filter(p => p.status === 'refunded').length;

    setStats({
      totalRevenue: revenue,
      totalPayments: paymentsRaw.length,
      activeSubs: active,
      pendingRefunds: pendingRef,
    });
  };

  const handleRefund = async (paymentId: string) => {
    if (!refundReason.trim()) return;
    const result = await submitRefund(paymentId, refundReason);
    if (result.success) {
      setRefundReason('');
      setExpandedRefund(null);
      loadData();
    }
  };

  const handleExport = () => {
    const csv = exportPaymentCSV('admin');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPayments = payments.filter(p =>
    p.userId.includes(searchTerm) || p.id.includes(searchTerm)
  );

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string; icon: typeof CheckCircle2 }> = {
      completed: { color: 'border-emerald-700/40 text-emerald-400', label: '已完成', icon: CheckCircle2 },
      pending: { color: 'border-amber-700/40 text-amber-400', label: '待付款', icon: Clock },
      failed: { color: 'border-red-700/40 text-red-400', label: '失敗', icon: XCircle },
      refunded: { color: 'border-gray-600 text-gray-400', label: '已退款', icon: RefreshCw },
      active: { color: 'border-emerald-700/40 text-emerald-400', label: '生效中', icon: CheckCircle2 },
      canceled: { color: 'border-gray-600 text-gray-400', label: '已取消', icon: XCircle },
    };
    const config = map[status] || map.pending;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`text-[10px] ${config.color}`}>
        <Icon className="w-2.5 h-2.5 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin')} className="p-1.5 rounded-lg hover:bg-gray-800/50 transition">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-100">付款管理中心</h1>
            <p className="text-xs text-gray-500">查看付款紀錄與訂閱狀態</p>
          </div>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm" className="border-gray-700 text-gray-400">
          <Download className="w-3.5 h-3.5 mr-1" />
          匯出 CSV
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-400">總營收</span>
            </div>
            <p className="text-xl font-bold text-emerald-400">NT${stats.totalRevenue}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-gray-400">付款筆數</span>
            </div>
            <p className="text-xl font-bold text-amber-400">{stats.totalPayments}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">活躍訂閱</span>
            </div>
            <p className="text-xl font-bold text-purple-400">{stats.activeSubs}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">退款筆數</span>
            </div>
            <p className="text-xl font-bold text-gray-400">{stats.pendingRefunds}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab */}
      <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
        {(['overview', 'payments', 'subscriptions', 'refunds'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition ${
              tab === t ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'overview' ? '概覽' : t === 'payments' ? '付款紀錄' : t === 'subscriptions' ? '訂閱' : '退款'}
          </button>
        ))}
      </div>

      {/* 搜尋 */}
      {tab !== 'overview' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="搜尋用戶或交易編號..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      )}

      {/* 內容 */}
      {tab === 'overview' && (
        <div className="space-y-3">
          <Card className="border-gray-800/50 bg-gray-900/50">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400 mb-2">方案分布</p>
              <div className="space-y-2">
                {(['monthly', 'quarterly', 'yearly'] as const).map(plan => {
                  const count = subscriptions.filter(s => s.plan === plan).length;
                  const total = subscriptions.length || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={plan} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-12">
                        {plan === 'monthly' ? '月費' : plan === 'quarterly' ? '季費' : '年費'}
                      </span>
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-2">
          {filteredPayments.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">無付款紀錄</p>
          ) : (
            filteredPayments.map(p => (
              <Card key={p.id} className="border-gray-800/50 bg-gray-900/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">{p.id.slice(0, 16)}...</span>
                        {statusBadge(p.status)}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">{p.userId}</p>
                    </div>
                    <span className="text-sm font-bold text-amber-400">NT${p.amount}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'subscriptions' && (
        <div className="space-y-2">
          {subscriptions.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">無訂閱紀錄</p>
          ) : (
            subscriptions.map(s => (
              <Card key={s.id} className="border-gray-800/50 bg-gray-900/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-300">{s.userId.slice(0, 20)}</span>
                        {statusBadge(s.status)}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {s.plan === 'monthly' ? '月費' : s.plan === 'quarterly' ? '季費' : '年費'}
                        {' '}· 到期 {s.expiresAt.slice(0, 10)}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${s.autoRenew ? 'border-emerald-700/40 text-emerald-400' : 'border-gray-600 text-gray-400'}`}>
                      {s.autoRenew ? '自動續約' : '手動續約'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'refunds' && (
        <div className="space-y-2">
          {payments.filter(p => p.status === 'completed').length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">無可退款紀錄</p>
          ) : (
            payments
              .filter(p => p.status === 'completed')
              .map(p => (
                <Card key={p.id} className="border-gray-800/50 bg-gray-900/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono text-gray-400">{p.id.slice(0, 16)}...</p>
                        <p className="text-[10px] text-gray-500">{p.userId}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedRefund(expandedRefund === p.id ? null : p.id)}
                        className="border-red-800/40 text-red-400 hover:bg-red-950/30"
                      >
                        {expandedRefund === p.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        退款
                      </Button>
                    </div>
                    {expandedRefund === p.id && (
                      <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
                        <textarea
                          placeholder="請輸入退款原因..."
                          value={refundReason}
                          onChange={e => setRefundReason(e.target.value)}
                          className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
                          rows={2}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleRefund(p.id)}
                          className="bg-red-600 hover:bg-red-500 text-white text-xs"
                        >
                          確認退款 NT${p.amount}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      )}
    </div>
  );
}
