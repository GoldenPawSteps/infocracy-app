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
  influence: string;
  power: string;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clearAuth: () => void;
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;

const pickMetric = (sources: Array<Record<string, unknown> | undefined>, key: 'balance' | 'influence' | 'power') => {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    const value = source[key];
    if (value !== undefined && value !== null) {
      if (key === 'balance') {
        const nestedBalance = asRecord(value)?.balance;
        return nestedBalance ?? value;
      }

      return value;
    }

    if (key === 'balance') {
      const walletBalance = source.walletBalance;
      if (walletBalance !== undefined && walletBalance !== null) {
        return walletBalance;
      }
    }
  }

  return 0;
};

const extractAuthPayload = (payload: Record<string, unknown> | null | undefined) => {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const rootUser = asRecord(root?.user);
  const dataUser = asRecord(data?.user);
  const rootMetrics = asRecord(root?.metrics);
  const dataMetrics = asRecord(data?.metrics);

  const userSource = dataUser ?? rootUser ?? data ?? root;
  const user = normalizeUser(userSource);
  const metricSources = [root, data, rootUser, dataUser, rootMetrics, dataMetrics];
  const balanceValue = pickMetric(metricSources, 'balance');
  const influenceValue = pickMetric(metricSources, 'influence');
  const powerValue = pickMetric(metricSources, 'power');

  return {
    user,
    balance: String(balanceValue ?? 0),
    influence: String(influenceValue ?? 0),
    power: String(powerValue ?? 0),
  };
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      balance: '0',
      influence: '0',
      power: '0',
      isLoading: false,
      clearAuth: () => set({ user: null, balance: '0', influence: '0', power: '0', isLoading: false }),
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
          set({ user: null, balance: '0', influence: '0', power: '0', isLoading: false });
        }

        toast.success('Signed out successfully.');
      },
      fetchMe: async () => {
        set({ isLoading: true });
        try {
          const response = await api.get('/auth/me');
          const { user, balance, influence, power } = extractAuthPayload(response.data as Record<string, unknown>);
          set({ user, balance, influence, power, isLoading: false });
        } catch (error) {
          set({ user: null, balance: '0', influence: '0', power: '0', isLoading: false });
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
        influence: state.influence,
        power: state.power,
      }),
    },
  ),
);
