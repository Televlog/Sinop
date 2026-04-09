import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { budgetApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n);

const progressColor = (pct: number) => {
  if (pct >= 100) return '#ef4444';
  if (pct >= 80) return '#f59e0b';
  return '#4F46E5';
};

export default function BudgetsScreen() {
  const { user } = useAuthStore();
  const currency = user?.currency ?? 'USD';
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [tab, setTab] = useState<'budgets' | 'goals'>('budgets');
  const [refreshing, setRefreshing] = useState(false);

  const { data: budgetData, refetch: refetchBudgets } = useQuery({
    queryKey: ['mobile-budgets', month, year],
    queryFn: () => budgetApi.list({ month, year }),
  });

  const { data: goalData, refetch: refetchGoals } = useQuery({
    queryKey: ['mobile-goals'],
    queryFn: budgetApi.goals,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchBudgets(), refetchGoals()]);
    setRefreshing(false);
  };

  const budgets = budgetData?.budgets ?? [];
  const goals = goalData?.goals ?? [];
  const summary = budgetData?.summary;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Budgets & Goals</Text>
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'budgets' && styles.tabActive]}
          onPress={() => setTab('budgets')}
        >
          <Text style={[styles.tabText, tab === 'budgets' && styles.tabTextActive]}>Monthly Budgets</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'goals' && styles.tabActive]}
          onPress={() => setTab('goals')}
        >
          <Text style={[styles.tabText, tab === 'goals' && styles.tabTextActive]}>Savings Goals</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
      >
        {tab === 'budgets' && (
          <>
            {/* Month Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
              {months.map((m, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.monthChip, month === i + 1 && styles.monthChipActive]}
                  onPress={() => setMonth(i + 1)}
                >
                  <Text style={[styles.monthChipText, month === i + 1 && styles.monthChipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Summary Cards */}
            {summary && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Budgeted</Text>
                  <Text style={styles.summaryVal}>{fmt(summary.totalBudget, currency)}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Spent</Text>
                  <Text style={[styles.summaryVal, { color: '#ef4444' }]}>{fmt(summary.totalSpent, currency)}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Left</Text>
                  <Text style={[styles.summaryVal, { color: summary.totalRemaining >= 0 ? '#10b981' : '#ef4444' }]}>
                    {fmt(summary.totalRemaining, currency)}
                  </Text>
                </View>
              </View>
            )}

            {budgets.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyText}>No budgets for {months[month - 1]}</Text>
              </View>
            ) : budgets.map((b: any) => (
              <View key={b.id} style={styles.budgetCard}>
                <View style={styles.budgetTop}>
                  <Text style={styles.budgetIcon}>{b.icon ?? '💰'}</Text>
                  <Text style={styles.budgetCategory}>{b.category}</Text>
                  <Text style={[styles.budgetPct, { color: progressColor(b.percentage) }]}>
                    {b.percentage}%
                  </Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, {
                    width: `${Math.min(100, b.percentage)}%` as any,
                    backgroundColor: progressColor(b.percentage),
                  }]} />
                </View>
                <View style={styles.budgetBottom}>
                  <Text style={styles.budgetSpent}>Spent: {fmt(b.spent, currency)}</Text>
                  <Text style={[styles.budgetLeft, b.isOverBudget && { color: '#ef4444' }]}>
                    {b.isOverBudget ? `Over by ${fmt(Math.abs(b.remaining), currency)}` : `${fmt(b.remaining, currency)} left`}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'goals' && (
          <>
            {goals.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🎯</Text>
                <Text style={styles.emptyText}>No savings goals yet</Text>
              </View>
            ) : goals.map((g: any) => (
              <View key={g.id} style={styles.goalCard}>
                <View style={styles.goalTop}>
                  <Text style={styles.goalName}>{g.name}</Text>
                  {g.isCompleted && <Text style={styles.goalComplete}>🎉 Completed!</Text>}
                </View>

                {/* Circular Progress (simple) */}
                <View style={styles.goalCircle}>
                  <View style={styles.goalCircleInner}>
                    <Text style={styles.goalPct}>{g.percentage}%</Text>
                  </View>
                </View>

                <View style={styles.goalStats}>
                  <View style={styles.goalStat}>
                    <Text style={styles.goalStatLabel}>Saved</Text>
                    <Text style={styles.goalStatVal}>{fmt(g.currentAmount, currency)}</Text>
                  </View>
                  <View style={styles.goalStat}>
                    <Text style={styles.goalStatLabel}>Target</Text>
                    <Text style={styles.goalStatVal}>{fmt(g.targetAmount, currency)}</Text>
                  </View>
                  <View style={styles.goalStat}>
                    <Text style={styles.goalStatLabel}>Left</Text>
                    <Text style={[styles.goalStatVal, { color: g.isCompleted ? '#10b981' : '#4F46E5' }]}>
                      {g.isCompleted ? '✓ Done' : fmt(g.remaining, currency)}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, {
                    width: `${Math.min(100, g.percentage)}%` as any,
                    backgroundColor: g.isCompleted ? '#10b981' : '#4F46E5',
                  }]} />
                </View>

                {g.targetDate && (
                  <Text style={styles.goalDate}>
                    Target: {new Date(g.targetDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#4F46E5' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#4F46E5' },
  content: { padding: 16, paddingBottom: 32 },
  monthScroll: { marginBottom: 16 },
  monthChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8 },
  monthChipActive: { backgroundColor: '#4F46E5' },
  monthChipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  monthChipTextActive: { color: '#fff' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  summaryLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  summaryVal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  budgetCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  budgetTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  budgetIcon: { fontSize: 20 },
  budgetCategory: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  budgetPct: { fontSize: 15, fontWeight: '700' },
  progressBg: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 4 },
  budgetBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetSpent: { fontSize: 12, color: '#6b7280' },
  budgetLeft: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  goalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  goalName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  goalComplete: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  goalCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12, borderWidth: 4, borderColor: '#4F46E5' },
  goalCircleInner: { alignItems: 'center' },
  goalPct: { fontSize: 18, fontWeight: '800', color: '#4F46E5' },
  goalStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  goalStat: { alignItems: 'center' },
  goalStatLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  goalStatVal: { fontSize: 13, fontWeight: '700', color: '#111827' },
  goalDate: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
});
