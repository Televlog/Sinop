import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { User } from '@/types';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<any>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      login: async (email, password, mfaCode) => {
        set({ isLoading: true });
        try {
          const data = await authApi.login({ email, password, mfaCode });
          if (data.requireMfa) {
            set({ isLoading: false });
            return data;
          }
          Cookies.set('access_token', data.accessToken, { expires: 1 / 96, sameSite: 'lax' });
          Cookies.set('refresh_token', data.refreshToken, { expires: 7, sameSite: 'lax' });
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
          Cookies.set('access_token', data.accessToken, { expires: 1 / 96, sameSite: 'lax' });
          Cookies.set('refresh_token', data.refreshToken, { expires: 7, sameSite: 'lax' });
          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const refreshToken = Cookies.get('refresh_token');
        if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        set({ user: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        const token = Cookies.get('access_token');
        if (!token) return;
        try {
          const data = await authApi.getMe();
          set({ user: data.user, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'sinop-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
