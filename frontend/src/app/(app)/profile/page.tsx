'use client';

import { useEffect, useMemo } from 'react';

import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useMarkets } from '@/hooks/useMarkets';
import { formatBalance, formatDate, formatPower } from '@/lib/utils';

export default function ProfilePage() {
  const { user, balance, power } = useAuth();
  const { markets, fetchMarkets } = useMarkets();

  useEffect(() => {
    if (!markets.length) {
      void fetchMarkets();
    }
  }, [fetchMarkets, markets.length]);

  const createdMarkets = useMemo(() => markets.filter((market) => market.makerId === user?.id), [markets, user?.id]);
  const activePositions = useMemo(
    () =>
      markets.filter((market) =>
        market.myPosition?.some((position) => Math.abs(Number(position || 0)) > 0.0001),
      ),
    [markets],
  );

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8" glow>
        <p className="text-sm uppercase tracking-[0.24em] text-gold-light">Profile</p>
        <h1 className="mt-3 text-3xl font-semibold text-text-primary">{user?.username ?? 'Infocracy Member'}</h1>
        <p className="mt-3 text-base leading-7 text-text-secondary">
          Track the capital, power, and market footprint behind your governance activity.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text-primary">Account details</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Email</p>
                <p className="mt-2 text-text-primary">{user?.email ?? '—'}</p>
              </div>
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Joined</p>
                <p className="mt-2 text-text-primary">{formatDate(user?.createdAt)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text-primary">Market footprint</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Markets created</p>
                <p className="mt-2 text-3xl font-semibold text-text-primary">{createdMarkets.length}</p>
              </div>
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Active positions</p>
                <p className="mt-2 text-3xl font-semibold text-text-primary">{activePositions.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text-primary">Created markets</h2>
            <div className="mt-5 space-y-3">
              {createdMarkets.length ? (
                createdMarkets.map((market) => (
                  <div key={market.id} className="rounded-2xl border border-border bg-[#141414] p-4">
                    <p className="font-medium text-text-primary">{market.title}</p>
                    <p className="mt-1 text-sm text-text-secondary">{market.description}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-text-secondary">
                  You have not created any markets yet.
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text-primary">Account metrics</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Current balance</p>
                <p className="mt-2 text-2xl font-semibold text-gold-light">{formatBalance(balance)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Market power</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{formatPower(power)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text-primary">Position summary</h2>
            <div className="mt-5 space-y-3">
              {activePositions.length ? (
                activePositions.map((market) => (
                  <div key={market.id} className="rounded-2xl border border-border bg-[#141414] p-4">
                    <p className="font-medium text-text-primary">{market.title}</p>
                    <div className="mt-3 space-y-2 text-sm text-text-secondary">
                      {market.outcomes.map((outcome, index) => {
                        const position = Number(market.myPosition?.[index] ?? 0);
                        if (!position) {
                          return null;
                        }

                        return (
                          <div key={`${market.id}-${outcome.id}`} className="flex items-center justify-between gap-3">
                            <span>{outcome.name}</span>
                            <span className="text-text-primary">{position.toFixed(4)} shares</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-text-secondary">
                  You do not currently hold any disclosed market positions.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
