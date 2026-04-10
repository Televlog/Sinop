'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetApi, getErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate, cn, progressColor, percentageColor } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/hooks/useToast';
import { Plus, Target, Trash2, Edit2, TrendingUp } from 'lucide-react';
import { Budget, SavingsGoal } from '@/types';
import BudgetModal from '@/components/budgets/BudgetModal';
import GoalModal from '@/components/budgets/GoalModal';

export default function BudgetsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const currency = user?.currency ?? 'USD';

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'budgets' | 'goals'>('budgets');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null);

  const { data: budgetData, isLoading } = useQuery({
    queryKey: ['budgets', month, year],
    queryFn: () => budgetApi.list({ month, year }),
  });

  const { data: goalData } = useQuery({
    queryKey: ['goals'],
    queryFn: budgetApi.goals,
  });

  const deleteBudget = useMutation({
    mutationFn: budgetApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); toast({ title: 'Budget deleted' }); },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const deleteGoal = useMutation({
    mutationFn: budgetApi.deleteGoal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast({ title: 'Goal deleted' }); },
  });

  const budgets: Budget[] = budgetData?.budgets ?? [];
  const goals: SavingsGoal[] = goalData?.goals ?? [];
  const summary = budgetData?.summary;

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' }),
  }));

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('budgets')} className={cn('px-5 py-2 rounded-xl text-sm font-medium transition-colors', activeTab === 'budgets' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400')}>Monthly Budgets</button>
        <button onClick={() => setActiveTab('goals')} className={cn('px-5 py-2 rounded-xl text-sm font-medium transition-colors', activeTab === 'goals' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400')}>Savings Goals</button>
      </div>

      {activeTab === 'budgets' && (
        <>
          {/* Month Picker & Summary */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-3">
              <select value={month} onChange={e => setMonth(+e.target.value)} className="input-field w-auto py-2 text-sm">
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select value={year} onChange={e => setYear(+e.target.value)} className="input-field w-auto py-2 text-sm">
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={() => { setEditBudget(null); setShowBudgetModal(true); }} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Add Budget
            </button>
          </div>

          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5">
                <p className="text-sm text-gray-500">Total Budgeted</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.totalBudget, currency)}</p>
              </div>
              <div className="card p-5">
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.totalSpent, currency)}</p>
              </div>
              <div className="card p-5">
                <p className="text-sm text-gray-500">Remaining</p>
                <p className={cn('text-2xl font-bold mt-1', summary.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(summary.totalRemaining, currency)}
                </p>
                <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', progressColor(summary.overallPercentage))} style={{ width: `${Math.min(100, summary.overallPercentage)}%` }} />
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : budgets.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-5xl mb-4">📊</p>
              <p className="text-gray-500 mb-4">No budgets for this month</p>
              <button onClick={() => setShowBudgetModal(true)} className="btn-primary">Create your first budget</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgets.map(b => (
                <div key={b.id} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{b.icon ?? '💰'}</span>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{b.category}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditBudget(b); setShowBudgetModal(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => { if (confirm('Delete this budget?')) deleteBudget.mutate(b.id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Spent: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(b.spent, currency)}</span></span>
                    <span className={cn('font-semibold', percentageColor(b.percentage))}>{b.percentage}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                    <div className={cn('h-full rounded-full transition-all duration-500', progressColor(b.percentage))} style={{ width: `${Math.min(100, b.percentage)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Budget: {formatCurrency(b.amount, currency)}</span>
                    <span>{b.isOverBudget ? <span className="text-red-600 font-medium">Over by {formatCurrency(Math.abs(b.remaining), currency)}</span> : `${formatCurrency(b.remaining, currency)} left`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'goals' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => { setEditGoal(null); setShowGoalModal(true); }} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> New Goal
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-5xl mb-4">🎯</p>
              <p className="text-gray-500 mb-4">No savings goals yet</p>
              <button onClick={() => setShowGoalModal(true)} className="btn-primary">Create your first goal</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {goals.map(g => (
                <div key={g.id} className="card p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{g.name}</h3>
                      {g.targetDate && <p className="text-xs text-gray-400 mt-0.5">Target: {formatDate(g.targetDate, 'MMM d, yyyy')}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditGoal(g); setShowGoalModal(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => { if (confirm('Delete this goal?')) deleteGoal.mutate(g.id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  <div className="text-center mb-4">
                    <div className="relative w-24 h-24 mx-auto">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke={g.isCompleted ? '#10b981' : '#6366f1'} strokeWidth="2.5"
                          strokeDasharray={`${g.percentage} ${100 - g.percentage}`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">{g.percentage}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Saved</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(g.currentAmount, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Target</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(g.targetAmount, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Remaining</span>
                      <span className={cn('font-medium', g.isCompleted ? 'text-green-600' : 'text-primary-600')}>{g.isCompleted ? 'Completed! 🎉' : formatCurrency(g.remaining, currency)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showBudgetModal && <BudgetModal budget={editBudget} month={month} year={year} onClose={() => { setShowBudgetModal(false); setEditBudget(null); }} />}
      {showGoalModal && <GoalModal goal={editGoal} onClose={() => { setShowGoalModal(false); setEditGoal(null); }} />}
    </div>
  );
}
