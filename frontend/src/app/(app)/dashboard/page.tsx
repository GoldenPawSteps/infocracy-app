'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
type MarketStatusFilter = 'all' | 'active' | 'unmade';

const DEFAULT_SORT: MarketSortOption = 'legitimacy';
const DEFAULT_STATUS: MarketStatusFilter = 'all';

function parseSort(value: string | null): MarketSortOption {
  if (value === 'entropy' || value === 'newest' || value === 'oldest' || value === 'liquidity' || value === 'title') {
    return value;
  }

  return DEFAULT_SORT;
}

function parseStatus(value: string | null): MarketStatusFilter {
  if (value === 'active' || value === 'unmade') {
    return value;
  }

  return DEFAULT_STATUS;
}

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

function MarketCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-3/5 rounded-lg bg-[#1b1b1b]" />
        <div className="h-4 w-full rounded-lg bg-[#161616]" />
        <div className="h-4 w-4/5 rounded-lg bg-[#161616]" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="h-3 w-1/2 rounded bg-[#161616]" />
            <div className="h-3 w-2/3 rounded bg-[#161616]" />
            <div className="h-3 w-1/3 rounded bg-[#161616]" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-[#161616]" />
            <div className="h-3 w-full rounded bg-[#161616]" />
            <div className="h-3 w-2/3 rounded bg-[#161616]" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function LeaderboardSkeleton() {
  return (
    <Card className="p-5">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-1/2 rounded-lg bg-[#1b1b1b]" />
        <div className="h-10 rounded-xl bg-[#151515]" />
        <div className="h-10 rounded-xl bg-[#151515]" />
        <div className="h-10 rounded-xl bg-[#151515]" />
        <div className="h-10 rounded-xl bg-[#151515]" />
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { markets, isLoading, fetchMarkets } = useMarkets();
  const marketSort = parseSort(searchParams.get('sort'));
  const marketStatusFilter = parseStatus(searchParams.get('status'));
  const marketSearch = searchParams.get('q') ?? '';
  const entries = useLeaderboardStore((state) => state.entries);
  const leaderboardLoading = useLeaderboardStore((state) => state.isLoading);
  const fetchLeaderboard = useLeaderboardStore((state) => state.fetchLeaderboard);

  useEffect(() => {
    void Promise.all([fetchMarkets(), fetchLeaderboard()]);
  }, [fetchLeaderboard, fetchMarkets]);

  useEffect(() => {
    const handleGlobalSearchShortcut = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const targetTag = target?.tagName?.toLowerCase();
      const typingIntoInput =
        targetTag === 'input' ||
        targetTag === 'textarea' ||
        targetTag === 'select' ||
        target?.isContentEditable;

      if (typingIntoInput) {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
    };

    window.addEventListener('keydown', handleGlobalSearchShortcut);
    return () => {
      window.removeEventListener('keydown', handleGlobalSearchShortcut);
    };
  }, []);

  const updateFilters = (next: {
    sort?: MarketSortOption;
    status?: MarketStatusFilter;
    search?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (next.sort !== undefined) {
      if (next.sort === DEFAULT_SORT) {
        params.delete('sort');
      } else {
        params.set('sort', next.sort);
      }
    }

    if (next.status !== undefined) {
      if (next.status === DEFAULT_STATUS) {
        params.delete('status');
      } else {
        params.set('status', next.status);
      }
    }

    if (next.search !== undefined) {
      const trimmed = next.search.trim();
      if (!trimmed) {
        params.delete('q');
      } else {
        params.set('q', trimmed);
      }
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const normalizedSearch = marketSearch.trim().toLowerCase();
  const hasActiveFilters = marketSort !== DEFAULT_SORT || marketStatusFilter !== DEFAULT_STATUS || normalizedSearch.length > 0;

  const filteredMarkets = useMemo(
    () =>
      markets.filter((market) => {
        if (marketStatusFilter === 'active' && market.isUnmade) return false;
        if (marketStatusFilter === 'unmade' && !market.isUnmade) return false;

        if (normalizedSearch) {
          const searchable = [
            market.title,
            market.description,
            market.makerUsername,
            ...market.outcomes.map((outcome) => outcome.name),
          ]
            .join(' ')
            .toLowerCase();

          if (!searchable.includes(normalizedSearch)) {
            return false;
          }
        }

        return true;
      }),
    [marketStatusFilter, markets, normalizedSearch],
  );
  const sortedMarkets = useMemo(() => sortMarkets(filteredMarkets, marketSort), [filteredMarkets, marketSort]);
  const activeMarkets = markets.filter((market) => !market.isUnmade);
  const archivedMarkets = markets.filter((market) => market.isUnmade);
  const showMarketSkeletons = isLoading && markets.length === 0;
  const showLeaderboardSkeleton = leaderboardLoading && entries.length === 0;

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
            <Link href={user ? '/markets/new' : '/signin'}>
              <Button>{user ? 'Create Market' : 'Sign in to Trade'}</Button>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="search" aria-label="Market filters">
            <h2 className="text-2xl font-semibold text-text-primary">Markets</h2>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <label htmlFor="market-search" className="sr-only">
                Search markets
              </label>
              <input
                ref={searchInputRef}
                id="market-search"
                type="text"
                placeholder="Search markets by title, description, maker, or outcome"
                value={marketSearch}
                onChange={(event) => updateFilters({ search: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && marketSearch) {
                    event.preventDefault();
                    updateFilters({ search: '' });
                  }
                }}
                aria-describedby="market-search-shortcut market-results-count"
                className="focus-ring rounded-xl border border-border bg-[#121212] px-3 py-2 text-base md:text-sm text-text-primary placeholder-text-muted transition focus:border-gold"
              />
              <p id="market-search-shortcut" className="sr-only">
                Press slash to focus search. Press escape to clear search.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-text-secondary" htmlFor="market-status-filter">
                Status
              </label>
              <select
                id="market-status-filter"
                value={marketStatusFilter}
                onChange={(event) => updateFilters({ status: event.target.value as MarketStatusFilter })}
                className="focus-ring h-10 rounded-xl border border-border bg-[#121212] px-3 text-sm text-text-primary transition focus:border-gold"
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
                onChange={(event) => updateFilters({ sort: event.target.value as MarketSortOption })}
                className="focus-ring h-10 rounded-xl border border-border bg-[#121212] px-3 text-sm text-text-primary transition focus:border-gold"
              >
                <option value="legitimacy">Legitimacy</option>
                <option value="entropy">Entropy</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="liquidity">Liquidity</option>
                <option value="title">Title</option>
              </select>
              {hasActiveFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateFilters({ sort: DEFAULT_SORT, status: DEFAULT_STATUS, search: '' })}
                  aria-label="Clear market filters"
                >
                  Clear filters
                </Button>
              ) : null}
              {(isLoading || leaderboardLoading) ? (
                <span className="text-sm text-text-secondary">Refreshing live signal…</span>
              ) : null}
            </div>
          </div>

          <p id="market-results-count" className="text-sm text-text-secondary" role="status" aria-live="polite">
            Showing {sortedMarkets.length} of {markets.length} markets.
          </p>

          <div className="grid gap-4" aria-busy={showMarketSkeletons}>
            {showMarketSkeletons ? (
              <>
                <MarketCardSkeleton />
                <MarketCardSkeleton />
                <MarketCardSkeleton />
              </>
            ) : sortedMarkets.length ? (
              sortedMarkets.map((market) => <MarketCard key={market.id} market={market} />)
            ) : (
              <Card className="border-dashed p-8 text-center">
                {markets.length ? (
                  <>
                    <h3 className="text-xl font-semibold text-text-primary">No matches for the current filters</h3>
                    <p className="mt-3 text-sm leading-6 text-text-secondary">
                      Try broadening your search or clearing filters to explore all markets.
                    </p>
                    <div className="mt-6 flex justify-center">
                      <Button onClick={() => updateFilters({ sort: DEFAULT_SORT, status: DEFAULT_STATUS, search: '' })}>Clear filters</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-text-primary">No markets yet</h3>
                    <p className="mt-3 text-sm leading-6 text-text-secondary">
                      Create a new market to begin collecting structured belief across your community.
                    </p>
                    <div className="mt-6 flex justify-center">
                      <Link href={user ? '/markets/new' : '/signin'}>
                        <Button>{user ? 'Create market' : 'Sign in to create'}</Button>
                      </Link>
                    </div>
                  </>
                )}
              </Card>
            )}
          </div>
        </section>
      </div>

      <div className="space-y-6 stagger-enter">
        <div className="xl:sticky xl:top-6">
          {showLeaderboardSkeleton ? <LeaderboardSkeleton /> : <Leaderboard entries={entries} currentUserId={user?.id} />}
        </div>
      </div>
    </div>
  );
}
