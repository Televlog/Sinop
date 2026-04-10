import { create } from 'zustand';
import { authApi } from '../services/api';
import { storage } from '../utils/storage';

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
  isInitialized: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<any>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  setUser: (user) => set({ user, isAuthenticated: true }),

  login: async (email, password, mfaCode) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login({ email, password, mfaCode });
      if (data.requireMfa) {
        set({ isLoading: false });
        return data;
      }
      await storage.setItem('access_token', data.accessToken);
      await storage.setItem('refresh_token', data.refreshToken);
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
      await storage.setItem('access_token', data.accessToken);
      await storage.setItem('refresh_token', data.refreshToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    const refreshToken = await storage.getItem('refresh_token');
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    await storage.deleteItem('access_token');
    await storage.deleteItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    const token = await storage.getItem('access_token');
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const data = await authApi.getMe();
      set({ user: data.user, isAuthenticated: true, isInitialized: true });
    } catch {
      await storage.deleteItem('access_token');
      set({ user: null, isAuthenticated: false, isInitialized: true });
    }
  },
}));
