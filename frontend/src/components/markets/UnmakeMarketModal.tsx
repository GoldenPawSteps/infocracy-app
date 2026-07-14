'use client';

import { useMemo } from 'react';

import { ActionPreview } from '@/components/markets/ActionPreview';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { Market } from '@/lib/types';
import { computeLmsrLegitimacy, computeMakerInfluence, computeProbabilities, computeTakerInfluence } from '@/lib/utils';

interface UnmakeMarketModalProps {
  market: Market;
  currentUserId?: string;
  open: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export function UnmakeMarketModal({ market, currentUserId, open, onClose, onSubmit }: UnmakeMarketModalProps) {
  const preview = useMemo(() => {
    const b = Math.max(Number(market.liquidityB) || 1, 0.0001);
    const probabilities = computeProbabilities(market.outcomes, b);
    const marketCost = computeLmsrLegitimacy(market.outcomes.map((outcome) => outcome.qValue), b);
    const makerShares = market.positions?.find((position) => position.userId === currentUserId)?.shares ?? market.outcomes.map(() => '0');
    const otherTakerInfluences = (market.positions ?? [])
      .filter((position) => position.userId !== currentUserId)
      .map((position) => computeTakerInfluence(probabilities, position.shares));
    const makerPayout = computeMakerInfluence(marketCost, otherTakerInfluences);
    const makerInfluenceFromMarket = computeTakerInfluence(probabilities, makerShares) + makerPayout;

    return {
      legitimacy: marketCost,
      probabilities,
      balanceChange: makerPayout,
      influenceChange: -makerInfluenceFromMarket,
      powerChange: makerPayout - makerInfluenceFromMarket,
    };
  }, [currentUserId, market]);

  const handleSubmit = async () => {
    await onSubmit();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Unmake: ${market.title}`}>
      <div className="space-y-6">
        <ActionPreview
          title="Unmake preview"
          legitimacy={preview.legitimacy}
          probabilities={market.outcomes.map((outcome, index) => ({
            label: outcome.name,
            value: preview.probabilities[index] ?? 0,
          }))}
          balanceChange={preview.balanceChange}
          influenceChange={preview.influenceChange}
          powerChange={preview.powerChange}
        />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={() => void handleSubmit()}>
            Unmake Market
          </Button>
        </div>
      </div>
    </Modal>
  );
}