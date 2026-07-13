'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { MarketDetail } from '@/components/markets/MarketDetail';
import { Button } from '@/components/ui/Button';
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
  const isLoading = useMarketStore((state) => state.isLoading);
  const fetchMarket = useMarketStore((state) => state.fetchMarket);

  useEffect(() => {
    void fetchMarket(params.id);
  }, [fetchMarket, params.id]);

  if (isLoading && !market) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-gold-light">Loading market</p>
        <p className="mt-3 text-text-secondary">Gathering price history and current outcome probabilities…</p>
      </Card>
    );
  }

  if (!market || market.id !== params.id) {
    return (
      <Card className="p-8 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Market unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          This market could not be loaded. It may have been removed or is currently inaccessible.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/dashboard">
            <Button>Return to dashboard</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return <MarketDetail market={market} currentUserId={user?.id} />;
}
