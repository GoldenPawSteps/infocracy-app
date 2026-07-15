'use client';

import { useEffect } from 'react';

import { MarketDetail } from '@/components/markets/MarketDetail';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useMarketStore } from '@/store/marketStore';

interface MarketPageProps {
  params: {
    id: string;
  };
}

export default function MarketPage({ params }: MarketPageProps) {
  const { user } = useAuth();
  const market = useMarketStore((state) => state.selectedMarket);
  const loadingMarketId = useMarketStore((state) => state.loadingMarketId);
  const fetchMarket = useMarketStore((state) => state.fetchMarket);

  useEffect(() => {
    // Always refresh route market details so charts have complete action history,
    // while still allowing cached content to render during refresh.
    void fetchMarket(params.id);
  }, [fetchMarket, params.id]);

  const loadingState = (
    <div className="space-y-6">
      <Card className="overflow-hidden p-6 md:p-8" glow>
        <div className="h-2 w-full bg-gradient-to-r from-gold/30 via-gold-light/60 to-gold/30" />
        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-7 w-64 rounded-lg bg-[#1c1c1c]" />
          <div className="h-4 w-full max-w-3xl rounded-lg bg-[#171717]" />
          <div className="h-4 w-2/3 rounded-lg bg-[#171717]" />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-32 animate-pulse border-border bg-[#141414]" />
        <Card className="h-32 animate-pulse border-border bg-[#141414]" />
        <Card className="h-32 animate-pulse border-border bg-[#141414]" />
      </div>

      <Card className="p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 rounded-lg bg-[#1b1b1b]" />
          <div className="h-16 rounded-xl bg-[#151515]" />
          <div className="h-16 rounded-xl bg-[#151515]" />
          <div className="h-16 rounded-xl bg-[#151515]" />
        </div>
      </Card>
    </div>
  );

  // Show the market if we have it
  if (market && market.id === params.id) {
    return <MarketDetail market={market} currentUserId={user?.id} />;
  }

  // Show loading only if we're actively fetching this specific market
  if (loadingMarketId === params.id) {
    return loadingState;
  }

  // If we get here, market is not loaded and not loading - show loading placeholder
  return loadingState;
}
