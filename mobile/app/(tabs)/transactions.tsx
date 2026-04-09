import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Alert, RefreshControl, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionApi, getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import Toast from 'react-native-toast-message';

const CATEGORY_ICONS: Record<string, string> = {
  'Food & Dining': '🍽️', 'Groceries': '🛒', 'Transportation': '🚗',
  'Entertainment': '🎬', 'Shopping': '🛍️', 'Healthcare': '💊',
  'Utilities': '💡', 'Housing': '🏠', 'Subscriptions': '📱', 'Other': '💳',
};

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

export default function TransactionsScreen() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const currency = user?.currency ?? 'USD';

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Add form state
  const [form, setForm] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0], type: 'EXPENSE', category: '', merchant: '' });

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['mobile-transactions', page, search, typeFilter],
    queryFn: () => transactionApi.list({ page, limit: 20, search: search || undefined, type: typeFilter || undefined }),
  });

  const addMutation = useMutation({
    mutationFn: transactionApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobile-transactions'] });
      qc.invalidateQueries({ queryKey: ['mobile-summary'] });
      setShowAddModal(false);
      setForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0], type: 'EXPENSE', category: '', merchant: '' });
      Toast.show({ type: 'success', text1: 'Transaction added' });
    },
    onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: getErrorMessage(err) }),
  });

  const deleteMutation = useMutation({
    mutationFn: transactionApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobile-transactions'] });
      qc.invalidateQueries({ queryKey: ['mobile-summary'] });
      Toast.show({ type: 'success', text1: 'Transaction deleted' });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAdd = () => {
    if (!form.description || !form.amount) {
      Alert.alert('Error', 'Description and amount are required');
      return;
    }
    addMutation.mutate({ ...form, amount: parseFloat(form.amount) });
  };

  const handleDelete = (id: string, description: string) => {
    Alert.alert('Delete Transaction', `Delete "${description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const transactions = data?.transactions ?? [];
  const pagination = data?.pagination;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search..."
            placeholderTextColor="#9ca3af"
          />
        </View>
        <View style={styles.filterTabs}>
          {['', 'INCOME', 'EXPENSE'].map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTypeFilter(t)}
              style={[styles.filterTab, typeFilter === t && styles.filterTabActive]}
            >
              <Text style={[styles.filterTabText, typeFilter === t && styles.filterTabTextActive]}>
                {t || 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💸</Text>
            <Text style={styles.emptyText}>{isLoading ? 'Loading...' : 'No transactions found'}</Text>
          </View>
        }
        ListFooterComponent={
          pagination && pagination.pages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                disabled={page <= 1}
                onPress={() => setPage(p => p - 1)}
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              >
                <Ionicons name="chevron-back" size={18} color={page <= 1 ? '#d1d5db' : '#4F46E5'} />
              </TouchableOpacity>
              <Text style={styles.pageText}>{page} / {pagination.pages}</Text>
              <TouchableOpacity
                disabled={page >= pagination.pages}
                onPress={() => setPage(p => p + 1)}
                style={[styles.pageBtn, page >= pagination.pages && styles.pageBtnDisabled]}
              >
                <Ionicons name="chevron-forward" size={18} color={page >= pagination.pages ? '#d1d5db' : '#4F46E5'} />
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.txCard}
            onLongPress={() => handleDelete(item.id, item.description)}
            delayLongPress={600}
          >
            <View style={styles.txIcon}>
              <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[item.category] ?? '💳'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
              <Text style={styles.txMeta}>{item.category ?? 'Uncategorized'} · {new Date(item.date).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.txAmount, { color: item.type === 'INCOME' ? '#10b981' : '#ef4444' }]}>
              {item.type === 'INCOME' ? '+' : '-'}{fmt(Math.abs(item.amount), currency)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Transaction</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Type Selector */}
            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeSelector}>
              {['EXPENSE', 'INCOME', 'TRANSFER'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, form.type === t && styles.typeBtnActive]}
                  onPress={() => setForm(f => ({ ...f, type: t }))}
                >
                  <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={styles.textInput}
              value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
              placeholder="e.g. Grocery shopping"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>Amount *</Text>
            <TextInput
              style={styles.textInput}
              value={form.amount}
              onChangeText={v => setForm(f => ({ ...f, amount: v }))}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.textInput}
              value={form.date}
              onChangeText={v => setForm(f => ({ ...f, date: v }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, form.category === cat && styles.catChipActive]}
                    onPress={() => setForm(f => ({ ...f, category: cat }))}
                  >
                    <Text style={styles.catChipText}>{icon} {cat.split(' ')[0]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>Merchant</Text>
            <TextInput
              style={styles.textInput}
              value={form.merchant}
              onChangeText={v => setForm(f => ({ ...f, merchant: v }))}
              placeholder="e.g. Walmart"
              placeholderTextColor="#9ca3af"
            />

            <TouchableOpacity
              style={[styles.submitBtn, addMutation.isPending && { opacity: 0.7 }]}
              onPress={handleAdd}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Add Transaction</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
  toolbar: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  filterTabs: { flexDirection: 'row', gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f6' },
  filterTabActive: { backgroundColor: '#4F46E5' },
  filterTabText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterTabTextActive: { color: '#fff' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  txIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 12 },
  pageBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  textInput: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', marginBottom: 16, backgroundColor: '#f9fafb' },
  typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#4F46E5' },
  typeBtnText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  typeBtnTextActive: { color: '#fff' },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
  catChipActive: { backgroundColor: '#4F46E5' },
  catChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  submitBtn: { backgroundColor: '#4F46E5', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
