'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { MarketCard } from '@/components/markets/MarketCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useMarkets } from '@/hooks/useMarkets';
import type { Market } from '@/lib/types';
import { computeLmsrLegitimacy } from '@/lib/utils';
import { useLeaderboardStore } from '@/store/leaderboardStore';

type MarketSortOption = 'legitimacy' | 'newest' | 'oldest' | 'liquidity' | 'title';

function sortMarkets(markets: Market[], sortBy: MarketSortOption) {
  const sorted = [...markets];

  sorted.sort((a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }

    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    if (sortBy === 'liquidity') {
      return Number(b.liquidityB) - Number(a.liquidityB);
    }

    const legitimacyA = computeLmsrLegitimacy(
      a.outcomes.map((outcome) => outcome.qValue),
      a.liquidityB,
    );
    const legitimacyB = computeLmsrLegitimacy(
      b.outcomes.map((outcome) => outcome.qValue),
      b.liquidityB,
    );
    return legitimacyB - legitimacyA;
  });

  return sorted;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { markets, isLoading, fetchMarkets } = useMarkets();
  const [marketSort, setMarketSort] = useState<MarketSortOption>('legitimacy');
  const entries = useLeaderboardStore((state) => state.entries);
  const leaderboardLoading = useLeaderboardStore((state) => state.isLoading);
  const fetchLeaderboard = useLeaderboardStore((state) => state.fetchLeaderboard);

  useEffect(() => {
    void Promise.all([fetchMarkets(), fetchLeaderboard()]);
  }, [fetchLeaderboard, fetchMarkets]);

  const activeMarkets = markets.filter((market) => !market.isUnmade);
  const archivedMarkets = markets.filter((market) => market.isUnmade);
  const sortedActiveMarkets = useMemo(() => sortMarkets(activeMarkets, marketSort), [activeMarkets, marketSort]);
  const sortedArchivedMarkets = useMemo(() => sortMarkets(archivedMarkets, marketSort), [archivedMarkets, marketSort]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card className="p-6 md:p-8" glow>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-gold-light">Dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold text-text-primary">Welcome back{user ? `, ${user.username}` : ''}.</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-text-secondary">
                Monitor active governance questions, see who is accumulating predictive power, and launch new markets when a decision needs structured signal.
              </p>
            </div>
            <Link href="/markets/new">
              <Button>Create Market</Button>
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-[#141414] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Active markets</p>
              <p className="mt-2 text-3xl font-semibold text-text-primary">{activeMarkets.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-[#141414] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Archived markets</p>
              <p className="mt-2 text-3xl font-semibold text-text-primary">{archivedMarkets.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-[#141414] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Leaderboard depth</p>
              <p className="mt-2 text-3xl font-semibold text-text-primary">{entries.length}</p>
            </div>
          </div>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-text-primary">Active Markets</h2>
            <div className="flex items-center gap-3">
              <label className="text-sm text-text-secondary" htmlFor="market-sort">
                Sort by
              </label>
              <select
                id="market-sort"
                value={marketSort}
                onChange={(event) => setMarketSort(event.target.value as MarketSortOption)}
                className="h-10 rounded-xl border border-border bg-[#121212] px-3 text-sm text-text-primary outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
              >
                <option value="legitimacy">Legitimacy</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="liquidity">Liquidity</option>
                <option value="title">Title</option>
              </select>
              {(isLoading || leaderboardLoading) ? (
                <span className="text-sm text-text-secondary">Refreshing live signal…</span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4">
            {sortedActiveMarkets.length ? (
              sortedActiveMarkets.map((market) => <MarketCard key={market.id} market={market} />)
            ) : (
              <Card className="border-dashed p-8 text-center">
                <h3 className="text-xl font-semibold text-text-primary">No active markets</h3>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  Create a new market to begin collecting structured belief across your community.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link href="/markets/new">
                    <Button>Create market</Button>
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-text-primary">Archived Markets</h2>
          </div>

          <div className="grid gap-4">
            {sortedArchivedMarkets.length ? (
              sortedArchivedMarkets.map((market) => <MarketCard key={market.id} market={market} />)
            ) : (
              <Card className="border-dashed p-8 text-center">
                <h3 className="text-xl font-semibold text-text-primary">No archived markets</h3>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  Unmade markets will appear here so you can still open their details and review outcomes.
                </p>
              </Card>
            )}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <div className="xl:sticky xl:top-6">
          <Leaderboard entries={entries} currentUserId={user?.id} />
        </div>
      </div>
    </div>
  );
}
