import { Card } from '@/components/ui/Card';
import type { LeaderboardEntry } from '@/lib/types';
import { formatBalance, formatPower } from '@/lib/utils';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export function Leaderboard({ entries, currentUserId }: LeaderboardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Leaderboard</h2>
          <p className="mt-1 text-sm text-text-secondary">Top contributors ranked by market power.</p>
        </div>
        <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-gold-light">
          Power
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {entries.length ? (
          entries.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;
            return (
              <div
                key={entry.userId}
                className={`rounded-2xl border p-4 transition ${
                  isCurrentUser
                    ? 'border-gold/40 bg-gold/5 shadow-[0_0_0_1px_rgba(212,160,23,0.18)]'
                    : 'border-border bg-[#141414]'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Rank #{entry.rank}</p>
                    <p className="mt-1 font-semibold text-text-primary">{entry.username}</p>
                  </div>
                  <p className="text-lg font-semibold text-gold-light">{formatPower(entry.power)}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-text-secondary">
                  <div>
                    <p className="text-text-muted">Balance</p>
                    <p className="mt-1 text-text-primary">{formatBalance(entry.balance)}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Influence</p>
                    <p className="mt-1 text-text-primary">{entry.influence}</p>
                  </div>
                </div>
              </div>
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
