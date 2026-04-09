'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi, getErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate, calculateBillingFrequencyMonthly, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/hooks/useToast';
import { Plus, Pause, X, ExternalLink, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Subscription } from '@/types';
import SubscriptionModal from '@/components/subscriptions/SubscriptionModal';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'badge-green',
  CANCELLED: 'badge-red',
  PAUSED: 'badge-yellow',
  TRIAL: 'badge-blue',
};

export default function SubscriptionsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const currency = user?.currency ?? 'USD';

  const [filter, setFilter] = useState('ACTIVE');
  const [showModal, setShowModal] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', filter],
    queryFn: () => subscriptionApi.list({ status: filter || undefined }),
  });

  const { data: upcomingData } = useQuery({
    queryKey: ['subscriptions-upcoming'],
    queryFn: () => subscriptionApi.upcoming(30),
  });

  const { data: detectData, isLoading: isDetecting } = useQuery({
    queryKey: ['subscriptions-detect'],
    queryFn: subscriptionApi.detect,
    enabled: false,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => subscriptionApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: 'Subscription cancelled' });
    },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: subscriptionApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: 'Subscription removed' });
    },
  });

  const subscriptions: Subscription[] = data?.subscriptions ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active', value: summary?.total ?? 0, sub: 'subscriptions', icon: '🔄' },
          { label: 'Monthly Cost', value: formatCurrency(summary?.monthlyTotal ?? 0, currency), sub: 'per month', icon: '💳' },
          { label: 'Yearly Cost', value: formatCurrency(summary?.yearlyTotal ?? 0, currency), sub: 'per year', icon: '📅' },
          { label: 'Due Soon', value: summary?.upcomingIn7Days ?? 0, sub: 'in 7 days', icon: '⏰' },
        ].map(stat => (
          <div key={stat.label} className="card p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
              </div>
              <span className="text-2xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Alert */}
      {(upcomingData?.upcoming?.length ?? 0) > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
            <AlertCircle size={16} />
            <span className="font-medium text-sm">Upcoming billing in next 7 days</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingData?.upcoming.filter((s: any) => {
              const days = (new Date(s.nextBillingDate).getTime() - Date.now()) / (1000*60*60*24);
              return days <= 7;
            }).map((s: any) => (
              <span key={s.id} className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs px-3 py-1 rounded-full">
                {s.name} · {formatCurrency(s.amount, currency)} on {formatDate(s.nextBillingDate, 'MMM d')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {['', 'ACTIVE', 'CANCELLED', 'PAUSED'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn('px-4 py-1.5 rounded-xl text-sm font-medium transition-colors',
                filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              )}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Subscription
          </button>
        </div>
      </div>

      {/* Subscription Cards */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : subscriptions.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-gray-500 dark:text-gray-400 mb-4">No subscriptions found</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Add your first subscription</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subscriptions.map(sub => {
            const monthlyEquiv = calculateBillingFrequencyMonthly(sub.billingCycle, sub.amount);
            const daysUntil = Math.ceil((new Date(sub.nextBillingDate).getTime() - Date.now()) / (1000*60*60*24));

            return (
              <div key={sub.id} className="card card-hover p-5 relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
                      style={{ backgroundColor: sub.color ?? '#6366f1' }}
                    >
                      {sub.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{sub.name}</h3>
                      <p className="text-xs text-gray-400">{sub.category ?? 'Subscription'}</p>
                    </div>
                  </div>
                  <span className={cn('badge', STATUS_COLORS[sub.status] ?? 'badge-blue')}>
                    {sub.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(sub.amount, currency)}</p>
                    <p className="text-xs text-gray-400">{sub.billingCycle.toLowerCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(monthlyEquiv, currency)}/mo</p>
                    <p className="text-xs text-gray-400">equiv.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span>Next: {formatDate(sub.nextBillingDate)}</span>
                  {daysUntil >= 0 && daysUntil <= 7 && (
                    <span className="text-amber-600 font-medium">in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  {sub.status === 'ACTIVE' && (
                    <button
                      onClick={() => { if (confirm(`Cancel ${sub.name}?`)) cancelMutation.mutate(sub.id); }}
                      className="flex-1 py-2 text-xs font-medium rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => { setEditSub(sub); setShowModal(true); }}
                    className="flex-1 py-2 text-xs font-medium rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                  >
                    Edit
                  </button>
                  {sub.url && (
                    <a href={sub.url} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 transition-colors">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <SubscriptionModal
          subscription={editSub}
          onClose={() => { setShowModal(false); setEditSub(null); }}
        />
      )}
    </div>
  );
}
