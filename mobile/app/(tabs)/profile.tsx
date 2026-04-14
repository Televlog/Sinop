import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Switch,
} from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { authApi, getErrorMessage } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

export default function ProfileScreen() {
  const { user, logout, setUser } = useAuthStore();
  const router = useRouter();
  const [notifyPush, setNotifyPush] = useState(user?.notifyPush ?? true);
  const [notifyEmail, setNotifyEmail] = useState(user?.notifyEmail ?? true);

  const updateMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      setUser(data.user);
      Toast.show({ type: 'success', text1: 'Profile updated' });
    },
    onError: (err) => Toast.show({ type: 'error', text1: getErrorMessage(err) }),
  });

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleToggleNotify = (key: 'notifyPush' | 'notifyEmail', val: boolean) => {
    if (key === 'notifyPush') setNotifyPush(val);
    else setNotifyEmail(val);
    updateMutation.mutate({ [key]: val });
  };

  const getInitials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', onPress: () => {} },
    { icon: 'lock-closed-outline', label: 'Change Password', onPress: () => {} },
    { icon: 'shield-checkmark-outline', label: 'Security & MFA', onPress: () => {} },
    { icon: 'card-outline', label: 'Connected Accounts', onPress: () => {} },
    { icon: 'bar-chart-outline', label: 'Reports', onPress: () => router.push('/reports') },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
    { icon: 'document-text-outline', label: 'Privacy Policy', onPress: () => {} },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user?.name ?? null)}</Text>
        </View>
        <Text style={styles.name}>{user?.name ?? 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.role === 'ADMIN' && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statLabel}>Currency</Text>
          <Text style={styles.statValue}>{user?.currency ?? 'USD'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🌍</Text>
          <Text style={styles.statLabel}>Timezone</Text>
          <Text style={styles.statValue} numberOfLines={1}>{user?.timezone ?? 'UTC'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📅</Text>
          <Text style={styles.statLabel}>Member Since</Text>
          <Text style={styles.statValue}>
            {user ? new Date(user.createdAt ?? Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
          </Text>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Push Notifications</Text>
              <Text style={styles.toggleSub}>Budget alerts, subscription reminders</Text>
            </View>
            <Switch
              value={notifyPush}
              onValueChange={val => handleToggleNotify('notifyPush', val)}
              trackColor={{ false: '#e5e7eb', true: '#a5b4fc' }}
              thumbColor={notifyPush ? '#4F46E5' : '#fff'}
            />
          </View>
          <View style={[styles.toggleRow, { marginTop: 16 }]}>
            <View>
              <Text style={styles.toggleLabel}>Email Notifications</Text>
              <Text style={styles.toggleSub}>Weekly reports, payment reminders</Text>
            </View>
            <Switch
              value={notifyEmail}
              onValueChange={val => handleToggleNotify('notifyEmail', val)}
              trackColor={{ false: '#e5e7eb', true: '#a5b4fc' }}
              thumbColor={notifyEmail ? '#4F46E5' : '#fff'}
            />
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={item.onPress}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={20} color="#4F46E5" />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Sinop App v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 48 },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#9ca3af', marginTop: 2 },
  adminBadge: { marginTop: 8, backgroundColor: '#ede9fe', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  adminBadgeText: { color: '#7c3aed', fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#9ca3af', marginBottom: 2 },
  statValue: { fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  toggleSub: { fontSize: 12, color: '#9ca3af' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#fca5a5', marginBottom: 16 },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, color: '#d1d5db' },
});
