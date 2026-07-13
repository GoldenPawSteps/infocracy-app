'use client';

import { useMemo } from 'react';

import { useMarketStore } from '@/store/marketStore';

export function useMarkets() {
  const store = useMarketStore();

  return useMemo(
    () => ({
      ...store,
      openMarkets: store.markets.filter((market) => !market.isUnmade),
      unmadeMarkets: store.markets.filter((market) => market.isUnmade),
    }),
    [store],
  );
}
