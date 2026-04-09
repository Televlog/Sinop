import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { authApi, getErrorMessage } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email) { Alert.alert('Error', 'Enter your email'); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      setSent(true); // Don't reveal
    } finally { setLoading(false); }
  };

  if (sent) return (
    <View style={styles.container}>
      <Ionicons name="checkmark-circle" size={64} color="#10b981" />
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.sub}>If an account exists, a reset link has been sent.</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#374151" />
      </TouchableOpacity>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.sub}>Enter your email to receive a reset link.</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="you@example.com"
        placeholderTextColor="#9ca3af"
      />
      <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleSend} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 24, paddingTop: 60, alignItems: 'center', justifyContent: 'center' },
  back: { position: 'absolute', top: 56, left: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8, marginTop: 16, textAlign: 'center' },
  sub: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  input: { width: '100%', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 16, color: '#111827', backgroundColor: '#fff', marginBottom: 16 },
  button: { width: '100%', backgroundColor: '#4F46E5', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
