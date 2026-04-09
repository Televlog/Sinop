'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { subscriptionApi, getErrorMessage } from '@/lib/api';
import { Subscription } from '@/types';
import { toast } from '@/components/ui/Toaster';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  amount: z.string().min(1, 'Required'),
  billingCycle: z.enum(['DAILY','WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','SEMIANNUAL','YEARLY']),
  nextBillingDate: z.string().min(1, 'Required'),
  category: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  color: z.string().optional(),
  notes: z.string().optional(),
  reminderDays: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props { subscription: Subscription | null; onClose: () => void; }

const PRESET_COLORS = ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4'];

export default function SubscriptionModal({ subscription, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!subscription;

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: subscription ? {
      name: subscription.name,
      amount: subscription.amount.toString(),
      billingCycle: subscription.billingCycle,
      nextBillingDate: subscription.nextBillingDate.split('T')[0],
      category: subscription.category ?? '',
      url: subscription.url ?? '',
      color: subscription.color ?? '#6366f1',
      notes: subscription.notes ?? '',
      reminderDays: subscription.reminderDays.toString(),
    } : {
      billingCycle: 'MONTHLY',
      nextBillingDate: new Date().toISOString().split('T')[0],
      color: '#6366f1',
      reminderDays: '3',
    },
  });

  const selectedColor = watch('color');

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? subscriptionApi.update(subscription.id, data)
      : subscriptionApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: isEdit ? 'Subscription updated' : 'Subscription added' });
      onClose();
    },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate({ ...data, amount: parseFloat(data.amount), reminderDays: parseInt(data.reminderDays ?? '3') });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md my-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Subscription' : 'Add Subscription'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input {...register('name')} placeholder="e.g. Netflix, Spotify" className="input-field" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing Cycle *</label>
              <select {...register('billingCycle')} className="input-field">
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
                <option value="WEEKLY">Weekly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="BIWEEKLY">Bi-weekly</option>
                <option value="SEMIANNUAL">Semi-annual</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Billing Date *</label>
            <input {...register('nextBillingDate')} type="date" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select {...register('category')} className="input-field">
              <option value="">Select category</option>
              {['Entertainment', 'Music', 'Fitness', 'Education', 'Productivity', 'Cloud Storage', 'Food', 'Shopping', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website URL</label>
            <input {...register('url')} type="url" placeholder="https://..." className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reminder (days before)</label>
            <input {...register('reminderDays')} type="number" min="0" max="30" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setValue('color', c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === c ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea {...register('notes')} className="input-field resize-none" rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? 'Save' : 'Add Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
