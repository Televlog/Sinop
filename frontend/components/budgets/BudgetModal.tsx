'use client';

import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { budgetApi, getErrorMessage } from '@/lib/api';
import { Budget, CATEGORY_ICONS } from '@/types';
import { toast } from '@/components/ui/Toaster';

interface Props { budget: Budget | null; month: number; year: number; onClose: () => void; }

export default function BudgetModal({ budget, month, year, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!budget;

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: budget ? {
      category: budget.category,
      amount: budget.amount.toString(),
      alertThreshold: (budget.alertThreshold * 100).toString(),
    } : {
      alertThreshold: '80',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? budgetApi.update(budget.id, data)
      : budgetApi.create({ ...data, month, year }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast({ title: isEdit ? 'Budget updated' : 'Budget created' });
      onClose();
    },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const onSubmit = (data: any) => {
    mutation.mutate({
      ...data,
      amount: parseFloat(data.amount),
      alertThreshold: parseFloat(data.alertThreshold) / 100,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Budget' : 'Create Budget'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
              <select {...register('category', { required: true })} className="input-field">
                <option value="">Select category</option>
                {Object.entries(CATEGORY_ICONS).map(([c, icon]) => <option key={c} value={c}>{icon} {c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget Amount *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input {...register('amount', { required: true })} type="number" step="0.01" min="0" className="input-field pl-7" placeholder="500.00" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alert threshold ({'{'}register.value{'}'}%)</label>
            <input {...register('alertThreshold')} type="range" min="50" max="100" step="5" className="w-full accent-primary-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>50%</span><span>80%</span><span>100%</span>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
