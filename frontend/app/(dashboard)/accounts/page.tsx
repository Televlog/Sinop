'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plaidApi, getErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/components/ui/Toaster';
import { Plus, RefreshCw, Trash2, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  CHECKING: '🏦', SAVINGS: '💰', CREDIT: '💳', INVESTMENT: '📈', LOAN: '🏛️', OTHER: '🔗',
};

export default function AccountsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const currency = user?.currency ?? 'USD';

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: plaidApi.accounts,
  });

  const syncMutation = useMutation({
    mutationFn: plaidApi.sync,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: `Synced ${data.message}` });
    },
    onError: (err) => toast({ title: 'Sync failed', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const disconnectMutation = useMutation({
    mutationFn: plaidApi.removeAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Account disconnected' });
    },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const getLinkToken = useMutation({
    mutationFn: plaidApi.linkToken,
    onSuccess: (data) => {
      toast({ title: 'Plaid Link', description: `Link token: ${data.linkToken.substring(0, 20)}... (integrate with Plaid Link SDK)` });
    },
    onError: () => toast({ title: 'Plaid not configured', description: 'Add PLAID_CLIENT_ID and PLAID_SECRET to backend .env', variant: 'destructive' }),
  });

  const accounts = data?.accounts ?? [];
  const totalBalance = accounts.reduce((sum: number, a: any) => sum + (a.balance ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500">Connected Accounts</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{accounts.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Total Balance</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totalBalance, currency)}</p>
        </div>
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Link Bank Account</p>
            <p className="text-xs text-gray-400 mt-1">Powered by Plaid</p>
          </div>
          <button
            onClick={() => getLinkToken.mutate()}
            disabled={getLinkToken.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {getLinkToken.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
            Connect
          </button>
        </div>
      </div>

      {/* Account Cards */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : accounts.length === 0 ? (
        <div className="card p-16 text-center">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No accounts connected</h3>
          <p className="text-gray-500 mb-4 max-w-sm mx-auto">
            Connect your bank account via Plaid to automatically sync transactions and track your balance.
          </p>
          <p className="text-xs text-gray-400 mb-4">Requires Plaid API keys in backend .env</p>
          <button onClick={() => getLinkToken.mutate()} className="btn-primary flex items-center gap-2 mx-auto">
            <Plus size={16} /> Connect Bank Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account: any) => (
            <div key={account.id} className="card card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-2xl">
                    {ACCOUNT_TYPE_ICONS[account.accountType] ?? '🏦'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{account.accountName}</h3>
                    <p className="text-xs text-gray-400">{account.institutionName}</p>
                  </div>
                </div>
                <span className={cn('badge', account.isManual ? 'badge-blue' : 'badge-green')}>
                  {account.isManual ? 'Manual' : 'Synced'}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(account.balance, account.currency)}</p>
                {account.availableBalance != null && (
                  <p className="text-xs text-gray-400 mt-0.5">Available: {formatCurrency(account.availableBalance, account.currency)}</p>
                )}
                {account.accountMask && (
                  <p className="text-xs text-gray-400 mt-0.5">••••{account.accountMask}</p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                <span>{account.accountType}</span>
                {account.lastSynced && <span>Synced {formatDate(account.lastSynced)}</span>}
              </div>

              <div className="flex gap-2">
                {!account.isManual && (
                  <button
                    onClick={() => syncMutation.mutate(account.id)}
                    disabled={syncMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 hover:bg-primary-100 transition-colors"
                  >
                    {syncMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Sync
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Disconnect ${account.accountName}?`)) disconnectMutation.mutate(account.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={12} />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">Bank-level Security</h4>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Sinop App uses Plaid to connect your accounts. We never store your bank credentials.
              All data is encrypted in transit and at rest.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
