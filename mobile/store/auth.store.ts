import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../services/api';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  currency: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<any>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  setUser: (user) => set({ user, isAuthenticated: true }),

  login: async (email, password, mfaCode) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login({ email, password, mfaCode });
      if (data.requireMfa) {
        set({ isLoading: false });
        return data;
      }
      await SecureStore.setItemAsync('access_token', data.accessToken);
      await SecureStore.setItemAsync('refresh_token', data.refreshToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const data = await authApi.register({ name, email, password });
      await SecureStore.setItemAsync('access_token', data.accessToken);
      await SecureStore.setItemAsync('refresh_token', data.refreshToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return;
    try {
      const data = await authApi.getMe();
      set({ user: data.user, isAuthenticated: true });
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      set({ user: null, isAuthenticated: false });
    }
  },
}));
