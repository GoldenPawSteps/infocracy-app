'use client';

import { useEffect } from 'react';

import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useLeaderboardStore } from '@/store/leaderboardStore';
import { useMarketStore } from '@/store/marketStore';

export function useSocket() {
  useEffect(() => {
    const socket = connectSocket();

    const refreshMarkets = async () => {
      await useMarketStore.getState().fetchMarkets();
      const selected = useMarketStore.getState().selectedMarket;
      if (selected?.id) {
        await useMarketStore.getState().fetchMarket(selected.id);
      }
    };

    const refreshSingleMarket = async (payload?: { marketId?: string; id?: string }) => {
      await useMarketStore.getState().fetchMarkets();
      const marketId = payload?.marketId ?? payload?.id ?? useMarketStore.getState().selectedMarket?.id;
      if (marketId) {
        await useMarketStore.getState().fetchMarket(marketId);
      }
      await useAuthStore.getState().fetchMe();
    };

    const handleMarketCreated = async (payload?: { id?: string }) => {
      await refreshSingleMarket(payload);
    };
    const handleMarketTraded = async (payload?: { marketId?: string }) => {
      await refreshSingleMarket(payload);
    };
    const handleMarketUnmade = async (payload?: { marketId?: string }) => {
      await refreshSingleMarket(payload);
    };
    const handleLeaderboardUpdated = async () => {
      await Promise.all([useLeaderboardStore.getState().fetchLeaderboard(), refreshMarkets()]);
    };

    socket.on('market:created', handleMarketCreated);
    socket.on('market:traded', handleMarketTraded);
    socket.on('market:unmade', handleMarketUnmade);
    socket.on('leaderboard:updated', handleLeaderboardUpdated);

    return () => {
      socket.off('market:created', handleMarketCreated);
      socket.off('market:traded', handleMarketTraded);
      socket.off('market:unmade', handleMarketUnmade);
      socket.off('leaderboard:updated', handleLeaderboardUpdated);
      disconnectSocket();
    };
  }, []);
}
