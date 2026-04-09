'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionApi, getErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { CATEGORY_ICONS, CATEGORY_COLORS, Transaction } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/hooks/useToast';
import { Plus, Search, Filter, Trash2, Edit2, Receipt, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import TransactionModal from '@/components/transactions/TransactionModal';
import ReceiptModal from '@/components/transactions/ReceiptModal';

export default function TransactionsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const currency = user?.currency ?? 'USD';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, search, category, type],
    queryFn: () => transactionApi.list({ page, limit: 20, search: search || undefined, category: category || undefined, type: type || undefined }),
    placeholderData: prev => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: transactionApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      toast({ title: 'Transaction deleted' });
    },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const transactions: Transaction[] = data?.transactions ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search transactions..."
              className="input-field pl-9 py-2 text-sm"
            />
          </div>
          <select
            value={type}
            onChange={e => { setType(e.target.value); setPage(1); }}
            className="input-field w-auto py-2 text-sm"
          >
            <option value="">All Types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
          </select>
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="input-field w-auto py-2 text-sm"
          >
            <option value="">All Categories</option>
            {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setEditTx(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 mb-3">No transactions found</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">Add your first transaction</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <th className="px-6 py-3">Transaction</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-base flex-shrink-0">
                          {CATEGORY_ICONS[t.category ?? ''] ?? '💳'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{t.description}</p>
                          {t.merchant && <p className="text-xs text-gray-400">{t.merchant}</p>}
                          {t.isRecurring && <span className="badge badge-blue mt-0.5">Recurring</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t.category ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(t.date)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('badge',
                        t.type === 'INCOME' ? 'badge-green' :
                        t.type === 'EXPENSE' ? 'badge-red' : 'badge-blue'
                      )}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn('text-sm font-semibold', t.type === 'INCOME' ? 'text-green-600' : 'text-red-600')}>
                        {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(Math.abs(t.amount), currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setReceiptTx(t)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                          title="Upload receipt"
                        >
                          <Receipt size={14} />
                        </button>
                        <button
                          onClick={() => { setEditTx(t); setShowModal(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this transaction?')) deleteMutation.mutate(t.id);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">{page} / {pagination.pages}</span>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <TransactionModal
          transaction={editTx}
          onClose={() => { setShowModal(false); setEditTx(null); }}
        />
      )}
      {receiptTx && (
        <ReceiptModal transaction={receiptTx} onClose={() => setReceiptTx(null)} />
      )}
    </div>
  );
}
