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

type MarketSortOption = 'legitimacy' | 'entropy' | 'newest' | 'oldest' | 'liquidity' | 'title';

function computeEntropy(probabilities: number[]) {
  return probabilities.reduce((sum, probability) => {
    if (!Number.isFinite(probability) || probability <= 0) {
      return sum;
    }

    return sum - probability * Math.log(probability);
  }, 0);
}

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

    if (sortBy === 'entropy') {
      return computeEntropy(b.probabilities) - computeEntropy(a.probabilities);
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
  const [marketStatusFilter, setMarketStatusFilter] = useState<'all' | 'active' | 'unmade'>('all');
  const [marketSearch, setMarketSearch] = useState<string>('');
  const entries = useLeaderboardStore((state) => state.entries);
  const leaderboardLoading = useLeaderboardStore((state) => state.isLoading);
  const fetchLeaderboard = useLeaderboardStore((state) => state.fetchLeaderboard);

  useEffect(() => {
    void Promise.all([fetchMarkets(), fetchLeaderboard()]);
  }, [fetchLeaderboard, fetchMarkets]);

  const filteredMarkets = useMemo(
    () =>
      markets.filter((market) => {
        if (marketStatusFilter === 'active' && market.isUnmade) return false;
        if (marketStatusFilter === 'unmade' && !market.isUnmade) return false;
        if (marketSearch && !market.title.toLowerCase().includes(marketSearch.toLowerCase())) return false;
        return true;
      }),
    [markets, marketStatusFilter, marketSearch],
  );
  const sortedMarkets = useMemo(() => sortMarkets(filteredMarkets, marketSort), [filteredMarkets, marketSort]);
  const activeMarkets = markets.filter((market) => !market.isUnmade);
  const archivedMarkets = markets.filter((market) => market.isUnmade);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6 stagger-enter">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold text-text-primary">Markets</h2>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Search markets..."
                value={marketSearch}
                onChange={(e) => setMarketSearch(e.target.value)}
                className="rounded-xl border border-border bg-[#121212] px-3 py-2 text-base md:text-sm text-text-primary placeholder-text-muted outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-text-secondary" htmlFor="market-status-filter">
                Status
              </label>
              <select
                id="market-status-filter"
                value={marketStatusFilter}
                onChange={(event) => setMarketStatusFilter(event.target.value as 'all' | 'active' | 'unmade')}
                className="h-10 rounded-xl border border-border bg-[#121212] px-3 text-sm text-text-primary outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="unmade">Unmade</option>
              </select>
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
                <option value="entropy">Entropy</option>
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
            {sortedMarkets.length ? (
              sortedMarkets.map((market) => <MarketCard key={market.id} market={market} />)
            ) : (
              <Card className="border-dashed p-8 text-center">
                <h3 className="text-xl font-semibold text-text-primary">No markets</h3>
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
      </div>

      <div className="space-y-6 stagger-enter">
        <div className="xl:sticky xl:top-6">
          <Leaderboard entries={entries} currentUserId={user?.id} />
        </div>
      </div>
    </div>
  );
}
