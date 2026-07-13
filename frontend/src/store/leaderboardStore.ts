'use client';

import { create } from 'zustand';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import type { LeaderboardEntry } from '@/lib/types';
import { getApiErrorMessage, normalizeLeaderboardEntry } from '@/lib/utils';

interface LeaderboardStore {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  fetchLeaderboard: () => Promise<void>;
}

export const useLeaderboardStore = create<LeaderboardStore>((set) => ({
  entries: [],
  isLoading: false,
  fetchLeaderboard: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/leaderboard');
      const payload = (response.data?.data ?? response.data?.leaderboard ?? response.data) as unknown;
      const entries = Array.isArray(payload)
        ? payload.map((entry, index) => normalizeLeaderboardEntry(entry as Record<string, unknown>, index))
        : [];
      set({ entries, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error(getApiErrorMessage(error, 'Unable to load the leaderboard.'));
    }
  },
}));
