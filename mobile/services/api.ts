import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  },
});

// Request interceptor
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor – auto refresh
api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          await SecureStore.setItemAsync('access_token', data.accessToken);
          await SecureStore.setItemAsync('refresh_token', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          await SecureStore.deleteItemAsync('access_token');
          await SecureStore.deleteItemAsync('refresh_token');
        }
      }
    }
    return Promise.reject(error);
  }
);

// ============================
// AUTH
// ============================
export const authApi = {
  login: (data: { email: string; password: string; mfaCode?: string }) =>
    api.post('/auth/login', data).then(r => r.data),
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data).then(r => r.data),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me').then(r => r.data),
  updateProfile: (data: any) => api.put('/auth/me', data).then(r => r.data),
};

// ============================
// TRANSACTIONS
// ============================
export const transactionApi = {
  list: (params?: any) => api.get('/transactions', { params }).then(r => r.data),
  create: (data: any) => api.post('/transactions', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/transactions/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/transactions/${id}`).then(r => r.data),
  summary: (params?: any) => api.get('/transactions/summary', { params }).then(r => r.data),
  categories: () => api.get('/transactions/categories').then(r => r.data),
};

// ============================
// SUBSCRIPTIONS
// ============================
export const subscriptionApi = {
  list: (params?: any) => api.get('/subscriptions', { params }).then(r => r.data),
  create: (data: any) => api.post('/subscriptions', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/subscriptions/${id}`, data).then(r => r.data),
  cancel: (id: string) => api.post(`/subscriptions/${id}/cancel`).then(r => r.data),
  delete: (id: string) => api.delete(`/subscriptions/${id}`).then(r => r.data),
  upcoming: (days?: number) => api.get('/subscriptions/upcoming', { params: { days } }).then(r => r.data),
};

// ============================
// BUDGETS
// ============================
export const budgetApi = {
  list: (params?: any) => api.get('/budgets', { params }).then(r => r.data),
  create: (data: any) => api.post('/budgets', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/budgets/${id}`, data).then(r => r.data),
  goals: () => api.get('/budgets/goals/all').then(r => r.data),
};

// ============================
// REPORTS
// ============================
export const reportApi = {
  monthly: (params?: any) => api.get('/reports/monthly', { params }).then(r => r.data),
  trends: (months?: number) => api.get('/reports/trends', { params: { months } }).then(r => r.data),
  insights: () => api.get('/reports/insights').then(r => r.data),
  notifications: () => api.get('/reports/notifications').then(r => r.data),
  markRead: (id: string) => api.put(`/reports/notifications/${id}/read`).then(r => r.data),
};

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message;
  return error instanceof Error ? error.message : 'Unknown error';
};
