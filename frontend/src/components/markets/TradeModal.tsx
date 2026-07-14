'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { Market } from '@/lib/types';
import { computeLmsrCost, computeLmsrLegitimacy, formatDecimal } from '@/lib/utils';
import { ProbabilityBar } from '@/components/markets/ProbabilityBar';

interface TradeModalProps {
  market: Market;
  open: boolean;
  onClose: () => void;
  onSubmit: (deltaQ: string[]) => Promise<void>;
}

export function TradeModal({ market, open, onClose, onSubmit }: TradeModalProps) {
  const [deltaQ, setDeltaQ] = useState<string[]>(market.outcomes.map(() => '0'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDeltaQ(market.outcomes.map(() => '0'));
    }
  }, [market.outcomes, open]);

  const estimatedCost = useMemo(
    () =>
      computeLmsrCost(
        market.outcomes.map((outcome) => outcome.qValue),
        deltaQ,
        market.liquidityB,
      ),
    [deltaQ, market.liquidityB, market.outcomes],
  );

  const takePreview = useMemo(() => {
    const b = Math.max(Number(market.liquidityB) || 1, 0.0001);
    const postTradeQ = market.outcomes.map((outcome, index) => Number(outcome.qValue || 0) + Number(deltaQ[index] || 0));
    const scaled = postTradeQ.map((value) => value / b);
    const maxValue = Math.max(...scaled, 0);
    const exps = scaled.map((value) => Math.exp(value - maxValue));
    const total = exps.reduce((sum, value) => sum + value, 0) || 1;

    return {
      probabilities: exps.map((value) => value / total),
      legitimacy: computeLmsrLegitimacy(postTradeQ.map((value) => String(value)), b),
    };
  }, [deltaQ, market.liquidityB, market.outcomes]);

  const hasTrade = deltaQ.some((value) => Math.abs(Number(value || 0)) > 0);

  const handleChange = (index: number, value: string) => {
    setDeltaQ((current) => current.map((entry, entryIndex) => (entryIndex === index ? value : entry)));
  };

  const handleSubmit = async () => {
    if (!hasTrade) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(deltaQ.map((value) => String(Number(value || 0))));
      onClose();
    } catch {
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Trade: ${market.title}`}
      description="Positive values buy additional exposure; negative values sell exposure. The server computes final settlement authoritatively."
    >
      <div className="space-y-6">
        <div className="grid gap-3">
          {market.outcomes.map((outcome, index) => (
            <div key={outcome.id} className="rounded-2xl border border-border bg-[#141414] p-4">
              <ProbabilityBar label={outcome.name} value={market.probabilities[index] ?? 0} />
              <div className="mt-4">
                <Input
                  label="Delta shares"
                  type="number"
                  step="0.01"
                  value={deltaQ[index] ?? '0'}
                  onChange={(event) => handleChange(index, event.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border border-gold/20 bg-gold/5 p-4 text-sm">
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-light">Take preview</h4>
          <div className="flex items-center justify-between gap-4">
            <span className="text-text-secondary">Estimated cost</span>
            <span className="text-lg font-semibold text-gold-light">Ξ {formatDecimal(estimatedCost, 4)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-text-secondary">Legitimacy (post-trade)</span>
            <span className="text-lg font-semibold text-gold-light">{formatDecimal(takePreview.legitimacy, 4)}</span>
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-[#141414] p-3">
            {market.outcomes.map((outcome, index) => (
              <ProbabilityBar key={`take-preview-${outcome.id}`} label={outcome.name} value={takePreview.probabilities[index] ?? 0} />
            ))}
          </div>
          <p className="mt-2 text-text-secondary">
            This preview uses the current LMSR surface. Final execution, balances, and slippage remain server-authoritative.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!hasTrade} loading={isSubmitting}>
            Execute Trade
          </Button>
        </div>
      </div>
    </Modal>
  );
}
