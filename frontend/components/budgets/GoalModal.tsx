'use client';

import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { budgetApi, getErrorMessage } from '@/lib/api';
import { SavingsGoal } from '@/types';
import { toast } from '@/components/ui/Toaster';

interface Props { goal: SavingsGoal | null; onClose: () => void; }

export default function GoalModal({ goal, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!goal;

  const { register, handleSubmit } = useForm({
    defaultValues: goal ? {
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      targetDate: goal.targetDate?.split('T')[0] ?? '',
      notes: '',
    } : {},
  });

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? budgetApi.updateGoal(goal.id, data)
      : budgetApi.createGoal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      toast({ title: isEdit ? 'Goal updated' : 'Goal created' });
      onClose();
    },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const onSubmit = (data: any) => {
    mutation.mutate({
      ...data,
      targetAmount: parseFloat(data.targetAmount),
      currentAmount: data.currentAmount ? parseFloat(data.currentAmount) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Goal' : 'New Goal'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Name *</label>
            <input {...register('name', { required: true })} placeholder="e.g. Emergency Fund" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Amount *</label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input {...register('targetAmount', { required: true })} type="number" step="0.01" min="0" className="input-field pl-7" placeholder="10000.00" />
            </div>
          </div>
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Amount</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input {...register('currentAmount')} type="number" step="0.01" min="0" className="input-field pl-7" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Date</label>
            <input {...register('targetDate')} type="date" className="input-field" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? 'Save' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
