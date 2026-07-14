import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import type { Market } from '@/lib/types';
import { computeLmsrLegitimacy, excerpt, formatDate, formatDecimal } from '@/lib/utils';
import { ProbabilityBar } from '@/components/markets/ProbabilityBar';

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const legitimacy = computeLmsrLegitimacy(
    market.outcomes.map((outcome) => outcome.qValue),
    market.liquidityB,
  );

  return (
    <Link href={`/markets/${market.id}`} className="block">
      <Card className="group h-full p-5 transition duration-200 hover:border-gold/40 hover:bg-[#1d1d1d] hover:shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-text-primary transition group-hover:text-gold-light">{market.title}</h3>
              {market.isUnmade ? (
                <span className="rounded-full border border-danger/40 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
                  Unmade
                </span>
              ) : (
                <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  Active
                </span>
              )}
            </div>
            <p className="mt-3 text-sm leading-6 text-text-secondary">{excerpt(market.description, 180)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-1 text-sm text-text-secondary">
            <p>
              <span className="text-text-muted">Maker:</span> {market.makerUsername}
            </p>
            <p>
              <span className="text-text-muted">Created:</span> {formatDate(market.createdAt)}
            </p>
            <p>
              <span className="text-text-muted">Outcomes:</span> {market.nOutcomes}
            </p>
            <p>
              <span className="text-text-muted">Liquidity:</span> {formatDecimal(market.liquidityB, 2)}
            </p>
            <p>
              <span className="text-text-muted">Legitimacy:</span> {formatDecimal(legitimacy, 4)}
            </p>
          </div>
          <div className="space-y-3">
            {market.outcomes.slice(0, 3).map((outcome, index) => (
              <ProbabilityBar key={outcome.id} label={outcome.name} value={market.probabilities[index] ?? 0} />
            ))}
            {market.outcomes.length > 3 ? (
              <p className="text-xs text-text-muted">+ {market.outcomes.length - 3} more outcomes</p>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
