import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi, getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import Toast from 'react-native-toast-message';

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

const monthlyEquiv = (amount: number, cycle: string) => {
  const m: Record<string, number> = { DAILY: 30, WEEKLY: 4.33, BIWEEKLY: 2.17, MONTHLY: 1, QUARTERLY: 1/3, SEMIANNUAL: 1/6, YEARLY: 1/12 };
  return amount * (m[cycle] ?? 1);
};

export default function SubscriptionsScreen() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const currency = user?.currency ?? 'USD';
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['mobile-subs-page', statusFilter],
    queryFn: () => subscriptionApi.list({ status: statusFilter || undefined }),
  });

  const cancelMutation = useMutation({
    mutationFn: subscriptionApi.cancel,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mobile-subs-page'] }); Toast.show({ type: 'success', text1: 'Subscription cancelled' }); },
    onError: (err) => Toast.show({ type: 'error', text1: getErrorMessage(err) }),
  });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const subs = data?.subscriptions ?? [];
  const summary = data?.summary;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscriptions</Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryVal}>{summary?.total ?? 0}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryVal}>{fmt(summary?.monthlyTotal ?? 0, currency)}</Text>
          <Text style={styles.summaryLabel}>Per Month</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryVal}>{fmt(summary?.yearlyTotal ?? 0, currency)}</Text>
          <Text style={styles.summaryLabel}>Per Year</Text>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {['ACTIVE', 'CANCELLED', 'PAUSED', ''].map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => setStatusFilter(s)}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
              {s || 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={subs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No subscriptions found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const daysUntil = Math.ceil((new Date(item.nextBillingDate).getTime() - Date.now()) / (1000*60*60*24));
          const monthly = monthlyEquiv(item.amount, item.billingCycle);

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: (item.color ?? '#6366f1') + '25' }]}>
                  <Text style={[styles.cardIconText, { color: item.color ?? '#6366f1' }]}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardCategory}>{item.category ?? 'Subscription'}</Text>
                </View>
                <View style={[styles.statusBadge, {
                  backgroundColor: item.status === 'ACTIVE' ? '#dcfce7' : item.status === 'PAUSED' ? '#fef9c3' : '#fee2e2',
                }]}>
                  <Text style={[styles.statusText, {
                    color: item.status === 'ACTIVE' ? '#16a34a' : item.status === 'PAUSED' ? '#ca8a04' : '#dc2626',
                  }]}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.cardMid}>
                <View>
                  <Text style={styles.cardAmount}>{fmt(item.amount, currency)}</Text>
                  <Text style={styles.cardCycle}>{item.billingCycle.toLowerCase()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardMonthly}>{fmt(monthly, currency)}/mo</Text>
                  <Text style={styles.cardNextDate}>
                    Next: {new Date(item.nextBillingDate).toLocaleDateString()}
                    {daysUntil >= 0 && daysUntil <= 7 ? ` (${daysUntil}d)` : ''}
                  </Text>
                </View>
              </View>

              {item.status === 'ACTIVE' && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => Alert.alert('Cancel Subscription', `Cancel ${item.name}?`, [
                    { text: 'No', style: 'cancel' },
                    { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate(item.id) },
                  ])}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                  <Text style={styles.cancelBtnText}>Cancel Subscription</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  summaryRow: { flexDirection: 'row', padding: 16, gap: 10 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  summaryVal: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  summaryLabel: { fontSize: 11, color: '#9ca3af' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6' },
  filterChipActive: { backgroundColor: '#4F46E5' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterChipTextActive: { color: '#fff' },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardIconText: { fontSize: 20, fontWeight: '800' },
  cardName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardCategory: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardMid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', marginBottom: 12 },
  cardAmount: { fontSize: 22, fontWeight: '800', color: '#111827' },
  cardCycle: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  cardMonthly: { fontSize: 13, fontWeight: '600', color: '#4F46E5' },
  cardNextDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  cancelBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
});
