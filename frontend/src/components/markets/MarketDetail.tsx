'use client';

import { useMemo, useState } from 'react';

import { ProbabilityBar } from '@/components/markets/ProbabilityBar';
import { TradeModal } from '@/components/markets/TradeModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Market } from '@/lib/types';
import { formatDate, formatDecimal } from '@/lib/utils';
import { useMarketStore } from '@/store/marketStore';

interface MarketDetailProps {
  market: Market;
  currentUserId?: string;
}

export function MarketDetail({ market, currentUserId }: MarketDetailProps) {
  const executeTrade = useMarketStore((state) => state.executeTrade);
  const unmakeMarket = useMarketStore((state) => state.unmakeMarket);
  const isLoading = useMarketStore((state) => state.isLoading);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [showDecision, setShowDecision] = useState(false);

  const isMaker = currentUserId === market.makerId;
  const canTrade = !market.isUnmade && !isMaker;

  const decisionDraft = useMemo(() => {
    const ordered = market.outcomes
      .map((outcome, index) => ({
        outcome: outcome.name,
        probability: market.probabilities[index] ?? 0,
      }))
      .sort((left, right) => right.probability - left.probability);

    const leader = ordered[0];
    const runnerUp = ordered[1];

    return {
      headline: `Current signal favors “${leader?.outcome ?? 'No leading outcome'}”.`,
      summary: `The market currently assigns ${((leader?.probability ?? 0) * 100).toFixed(1)}% probability to ${leader?.outcome ?? 'the leading outcome'}${
        runnerUp ? `, with ${runnerUp.outcome} next at ${(runnerUp.probability * 100).toFixed(1)}%.` : '.'
      }`,
      guidance:
        'Use this as an illustrative governance note, not an authoritative decision. Pair the market signal with deliberation, legal constraints, and implementation review before acting.',
    };
  }, [market.outcomes, market.probabilities]);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-6 md:p-8" glow>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-gold-light">
                    Market
                  </span>
                  {market.isUnmade ? (
                    <span className="rounded-full border border-danger/40 bg-danger/10 px-3 py-1 text-xs font-medium text-danger">Unmade</span>
                  ) : (
                    <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">Active</span>
                  )}
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-text-primary">{market.title}</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">{market.description}</p>
              </div>

              <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <Button type="button" onClick={() => setTradeOpen(true)} disabled={!canTrade}>
                  Trade
                </Button>
                {isMaker ? (
                  <Button type="button" variant="danger" onClick={() => void unmakeMarket(market.id)} disabled={market.isUnmade} loading={isLoading}>
                    Unmake
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={() => setShowDecision((current) => !current)}>
                  Sample Governance Decision
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Maker</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{market.makerUsername}</p>
              </div>
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Liquidity (b)</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{formatDecimal(market.liquidityB, 2)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Created</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{formatDate(market.createdAt)}</p>
              </div>
            </div>

            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-text-primary">Current probabilities</h2>
              {market.outcomes.map((outcome, index) => (
                <div key={outcome.id} className="rounded-2xl border border-border bg-[#141414] p-4">
                  <ProbabilityBar label={outcome.name} value={market.probabilities[index] ?? 0} />
                  {market.myPosition?.[index] ? (
                    <p className="mt-3 text-sm text-text-secondary">
                      Your position: <span className="text-text-primary">{formatDecimal(market.myPosition[index], 4)} shares</span>
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            {showDecision ? (
              <Card className="border-gold/20 bg-gold/5 p-5">
                <h3 className="text-lg font-semibold text-gold-light">{decisionDraft.headline}</h3>
                <p className="mt-3 text-sm leading-6 text-text-primary">{decisionDraft.summary}</p>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{decisionDraft.guidance}</p>
              </Card>
            ) : null}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-text-primary">Trade history</h2>
            <span className="text-sm text-text-secondary">{market.trades?.length ?? 0} events</span>
          </div>
          <div className="mt-5 space-y-3">
            {market.trades?.length ? (
              market.trades.map((trade) => (
                <div key={trade.id} className="rounded-2xl border border-border bg-[#141414] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-text-primary">{trade.takerUsername ?? 'Participant'}</p>
                    <p className="text-sm text-gold-light">Ξ {formatDecimal(trade.cost, 4)}</p>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-text-muted">{formatDate(trade.createdAt)}</p>
                  <div className="mt-3 grid gap-2 text-sm text-text-secondary">
                    {trade.deltaQ.map((delta, index) => (
                      <div key={`${trade.id}-${index}`} className="flex items-center justify-between gap-3">
                        <span>{market.outcomes[index]?.name ?? `Outcome ${index + 1}`}</span>
                        <span className="text-text-primary">{Number(delta) > 0 ? '+' : ''}{formatDecimal(delta, 2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm leading-6 text-text-secondary">
                No trades yet. Early conviction will move the market the most.
              </div>
            )}
          </div>
        </Card>
      </div>

      <TradeModal market={market} open={tradeOpen} onClose={() => setTradeOpen(false)} onSubmit={(deltaQ) => executeTrade(market.id, deltaQ)} />
    </>
  );
}
