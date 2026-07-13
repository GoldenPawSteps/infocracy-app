'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

import api from '@/lib/api';
import type { User } from '@/lib/types';
import { getApiErrorMessage, normalizeUser } from '@/lib/utils';

interface AuthStore {
  user: User | null;
  balance: string;
  power: string;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clearAuth: () => void;
}

const extractAuthPayload = (payload: Record<string, unknown> | null | undefined) => {
  const source = payload?.data && typeof payload.data === 'object' ? (payload.data as Record<string, unknown>) : payload;
  const metrics =
    source?.metrics && typeof source.metrics === 'object' ? (source.metrics as Record<string, unknown>) : undefined;
  const user = normalizeUser((source?.user as Record<string, unknown> | undefined) ?? (source as Record<string, unknown>));
  const balanceValue =
    (source?.balance as Record<string, unknown> | undefined)?.balance ?? source?.balance ?? source?.walletBalance ?? 0;
  const powerValue = source?.power ?? source?.influence ?? metrics?.power ?? 0;

  return {
    user,
    balance: String(balanceValue ?? 0),
    power: String(powerValue ?? 0),
  };
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      balance: '0',
      power: '0',
      isLoading: false,
      clearAuth: () => set({ user: null, balance: '0', power: '0', isLoading: false }),
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          await api.post('/auth/signin', { identifier: email, password });
          await get().fetchMe();
          toast.success('Welcome back to Infocracy.');
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Unable to sign in.'));
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      signup: async (username, email, password) => {
        set({ isLoading: true });
        try {
          await api.post('/auth/signup', { username, email, password });
          await get().fetchMe();
          toast.success('Your Infocracy account is ready.');
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Unable to create your account.'));
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      logout: async () => {
        set({ isLoading: true });
        try {
          await api.post('/auth/signout');
        } catch (error) {
          if (!(error instanceof AxiosError) || error.response?.status !== 401) {
            toast.error(getApiErrorMessage(error, 'Unable to sign out.'));
            throw error;
          }
        } finally {
          set({ user: null, balance: '0', power: '0', isLoading: false });
        }

        toast.success('Signed out successfully.');
      },
      fetchMe: async () => {
        set({ isLoading: true });
        try {
          const response = await api.get('/auth/me');
          const { user, balance, power } = extractAuthPayload(response.data as Record<string, unknown>);
          set({ user, balance, power, isLoading: false });
        } catch (error) {
          set({ user: null, balance: '0', power: '0', isLoading: false });
          if (!(error instanceof AxiosError) || error.response?.status !== 401) {
            throw error;
          }
        }
      },
    }),
    {
      name: 'infocracy-auth',
      partialize: (state) => ({
        user: state.user,
        balance: state.balance,
        power: state.power,
      }),
    },
  ),
);
