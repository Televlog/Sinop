import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  },
});

// Request interceptor – attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor – refresh on 401
api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = Cookies.get('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          Cookies.set('access_token', data.accessToken, { expires: 1 / 96 }); // 15 min
          Cookies.set('refresh_token', data.refreshToken, { expires: 7 });
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ================================
// Auth
// ================================
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data).then(r => r.data),
  login: (data: { email: string; password: string; mfaCode?: string }) =>
    api.post('/auth/login', data).then(r => r.data),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me').then(r => r.data),
  updateProfile: (data: any) => api.put('/auth/me', data).then(r => r.data),
  changePassword: (data: any) => api.put('/auth/me/password', data).then(r => r.data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
  setupMfa: () => api.post('/auth/mfa/setup').then(r => r.data),
  verifyMfa: (code: string) => api.post('/auth/mfa/verify', { code }).then(r => r.data),
  disableMfa: (password: string) => api.post('/auth/mfa/disable', { password }).then(r => r.data),
};

// ================================
// Transactions
// ================================
export const transactionApi = {
  list: (params?: Record<string, any>) =>
    api.get('/transactions', { params }).then(r => r.data),
  get: (id: string) => api.get(`/transactions/${id}`).then(r => r.data),
  create: (data: any) => api.post('/transactions', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/transactions/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/transactions/${id}`).then(r => r.data),
  summary: (params?: { month?: number; year?: number }) =>
    api.get('/transactions/summary', { params }).then(r => r.data),
  categories: () => api.get('/transactions/categories').then(r => r.data),
  detectRecurring: () => api.get('/transactions/detect-recurring').then(r => r.data),
  uploadReceipt: (id: string, file: File) => {
    const form = new FormData();
    form.append('receipt', file);
    return api.post(`/transactions/${id}/receipt`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

// ================================
// Subscriptions
// ================================
export const subscriptionApi = {
  list: (params?: { status?: string }) =>
    api.get('/subscriptions', { params }).then(r => r.data),
  get: (id: string) => api.get(`/subscriptions/${id}`).then(r => r.data),
  create: (data: any) => api.post('/subscriptions', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/subscriptions/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/subscriptions/${id}`).then(r => r.data),
  cancel: (id: string, data?: any) => api.post(`/subscriptions/${id}/cancel`, data).then(r => r.data),
  upcoming: (days?: number) => api.get('/subscriptions/upcoming', { params: { days } }).then(r => r.data),
  detect: () => api.get('/subscriptions/detect').then(r => r.data),
};

// ================================
// Budgets
// ================================
export const budgetApi = {
  list: (params?: { month?: number; year?: number }) =>
    api.get('/budgets', { params }).then(r => r.data),
  create: (data: any) => api.post('/budgets', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/budgets/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/budgets/${id}`).then(r => r.data),
  goals: () => api.get('/budgets/goals/all').then(r => r.data),
  createGoal: (data: any) => api.post('/budgets/goals', data).then(r => r.data),
  updateGoal: (id: string, data: any) => api.put(`/budgets/goals/${id}`, data).then(r => r.data),
  deleteGoal: (id: string) => api.delete(`/budgets/goals/${id}`).then(r => r.data),
};

// ================================
// Reports
// ================================
export const reportApi = {
  monthly: (params?: { month?: number; year?: number }) =>
    api.get('/reports/monthly', { params }).then(r => r.data),
  trends: (months?: number) =>
    api.get('/reports/trends', { params: { months } }).then(r => r.data),
  insights: () => api.get('/reports/insights').then(r => r.data),
  generateInsights: () => api.post('/reports/insights/generate').then(r => r.data),
  exportPDF: (params?: any) =>
    api.get('/reports/export/pdf', { params, responseType: 'blob' }).then(r => r.data),
  exportExcel: (params?: any) =>
    api.get('/reports/export/excel', { params, responseType: 'blob' }).then(r => r.data),
  notifications: (unreadOnly?: boolean) =>
    api.get('/reports/notifications', { params: { unreadOnly } }).then(r => r.data),
  markRead: (id: string) => api.put(`/reports/notifications/${id}/read`).then(r => r.data),
};

// ================================
// Plaid
// ================================
export const plaidApi = {
  accounts: () => api.get('/plaid/accounts').then(r => r.data),
  linkToken: () => api.post('/plaid/link-token').then(r => r.data),
  exchangeToken: (data: any) => api.post('/plaid/exchange-token', data).then(r => r.data),
  sync: (accountId: string) => api.post('/plaid/sync', { accountId }).then(r => r.data),
  removeAccount: (id: string) => api.delete(`/plaid/accounts/${id}`).then(r => r.data),
};

// ================================
// Admin
// ================================
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard').then(r => r.data),
  analytics: () => api.get('/admin/analytics').then(r => r.data),
  users: (params?: any) => api.get('/admin/users', { params }).then(r => r.data),
  getUser: (id: string) => api.get(`/admin/users/${id}`).then(r => r.data),
  updateRole: (id: string, role: string) => api.put(`/admin/users/${id}/role`, { role }).then(r => r.data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`).then(r => r.data),
  transactions: (params?: any) => api.get('/admin/transactions', { params }).then(r => r.data),
};

// ================================
// Utils
// ================================
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred';
};
