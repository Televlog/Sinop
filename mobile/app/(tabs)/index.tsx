import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { transactionApi, subscriptionApi, budgetApi, reportApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';

const { width: SCREEN_W } = Dimensions.get('window');

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#f59e0b',
  'Groceries': '#10b981',
  'Transportation': '#3b82f6',
  'Entertainment': '#8b5cf6',
  'Shopping': '#ec4899',
  'Healthcare': '#ef4444',
  'Utilities': '#6b7280',
  'Subscriptions': '#6366f1',
  'Other': '#94a3b8',
};

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function HomeScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const currency = user?.currency ?? 'USD';

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['mobile-summary'],
    queryFn: () => transactionApi.summary(),
  });

  const { data: trendsData, refetch: refetchTrends } = useQuery({
    queryKey: ['mobile-trends'],
    queryFn: () => reportApi.trends(6),
  });

  const { data: txData, refetch: refetchTx } = useQuery({
    queryKey: ['mobile-recent-tx'],
    queryFn: () => transactionApi.list({ limit: 5, sortBy: 'date', sortOrder: 'desc' }),
  });

  const { data: subData } = useQuery({
    queryKey: ['mobile-subs'],
    queryFn: () => subscriptionApi.list({ status: 'ACTIVE' }),
  });

  const { data: insightsData } = useQuery({
    queryKey: ['mobile-insights'],
    queryFn: reportApi.insights,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchTrends(), refetchTx()]);
    setRefreshing(false);
  };

  const s = summary;
  const trends = trendsData?.trends ?? [];
  const transactions = txData?.transactions ?? [];
  const insights = (insightsData?.insights ?? []).slice(0, 2);

  const chartData = trends.length > 0 ? {
    labels: trends.map((t: any) => t.label.split(' ')[0]),
    datasets: [
      { data: trends.map((t: any) => t.income), color: () => '#10b981', strokeWidth: 2 },
      { data: trends.map((t: any) => t.expenses), color: () => '#ef4444', strokeWidth: 2 },
    ],
    legend: ['Income', 'Expenses'],
  } : null;

  const pieData = s?.byCategory?.slice(0, 6).map((c: any) => ({
    name: c.category?.substring(0, 10) ?? 'Other',
    amount: c.amount,
    color: CATEGORY_COLORS[c.category] ?? '#94a3b8',
    legendFontColor: '#7F7F7F',
    legendFontSize: 11,
  })) ?? [];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}, {user?.name?.split(' ')[0] ?? 'there'} 👋</Text>
          <Text style={styles.headerSub}>Here's your financial snapshot</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Net Worth Card */}
      <View style={styles.netCard}>
        <Text style={styles.netLabel}>Net Savings This Month</Text>
        <Text style={[styles.netValue, { color: (s?.netSavings ?? 0) >= 0 ? '#10b981' : '#ef4444' }]}>
          {fmt(s?.netSavings ?? 0, currency)}
        </Text>
        <View style={styles.netRow}>
          <View style={styles.netItem}>
            <Text style={styles.netItemLabel}>↑ Income</Text>
            <Text style={styles.netItemValue}>{fmt(s?.totalIncome ?? 0, currency)}</Text>
          </View>
          <View style={styles.netDivider} />
          <View style={styles.netItem}>
            <Text style={styles.netItemLabel}>↓ Expenses</Text>
            <Text style={[styles.netItemValue, { color: '#ef4444' }]}>{fmt(s?.totalExpenses ?? 0, currency)}</Text>
          </View>
          <View style={styles.netDivider} />
          <View style={styles.netItem}>
            <Text style={styles.netItemLabel}>💾 Saved</Text>
            <Text style={styles.netItemValue}>{s?.savingsRate ?? 0}%</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {[
          { icon: 'add-circle', label: 'Add', color: '#4F46E5', onPress: () => router.push('/transactions') },
          { icon: 'refresh-circle', label: 'Subs', color: '#8b5cf6', onPress: () => router.push('/subscriptions') },
          { icon: 'pie-chart', label: 'Budget', color: '#10b981', onPress: () => router.push('/budgets') },
          { icon: 'document-text', label: 'Reports', color: '#f59e0b', onPress: () => router.push('/reports') },
        ].map(action => (
          <TouchableOpacity key={action.label} style={styles.quickActionItem} onPress={action.onPress}>
            <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon as any} size={26} color={action.color} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* AI Insights */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ AI Insights</Text>
          {insights.map((insight: any) => (
            <View key={insight.id} style={[styles.insightCard, {
              backgroundColor: insight.severity === 'CRITICAL' ? '#fef2f2' :
                               insight.severity === 'WARNING' ? '#fffbeb' :
                               insight.severity === 'POSITIVE' ? '#f0fdf4' : '#eff6ff',
              borderColor: insight.severity === 'CRITICAL' ? '#fca5a5' :
                           insight.severity === 'WARNING' ? '#fcd34d' :
                           insight.severity === 'POSITIVE' ? '#86efac' : '#93c5fd',
            }]}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightDesc}>{insight.description}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Spending Trend */}
      {chartData && trends.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Income vs Expenses</Text>
          <View style={styles.chartCard}>
            <LineChart
              data={chartData}
              width={SCREEN_W - 64}
              height={180}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                labelColor: () => '#9ca3af',
                style: { borderRadius: 12 },
                propsForLabels: { fontSize: 10 },
              }}
              bezier
              style={{ borderRadius: 12, marginLeft: -16 }}
              withDots={false}
              withShadow={false}
            />
          </View>
        </View>
      )}

      {/* Category Pie */}
      {pieData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥧 Spending by Category</Text>
          <View style={styles.chartCard}>
            <PieChart
              data={pieData}
              width={SCREEN_W - 64}
              height={180}
              chartConfig={{ color: () => '#000' }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="10"
              absolute={false}
            />
          </View>
        </View>
      )}

      {/* Upcoming Subscriptions */}
      {(subData?.summary?.upcomingIn7Days ?? 0) > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⏰ Upcoming Billing</Text>
            <TouchableOpacity onPress={() => router.push('/subscriptions')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {(subData?.subscriptions ?? []).filter((s: any) => {
            const days = (new Date(s.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            return days >= 0 && days <= 7;
          }).slice(0, 3).map((sub: any) => (
            <View key={sub.id} style={styles.subRow}>
              <View style={[styles.subDot, { backgroundColor: sub.color ?? '#6366f1' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.subName}>{sub.name}</Text>
                <Text style={styles.subDate}>{new Date(sub.nextBillingDate).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.subAmount}>{fmt(sub.amount, currency)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🕒 Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet. Add one to get started!</Text>
        ) : transactions.map((t: any) => (
          <View key={t.id} style={styles.txRow}>
            <View style={styles.txIcon}>
              <Text style={{ fontSize: 20 }}>
                {({ 'Food & Dining': '🍽️', 'Groceries': '🛒', 'Transportation': '🚗', 'Entertainment': '🎬', 'Shopping': '🛍️', 'Healthcare': '💊', 'Subscriptions': '📱' } as any)[t.category] ?? '💳'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txDesc} numberOfLines={1}>{t.description}</Text>
              <Text style={styles.txMeta}>{t.category ?? 'Uncategorized'} · {new Date(t.date).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.txAmount, { color: t.type === 'INCOME' ? '#10b981' : '#ef4444' }]}>
              {t.type === 'INCOME' ? '+' : '-'}{fmt(Math.abs(t.amount), currency)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  notifBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  netCard: { backgroundColor: '#4F46E5', borderRadius: 20, padding: 20, marginBottom: 20 },
  netLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 },
  netValue: { fontSize: 36, fontWeight: '800', color: '#fff', marginBottom: 16 },
  netRow: { flexDirection: 'row', alignItems: 'center' },
  netItem: { flex: 1, alignItems: 'center' },
  netItemLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 2 },
  netItemValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  netDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  quickActionItem: { alignItems: 'center', flex: 1 },
  quickActionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickActionLabel: { fontSize: 11, fontWeight: '600', color: '#374151' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  seeAll: { fontSize: 13, color: '#4F46E5', fontWeight: '600' },
  chartCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  insightCard: { borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
  insightTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  insightDesc: { fontSize: 13, color: '#374151', lineHeight: 18 },
  subRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  subDot: { width: 10, height: 10, borderRadius: 5 },
  subName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  subDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  subAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  txIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#9ca3af', fontSize: 14, paddingVertical: 20 },
});
