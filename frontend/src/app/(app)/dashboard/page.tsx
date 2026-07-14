'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { MarketCard } from '@/components/markets/MarketCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useMarkets } from '@/hooks/useMarkets';
import { useLeaderboardStore } from '@/store/leaderboardStore';

export default function DashboardPage() {
  const { user } = useAuth();
  const { markets, isLoading, fetchMarkets } = useMarkets();
  const entries = useLeaderboardStore((state) => state.entries);
  const leaderboardLoading = useLeaderboardStore((state) => state.isLoading);
  const fetchLeaderboard = useLeaderboardStore((state) => state.fetchLeaderboard);

  useEffect(() => {
    void Promise.all([fetchMarkets(), fetchLeaderboard()]);
  }, [fetchLeaderboard, fetchMarkets]);

  const activeMarkets = markets.filter((market) => !market.isUnmade);
  const archivedMarkets = markets.filter((market) => market.isUnmade);

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
            {(isLoading || leaderboardLoading) ? (
              <span className="text-sm text-text-secondary">Refreshing live signal…</span>
            ) : null}
          </div>

          <div className="grid gap-4">
            {activeMarkets.length ? (
              activeMarkets.map((market) => <MarketCard key={market.id} market={market} />)
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
            {archivedMarkets.length ? (
              archivedMarkets.map((market) => <MarketCard key={market.id} market={market} />)
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
