'use client';

import { ProbabilityBar } from '@/components/markets/ProbabilityBar';
import { formatDecimal, formatSignedDecimal } from '@/lib/utils';

interface ActionPreviewProps {
  title: string;
  legitimacy: number;
  probabilities: Array<{
    label: string;
    value: number;
  }>;
  balanceChange: number;
  influenceChange: number;
  powerChange: number;
}

export function ActionPreview({
  title,
  legitimacy,
  probabilities,
  balanceChange,
  influenceChange,
  powerChange,
}: ActionPreviewProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-gold/20 bg-gold/5 p-4 text-sm">
      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-light">{title}</h4>

      <div className="space-y-3 rounded-xl border border-border bg-[#141414] p-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-secondary">Legitimacy</span>
          <span className="font-semibold text-gold-light">{formatDecimal(legitimacy, 4)}</span>
        </div>
        <div className="space-y-3">
          {probabilities.map((outcome) => (
            <ProbabilityBar key={outcome.label} label={outcome.label} value={outcome.value} />
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-[#141414] p-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-secondary">Balance change</span>
          <span className="font-semibold text-gold-light">{formatSignedDecimal(balanceChange, 4)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-secondary">Influence change</span>
          <span className="font-semibold text-gold-light">{formatSignedDecimal(influenceChange, 4)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-secondary">Power change</span>
          <span className="font-semibold text-gold-light">{formatSignedDecimal(powerChange, 4)}</span>
        </div>
      </div>
    </div>
  );
}