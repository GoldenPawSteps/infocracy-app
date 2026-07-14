'use client';

import { useEffect, useMemo, useState } from 'react';

import { ActionPreview } from '@/components/markets/ActionPreview';
import { ProbabilityBar } from '@/components/markets/ProbabilityBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { Market } from '@/lib/types';
import { computeLmsrCost, computeLmsrLegitimacy, computeProbabilities, computeTakerInfluence } from '@/lib/utils';

interface TradeModalProps {
  market: Market;
  currentUserId?: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (deltaQ: string[]) => Promise<void>;
}

export function TradeModal({ market, currentUserId, open, onClose, onSubmit }: TradeModalProps) {
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
    const currentProbabilities = computeProbabilities(market.outcomes, b);
    const currentShares = market.positions?.find((position) => position.userId === currentUserId)?.shares ?? market.outcomes.map(() => '0');
    const postTradeOutcomes = market.outcomes.map((outcome, index) => ({
      ...outcome,
      qValue: String(Number(outcome.qValue || 0) + Number(deltaQ[index] || 0)),
    }));
    const postTradeProbabilities = computeProbabilities(postTradeOutcomes, b);
    const currentInfluence = computeTakerInfluence(currentProbabilities, currentShares);
    const nextShares = currentShares.map((value, index) => Number(value || 0) + Number(deltaQ[index] || 0)).map(String);
    const nextInfluence = computeTakerInfluence(postTradeProbabilities, nextShares);

    return {
      probabilities: postTradeProbabilities,
      legitimacy: computeLmsrLegitimacy(postTradeOutcomes.map((outcome) => outcome.qValue), b),
      balanceChange: -estimatedCost,
      influenceChange: nextInfluence - currentInfluence,
      powerChange: -estimatedCost + (nextInfluence - currentInfluence),
    };
  }, [currentUserId, deltaQ, estimatedCost, market.liquidityB, market.outcomes, market.positions]);

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

        <ActionPreview
          title="Take preview"
          legitimacy={takePreview.legitimacy}
          probabilities={market.outcomes.map((outcome, index) => ({
            label: outcome.name,
            value: takePreview.probabilities[index] ?? 0,
          }))}
          balanceChange={takePreview.balanceChange}
          influenceChange={takePreview.influenceChange}
          powerChange={takePreview.powerChange}
        />

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
