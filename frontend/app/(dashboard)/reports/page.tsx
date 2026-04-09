'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { reportApi, downloadBlob, getErrorMessage } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/hooks/useToast';
import { Download, FileText, Table, Sparkles, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_ICONS, AIInsight } from '@/types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const currency = user?.currency ?? 'USD';

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ['report-monthly', month, year],
    queryFn: () => reportApi.monthly({ month, year }),
  });

  const { data: trendsData } = useQuery({
    queryKey: ['trends-6'],
    queryFn: () => reportApi.trends(6),
  });

  const { data: insightsData } = useQuery({
    queryKey: ['insights'],
    queryFn: reportApi.insights,
  });

  const generateMutation = useMutation({
    mutationFn: reportApi.generateInsights,
    onSuccess: () => {
      toast({ title: 'AI insights generated!' });
    },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      const blob = await reportApi.exportPDF({ month, year });
      downloadBlob(blob, `fintrack-report-${year}-${month}.pdf`);
    } catch (err) {
      toast({ title: 'Export failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally { setExporting(null); }
  };

  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      const blob = await reportApi.exportExcel({ month, year });
      downloadBlob(blob, `fintrack-${year}-${month}.xlsx`);
    } catch (err) {
      toast({ title: 'Export failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally { setExporting(null); }
  };

  const r = report;
  const trends = trendsData?.trends ?? [];
  const insights: AIInsight[] = insightsData?.insights ?? [];

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' }),
  }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3">
          <select value={month} onChange={e => setMonth(+e.target.value)} className="input-field w-auto py-2 text-sm">
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)} className="input-field w-auto py-2 text-sm">
            {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Generate Insights
          </button>
          <button onClick={handleExportPDF} disabled={exporting === 'pdf'} className="btn-secondary flex items-center gap-2 text-sm">
            {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            PDF
          </button>
          <button onClick={handleExportExcel} disabled={exporting === 'excel'} className="btn-secondary flex items-center gap-2 text-sm">
            {exporting === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <Table size={14} />}
            Excel
          </button>
        </div>
      </div>

      {/* Summary */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : r && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Income', value: r.income, icon: TrendingUp, color: 'text-green-600', change: `${r.comparison.incomeChange}%` },
              { label: 'Expenses', value: r.expenses, icon: TrendingDown, color: 'text-red-600', change: `${r.comparison.expensesChange}%` },
              { label: 'Net Savings', value: r.netSavings, icon: null, color: r.netSavings >= 0 ? 'text-blue-600' : 'text-red-600', change: null },
              { label: 'Savings Rate', value: null, icon: null, color: r.savingsRate >= 20 ? 'text-green-600' : 'text-yellow-600', change: null },
            ].map((stat, i) => (
              <div key={i} className="card p-5">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className={cn('text-2xl font-bold mt-1', stat.color)}>
                  {i === 3 ? `${r.savingsRate}%` : formatCurrency(stat.value ?? 0, currency)}
                </p>
                {stat.change && (
                  <p className="text-xs text-gray-400 mt-1">
                    {parseFloat(stat.change) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(stat.change))}% vs last month
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Spending Trend */}
            <div className="xl:col-span-2 card p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">6-Month Spending Trend</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={trends} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" name="Income" radius={[4,4,0,0]} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Breakdown */}
            <div className="card p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Category Breakdown</h3>
              {r.categoryBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={r.categoryBreakdown.slice(0, 8)} cx="50%" cy="50%" outerRadius={65} dataKey="amount" nameKey="category">
                        {r.categoryBreakdown.slice(0, 8).map((e: any, i: number) => (
                          <Cell key={i} fill={CATEGORY_COLORS[e.category] ?? '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {r.categoryBreakdown.slice(0, 5).map((c: any) => (
                      <div key={c.category} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c.category] ?? '#94a3b8' }} />
                          <span className="text-gray-600 dark:text-gray-400">{c.category}</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(c.amount, currency)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-sm text-gray-400 text-center py-12">No expense data</p>}
            </div>
          </div>

          {/* Daily Spending Line */}
          {r.dailySpending.length > 0 && (
            <div className="card p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Daily Spending</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={r.dailySpending} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, currency)} labelFormatter={l => `Date: ${l}`} />
                  <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} dot={false} name="Spending" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-primary-600" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">AI Financial Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map(insight => (
              <div key={insight.id} className={cn('p-4 rounded-xl border', {
                'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800': insight.severity === 'CRITICAL',
                'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800': insight.severity === 'WARNING',
                'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800': insight.severity === 'POSITIVE',
                'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800': insight.severity === 'INFO',
              })}>
                <p className={cn('font-semibold text-sm', {
                  'text-red-700 dark:text-red-400': insight.severity === 'CRITICAL',
                  'text-yellow-700 dark:text-yellow-400': insight.severity === 'WARNING',
                  'text-green-700 dark:text-green-400': insight.severity === 'POSITIVE',
                  'text-blue-700 dark:text-blue-400': insight.severity === 'INFO',
                })}>
                  {insight.title}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
