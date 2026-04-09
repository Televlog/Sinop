'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, getErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { Users, ArrowLeftRight, BarChart3, Search, Trash2, Shield, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions'>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.dashboard });
  const { data: analytics } = useQuery({ queryKey: ['admin-analytics'], queryFn: adminApi.analytics });
  const { data: userData } = useQuery({
    queryKey: ['admin-users', userPage, userSearch],
    queryFn: () => adminApi.users({ page: userPage, limit: 20, search: userSearch || undefined }),
    enabled: activeTab === 'users',
  });
  const { data: txData } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: () => adminApi.transactions({ limit: 30 }),
    enabled: activeTab === 'transactions',
  });

  const deleteUser = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast({ title: 'User deleted' }); },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateRole(id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast({ title: 'Role updated' }); },
  });

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        {(['overview', 'users', 'transactions'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-5 py-2 rounded-xl text-sm font-medium capitalize transition-colors',
              activeTab === tab ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            )}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: stats?.stats.totalUsers ?? 0, icon: Users, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
              { label: 'Active (30d)', value: stats?.stats.activeUsers ?? 0, icon: UserCheck, color: 'bg-green-50 dark:bg-green-900/20 text-green-600' },
              { label: 'Transactions', value: stats?.stats.totalTransactions ?? 0, icon: ArrowLeftRight, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' },
              { label: 'Subscriptions', value: stats?.stats.totalSubscriptions ?? 0, icon: BarChart3, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value.toLocaleString()}</p>
                  </div>
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
                    <Icon size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Growth Chart */}
          {analytics?.analytics && (
            <div className="card p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Platform Growth (6 months)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.analytics} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="newUsers" fill="#6366f1" name="New Users" radius={[4,4,0,0]} />
                  <Bar dataKey="newTransactions" fill="#10b981" name="Transactions" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Users */}
          {stats?.recentUsers && (
            <div className="card p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Recently Joined Users</h3>
              <div className="space-y-3">
                {stats.recentUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {(u.name ?? u.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn('badge', u.role === 'ADMIN' ? 'badge-purple' : 'badge-blue')}>{u.role}</span>
                      <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(u.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={userSearch}
              onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
              placeholder="Search users..."
              className="input-field pl-9 py-2 text-sm"
            />
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Transactions</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {userData?.users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {(u.name ?? u.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        onChange={e => updateRole.mutate({ id: u.id, role: e.target.value })}
                        className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{u._count?.transactions ?? 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(u.createdAt)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => { if (confirm(`Delete user ${u.email}?`)) deleteUser.mutate(u.id); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {userData?.pagination && userData.pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <p className="text-sm text-gray-500">Total: {userData.pagination.total} users</p>
                <div className="flex gap-2">
                  <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40"><ChevronLeft size={16} /></button>
                  <span className="text-sm text-gray-700 dark:text-gray-300 px-2">{userPage}</span>
                  <button onClick={() => setUserPage(p => p + 1)} disabled={userPage >= userData.pagination.pages} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {txData?.transactions?.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4">
                    <p className="text-xs text-gray-500">{t.user?.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 dark:text-white">{t.description.substring(0, 35)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500">{t.category ?? '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500">{formatDate(t.date)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn('text-sm font-semibold', t.type === 'INCOME' ? 'text-green-600' : 'text-red-600')}>
                      {t.type === 'INCOME' ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
