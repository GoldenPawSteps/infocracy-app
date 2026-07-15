"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { LeaderboardEntry } from '@/lib/types';
import { formatBalance, formatInfluence, formatPower } from '@/lib/utils';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

type LeaderboardSortOption = 'power' | 'balance' | 'influence';

const metricValue = (entry: LeaderboardEntry, metric: LeaderboardSortOption) => Number(entry[metric] ?? 0);

export function Leaderboard({ entries, currentUserId }: LeaderboardProps) {
  const [sortBy, setSortBy] = useState<LeaderboardSortOption>('power');

  const sortedEntries = useMemo(() => {
    return [...entries].sort((left, right) => {
      const metricDelta = metricValue(right, sortBy) - metricValue(left, sortBy);
      if (Math.abs(metricDelta) > 0.0000001) {
        return metricDelta;
      }

      return left.rank - right.rank;
    });
  }, [entries, sortBy]);

  const sortBadge = sortBy === 'power' ? '⚡ Power' : sortBy === 'balance' ? '💰 Balance' : '🧭 Influence';

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Leaderboard</h2>
          <p className="mt-1 text-sm text-text-secondary">Top contributors ranked by the selected metric.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="leaderboard-sort" className="text-xs uppercase tracking-[0.16em] text-text-muted">
            Sort
          </label>
          <select
            id="leaderboard-sort"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as LeaderboardSortOption)}
            className="h-9 min-w-0 max-w-full rounded-xl border border-border bg-[#121212] px-3 text-sm text-text-primary outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
          >
            <option value="power">Power</option>
            <option value="balance">Balance</option>
            <option value="influence">Influence</option>
          </select>
          <span className="max-w-full truncate rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-gold-light">
            {sortBadge}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {sortedEntries.length ? (
          sortedEntries.map((entry, index) => {
            const isCurrentUser = entry.userId === currentUserId;
            return (
              <Link key={entry.userId} href={`/profile?user=${entry.userId}`}>
                <div
                  className={`cursor-pointer rounded-2xl border p-4 transition hover:shadow-lg ${
                    isCurrentUser
                      ? 'border-gold/40 bg-gold/5 shadow-[0_0_0_1px_rgba(212,160,23,0.18)] hover:border-gold/60'
                      : 'border-border bg-[#141414] hover:border-gold/40 hover:bg-[#1a1a1a]'
                  }`}
                >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Rank #{index + 1}</p>
                    <p className="mt-1 font-semibold text-text-primary">{entry.username}</p>
                  </div>
                  <p className="text-lg font-semibold text-gold-light">{formatPower(entry.power)}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-text-secondary">
                  <div className="rounded-xl border border-border bg-[#101010] px-3 py-2">
                    <p className="text-text-primary">{formatBalance(entry.balance)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-[#101010] px-3 py-2">
                    <p className="text-text-primary">{formatInfluence(entry.influence)}</p>
                  </div>
                </div>
              </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm leading-6 text-text-secondary">
            No leaderboard data yet. Once trading begins, rankings will appear here in real time.
          </div>
        )}
      </div>
    </Card>
  );
}
