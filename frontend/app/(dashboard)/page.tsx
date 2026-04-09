'use client';

import { useQuery } from '@tanstack/react-query';
import { transactionApi, subscriptionApi, budgetApi, reportApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/types';
import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const currency = user?.currency ?? 'USD';

  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: () => transactionApi.summary(),
  });

  const { data: trendsData } = useQuery({
    queryKey: ['trends'],
    queryFn: () => reportApi.trends(6),
  });

  const { data: txData } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => transactionApi.list({ limit: '8', sortBy: 'date', sortOrder: 'desc' }),
  });

  const { data: subData } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => subscriptionApi.list({ status: 'ACTIVE' }),
  });

  const { data: budgetData } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetApi.list(),
  });

  const { data: insightsData } = useQuery({
    queryKey: ['insights'],
    queryFn: () => reportApi.insights(),
  });

  const s = summary;
  const trends = trendsData?.trends ?? [];
  const transactions = txData?.transactions ?? [];
  const subscriptions = subData?.subscriptions ?? [];
  const budgets = budgetData?.budgets ?? [];
  const insights = insightsData?.insights ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good {getGreeting()}, {user?.name?.split(' ')[0] ?? 'there'} 👋
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Here's your financial overview for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          value={formatCurrency(s?.totalIncome ?? 0, currency)}
          change="+12.5%"
          positive
          icon="💰"
          color="text-green-600"
          bgColor="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(s?.totalExpenses ?? 0, currency)}
          change="-3.2%"
          positive
          icon="💸"
          color="text-red-600"
          bgColor="bg-red-50 dark:bg-red-900/20"
        />
        <StatCard
          title="Net Savings"
          value={formatCurrency(s?.netSavings ?? 0, currency)}
          change={`${s?.savingsRate ?? 0}% rate`}
          positive={(s?.netSavings ?? 0) >= 0}
          icon="📈"
          color="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          title="Subscriptions"
          value={formatCurrency(subData?.summary?.monthlyTotal ?? 0, currency)}
          change={`${subData?.summary?.total ?? 0} active`}
          positive={false}
          icon="🔄"
          color="text-purple-600"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Income vs Expenses Trend */}
        <div className="xl:col-span-2 card p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trends} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
              <Legend />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" name="Income" dot={false} />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" name="Expenses" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Spending by Category */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Spending by Category</h3>
          {s?.byCategory?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={s.byCategory.slice(0, 6)}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {s.byCategory.slice(0, 6).map((entry: any, i: number) => (
                      <Cell key={i} fill={CATEGORY_COLORS[entry.category] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {s.byCategory.slice(0, 4).map((c: any) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{CATEGORY_ICONS[c.category] ?? '💰'}</span>
                      <span className="text-gray-600 dark:text-gray-400 truncate max-w-[100px]">{c.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(c.amount, currency, true)}</span>
                      <span className="text-gray-400 text-xs">{c.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <p className="text-sm">No spending data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="xl:col-span-2 card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
            <a href="/transactions" className="text-sm text-primary-600 hover:text-primary-700">View all</a>
          </div>
          <div className="space-y-3">
            {transactions.length > 0 ? transactions.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg">
                    {CATEGORY_ICONS[t.category] ?? '💳'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.description.substring(0, 30)}</p>
                    <p className="text-xs text-gray-400">{formatDate(t.date)} · {t.category ?? 'Uncategorized'}</p>
                  </div>
                </div>
                <span className={cn('text-sm font-semibold', t.type === 'INCOME' ? 'text-green-600' : 'text-red-600')}>
                  {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(Math.abs(t.amount), currency)}
                </span>
              </div>
            )) : (
              <p className="text-sm text-gray-400 text-center py-8">No transactions yet. Add one to get started!</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-primary-600" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Insights</h3>
              </div>
              <div className="space-y-3">
                {insights.slice(0, 2).map((insight: any) => (
                  <div key={insight.id} className={cn('p-3 rounded-xl border text-xs',
                    insight.severity === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400' :
                    insight.severity === 'WARNING' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/10 dark:border-yellow-800 dark:text-yellow-400' :
                    insight.severity === 'POSITIVE' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/10 dark:border-green-800 dark:text-green-400' :
                    'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/10 dark:border-blue-800 dark:text-blue-400'
                  )}>
                    <p className="font-semibold">{insight.title}</p>
                    <p className="mt-0.5 opacity-80">{insight.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Subscriptions */}
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Billing</h3>
              <a href="/subscriptions" className="text-xs text-primary-600">View all</a>
            </div>
            {subscriptions.filter((s: any) => {
              const days = (new Date(s.nextBillingDate).getTime() - Date.now()) / (1000*60*60*24);
              return days >= 0 && days <= 30;
            }).slice(0, 4).map((sub: any) => (
              <div key={sub.id} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{sub.name}</p>
                  <p className="text-xs text-gray-400">{formatDate(sub.nextBillingDate)}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(sub.amount, currency)}</span>
              </div>
            ))}
            {subscriptions.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No active subscriptions</p>}
          </div>

          {/* Budget Summary */}
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Budget Status</h3>
              <a href="/budgets" className="text-xs text-primary-600">Manage</a>
            </div>
            {budgets.slice(0, 4).map((b: any) => (
              <div key={b.id} className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>{b.category}</span>
                  <span className={b.isOverBudget ? 'text-red-600 font-semibold' : ''}>{b.percentage}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', b.isOverBudget ? 'bg-red-500' : b.percentage >= 80 ? 'bg-yellow-500' : 'bg-indigo-500')}
                    style={{ width: `${Math.min(100, b.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
            {budgets.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No budgets set</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, positive, icon, color, bgColor }: {
  title: string; value: string; change: string; positive: boolean;
  icon: string; color: string; bgColor: string;
}) {
  return (
    <div className="card card-hover p-5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl', bgColor)}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3">
        {positive ? <ArrowUpRight size={14} className="text-green-500" /> : <ArrowDownRight size={14} className="text-red-500" />}
        <span className={cn('text-xs font-medium', positive ? 'text-green-600' : 'text-red-600')}>{change}</span>
        <span className="text-xs text-gray-400">vs last month</span>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
