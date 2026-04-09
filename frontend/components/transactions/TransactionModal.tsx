'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { transactionApi, getErrorMessage } from '@/lib/api';
import { Transaction, CATEGORY_ICONS } from '@/types';
import { toast } from '@/components/ui/Toaster';

const schema = z.object({
  description: z.string().min(1, 'Required'),
  amount: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  category: z.string().optional(),
  merchant: z.string().optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  transaction: Transaction | null;
  onClose: () => void;
}

export default function TransactionModal({ transaction, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!transaction;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: transaction ? {
      description: transaction.description,
      amount: Math.abs(transaction.amount).toString(),
      date: transaction.date.split('T')[0],
      type: transaction.type,
      category: transaction.category ?? '',
      merchant: transaction.merchant ?? '',
      notes: transaction.notes ?? '',
      isRecurring: transaction.isRecurring,
    } : {
      date: new Date().toISOString().split('T')[0],
      type: 'EXPENSE',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? transactionApi.update(transaction.id, data)
      : transactionApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast({ title: isEdit ? 'Transaction updated' : 'Transaction added' });
      onClose();
    },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      ...data,
      amount: parseFloat(data.amount),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select {...register('type')} className="input-field">
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <input {...register('description')} placeholder="e.g. Grocery shopping" className="input-field" />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input {...register('amount')} type="number" step="0.01" min="0" placeholder="0.00" className="input-field pl-7" />
              </div>
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input {...register('date')} type="date" className="input-field" />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select {...register('category')} className="input-field">
              <option value="">Auto-categorize</option>
              {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Merchant</label>
            <input {...register('merchant')} placeholder="e.g. Walmart" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea {...register('notes')} placeholder="Optional notes..." className="input-field resize-none" rows={2} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('isRecurring')} type="checkbox" className="rounded accent-primary-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Mark as recurring</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {(isSubmitting || mutation.isPending) && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
