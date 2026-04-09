import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useState } from 'react';

const { width: SCREEN_W } = Dimensions.get('window');

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n);

export default function ReportsScreen() {
  const { user } = useAuthStore();
  const currency = user?.currency ?? 'USD';
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [refreshing, setRefreshing] = useState(false);

  const { data: report, refetch: refetchReport } = useQuery({
    queryKey: ['mobile-report', month, year],
    queryFn: () => reportApi.monthly({ month, year }),
  });

  const { data: trendsData, refetch: refetchTrends } = useQuery({
    queryKey: ['mobile-trends-report'],
    queryFn: () => reportApi.trends(6),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchReport(), refetchTrends()]);
    setRefreshing(false);
  };

  const r = report;
  const trends = trendsData?.trends ?? [];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const trendChartData = trends.length > 0 ? {
    labels: trends.map((t: any) => t.label.split(' ')[0]),
    datasets: [
      { data: trends.map((t: any) => t.income || 0), color: () => '#10b981' },
      { data: trends.map((t: any) => t.expenses || 0), color: () => '#ef4444' },
    ],
    legend: ['Income', 'Expenses'],
  } : null;

  const categoryData = r?.categoryBreakdown?.slice(0, 6) ?? [];
  const catChartData = categoryData.length > 0 ? {
    labels: categoryData.map((c: any) => c.category.split(' ')[0]),
    datasets: [{ data: categoryData.map((c: any) => c.amount) }],
  } : null;

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
    labelColor: () => '#9ca3af',
    propsForLabels: { fontSize: 10 },
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports & Analytics</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
      >
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

        {/* Summary */}
        {r && (
          <View style={styles.summaryGrid}>
            {[
              { label: 'Income', value: fmt(r.income, currency), color: '#10b981' },
              { label: 'Expenses', value: fmt(r.expenses, currency), color: '#ef4444' },
              { label: 'Saved', value: fmt(r.netSavings, currency), color: r.netSavings >= 0 ? '#4F46E5' : '#ef4444' },
              { label: 'Rate', value: `${r.savingsRate}%`, color: r.savingsRate >= 20 ? '#10b981' : '#f59e0b' },
            ].map(stat => (
              <View key={stat.label} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{stat.label}</Text>
                <Text style={[styles.summaryVal, { color: stat.color }]}>{stat.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Trends Chart */}
        {trendChartData && trends.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 6-Month Trend</Text>
            <View style={styles.chartCard}>
              <LineChart
                data={trendChartData}
                width={SCREEN_W - 64}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={{ borderRadius: 12, marginLeft: -16 }}
                withDots={false}
                withShadow={false}
              />
            </View>
          </View>
        )}

        {/* Category Breakdown */}
        {catChartData && categoryData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🥧 Category Breakdown</Text>
            <View style={styles.chartCard}>
              <BarChart
                data={catChartData}
                width={SCREEN_W - 64}
                height={200}
                chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})` }}
                style={{ borderRadius: 12, marginLeft: -16 }}
                yAxisLabel="$"
                yAxisSuffix=""
                showValuesOnTopOfBars
              />
            </View>
            <View style={styles.categoryList}>
              {categoryData.map((c: any) => (
                <View key={c.category} style={styles.catRow}>
                  <Text style={styles.catName}>{c.category}</Text>
                  <Text style={styles.catAmt}>{fmt(c.amount, currency)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Budget Performance */}
        {r?.budgets && r.budgets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Budget Performance</Text>
            {r.budgets.map((b: any) => {
              const pct = b.budget > 0 ? Math.round((b.spent / b.budget) * 100) : 0;
              return (
                <View key={b.category} style={styles.budgetRow}>
                  <View style={styles.budgetTop}>
                    <Text style={styles.budgetCat}>{b.category}</Text>
                    <Text style={[styles.budgetPct, { color: pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981' }]}>{pct}%</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, {
                      width: `${Math.min(100, pct)}%` as any,
                      backgroundColor: pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#4F46E5',
                    }]} />
                  </View>
                  <Text style={styles.budgetDetail}>{fmt(b.spent, currency)} of {fmt(b.budget, currency)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {!r && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No report data for {months[month - 1]}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  content: { padding: 16, paddingBottom: 32 },
  monthScroll: { marginBottom: 16 },
  monthChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8 },
  monthChipActive: { backgroundColor: '#4F46E5' },
  monthChipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  monthChipTextActive: { color: '#fff' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  summaryCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  summaryLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  summaryVal: { fontSize: 18, fontWeight: '800' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  chartCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  categoryList: { marginTop: 12, gap: 8 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  catName: { fontSize: 13, color: '#374151' },
  catAmt: { fontSize: 13, fontWeight: '700', color: '#111827' },
  budgetRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetCat: { fontSize: 14, fontWeight: '600', color: '#111827' },
  budgetPct: { fontSize: 14, fontWeight: '700' },
  progressBg: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 3 },
  budgetDetail: { fontSize: 11, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
});
