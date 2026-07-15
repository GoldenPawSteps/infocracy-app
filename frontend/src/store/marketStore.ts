'use client';

import { create } from 'zustand';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import type { CreateMarketDto, Market } from '@/lib/types';
import { getApiErrorMessage, normalizeMarket } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface MarketStore {
  markets: Market[];
  selectedMarket: Market | null;
  isLoading: boolean;
  loadingMarketId: string | null;
  fetchMarkets: () => Promise<void>;
  fetchMarket: (id: string) => Promise<void>;
  createMarket: (data: CreateMarketDto) => Promise<void>;
  executeTrade: (marketId: string, deltaQ: string[]) => Promise<void>;
  unmakeMarket: (marketId: string) => Promise<void>;
  clearSelectedMarket: () => void;
}

const extractMarketList = (payload: Record<string, unknown> | unknown): Record<string, unknown>[] => {
  const source = (payload as Record<string, unknown>)?.data ?? (payload as Record<string, unknown>)?.markets ?? payload;
  return Array.isArray(source) ? (source as Record<string, unknown>[]) : [];
};

const extractMarket = (payload: Record<string, unknown> | unknown): Record<string, unknown> => {
  const source = (payload as Record<string, unknown>)?.data ?? (payload as Record<string, unknown>)?.market ?? payload;
  return (source as Record<string, unknown>) ?? {};
};

export const useMarketStore = create<MarketStore>((set, get) => ({
  markets: [],
  selectedMarket: null,
  isLoading: false,
  loadingMarketId: null,
  fetchMarkets: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/markets');
      const markets = extractMarketList(response.data).map((market) => normalizeMarket(market));
      set({
        markets,
        selectedMarket: get().selectedMarket
          ? markets.find((market) => market.id === get().selectedMarket?.id) ?? get().selectedMarket
          : null,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      toast.error(getApiErrorMessage(error, 'Unable to load markets.'));
    }
  },
  fetchMarket: async (id) => {
    set({ loadingMarketId: id });
    try {
      const marketResponse = await api.get(`/markets/${id}`);

      const market = normalizeMarket(extractMarket(marketResponse.data));
      const selectedMarket = { ...market, trades: market.trades ?? [] };

      set((state) => ({
        selectedMarket,
        markets: state.markets.some((entry) => entry.id === id)
          ? state.markets.map((entry) => (entry.id === id ? { ...entry, ...selectedMarket } : entry))
          : [selectedMarket, ...state.markets],
        loadingMarketId: null,
      }));
    } catch (error) {
      set({ loadingMarketId: null });
      toast.error(getApiErrorMessage(error, 'Unable to load market details.'));
    }
  },
  createMarket: async (data) => {
    set({ isLoading: true });
    try {
      await api.post('/markets', {
        title: data.title,
        description: data.description,
        outcomes: data.outcomes.map((name) => ({ name })),
        liquidityB: data.liquidityB,
        initialQ: data.initialQ,
      });
      await Promise.all([get().fetchMarkets(), useAuthStore.getState().fetchMe()]);
      toast.success('Market created successfully.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create market.'));
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  executeTrade: async (marketId, deltaQ) => {
    set({ isLoading: true });
    try {
      await api.post(`/markets/${marketId}/trade`, { deltaQ });
      await Promise.all([get().fetchMarket(marketId), get().fetchMarkets(), useAuthStore.getState().fetchMe()]);
      toast.success('Trade executed. Market state refreshed.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to execute trade.'));
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  unmakeMarket: async (marketId) => {
    set({ isLoading: true });
    try {
      await api.post(`/markets/${marketId}/unmake`);
      await Promise.all([get().fetchMarket(marketId), get().fetchMarkets(), useAuthStore.getState().fetchMe()]);
      toast.success('Market unmade successfully.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to unmake market.'));
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  clearSelectedMarket: () => {
    set({ selectedMarket: null });
  },
}));
