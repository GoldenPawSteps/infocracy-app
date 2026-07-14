'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ProbabilityBar } from '@/components/markets/ProbabilityBar';
import { computeLmsrLegitimacy, formatDecimal } from '@/lib/utils';
import { useMarketStore } from '@/store/marketStore';

export function CreateMarketForm() {
  const router = useRouter();
  const createMarket = useMarketStore((state) => state.createMarket);
  const isLoading = useMarketStore((state) => state.isLoading);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outcomeCount, setOutcomeCount] = useState(2);
  const [outcomes, setOutcomes] = useState<string[]>(['Approve', 'Reject']);
  const [liquidityB, setLiquidityB] = useState('1');
  const [useCustomInitialQ, setUseCustomInitialQ] = useState(false);
  const [initialQ, setInitialQ] = useState<string[]>(['0', '0']);

  const canSubmit = useMemo(
    () =>
      Boolean(title.trim()) &&
      Boolean(description.trim()) &&
      outcomes.every((outcome) => outcome.trim().length > 0) &&
      Number(liquidityB) > 0 &&
      (!useCustomInitialQ || initialQ.every((value) => Number(value) >= 0)),
    [description, initialQ, liquidityB, outcomes, title, useCustomInitialQ],
  );

  const makePreview = useMemo(() => {
    const b = Math.max(Number(liquidityB) || 1, 0.0001);
    const qValues = (useCustomInitialQ ? initialQ : outcomes.map(() => '0')).map((value) => Number(value || 0));
    const scaled = qValues.map((value) => value / b);
    const maxValue = Math.max(...scaled, 0);
    const exps = scaled.map((value) => Math.exp(value - maxValue));
    const total = exps.reduce((sum, value) => sum + value, 0) || 1;

    return {
      probabilities: exps.map((value) => value / total),
      legitimacy: computeLmsrLegitimacy(qValues.map((value) => String(value)), b),
    };
  }, [initialQ, liquidityB, outcomes, useCustomInitialQ]);

  const handleOutcomeCountChange = (value: number) => {
    const nextCount = Math.min(10, Math.max(2, value || 2));
    setOutcomeCount(nextCount);
    setOutcomes((current) => {
      const next = [...current];
      while (next.length < nextCount) {
        next.push(`Outcome ${next.length + 1}`);
      }
      return next.slice(0, nextCount);
    });
    setInitialQ((current) => {
      const next = [...current];
      while (next.length < nextCount) {
        next.push('0');
      }
      return next.slice(0, nextCount);
    });
  };

  const handleOutcomeChange = (index: number, value: string) => {
    setOutcomes((current) => current.map((entry, entryIndex) => (entryIndex === index ? value : entry)));
  };

  const handleInitialQChange = (index: number, value: string) => {
    setInitialQ((current) => current.map((entry, entryIndex) => (entryIndex === index ? value : entry)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      toast.error('Please complete every field before creating the market.');
      return;
    }

    try {
      await createMarket({
        title: title.trim(),
        description: description.trim(),
        outcomes: outcomes.map((outcome) => outcome.trim()),
        liquidityB,
        initialQ: useCustomInitialQ ? initialQ.map((value) => String(Number(value || 0))) : undefined,
      });

      router.push('/dashboard');
    } catch {
      return;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 md:p-8" glow>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold text-text-primary">Define a governance market</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Frame a concrete decision, give each plausible outcome a clear label, and choose enough liquidity to reward meaningful information without muting signal.
              </p>
            </div>

            <Input
              label="Market title"
              textarea
              rows={2}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Should the treasury allocate 15% to civic grants in Q4?"
              className="min-h-[4.5rem] resize-none"
            />

            <Input
              label="Description"
              textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the decision context, timeline, and what each outcome would mean in practice."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <Input
                label="Number of outcomes"
                type="number"
                min={2}
                max={10}
                value={outcomeCount}
                onChange={(event) => handleOutcomeCountChange(Number(event.target.value))}
              />

              <Input
                label="Liquidity parameter (b)"
                type="number"
                min={0.01}
                step="0.01"
                value={liquidityB}
                onChange={(event) => setLiquidityB(event.target.value)}
                hint="Higher b means deeper liquidity and smaller price movement per trade."
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-[#141414] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Outcome labels</h3>
                <p className="mt-1 text-sm text-text-secondary">Keep names short, mutually exclusive, and exhaustive.</p>
              </div>
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-sm text-gold-light"
                title="The liquidity parameter b controls how much prices move for a given trade. Larger values create smoother, less volatile probability updates."
              >
                ?
              </span>
            </div>

            <div className="space-y-4">
              {outcomes.map((outcome, index) => (
                <Input
                  key={`outcome-${index}`}
                  label={`Outcome ${index + 1}`}
                  value={outcome}
                  onChange={(event) => handleOutcomeChange(index, event.target.value)}
                  placeholder={`Outcome ${index + 1}`}
                />
              ))}
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-[#101010] px-3 py-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={useCustomInitialQ}
                onChange={(event) => setUseCustomInitialQ(event.target.checked)}
                className="h-4 w-4 rounded border-border bg-[#0d0d0d] accent-gold"
              />
              Seed custom initial q (maker buys shares at creation)
            </label>

            {useCustomInitialQ ? (
              <div className="space-y-3 rounded-2xl border border-gold/20 bg-gold/5 p-4 text-sm">
                <p className="text-text-secondary">
                  Seed initial inventory per outcome. Larger starting q values set stronger initial conviction before public trading begins.
                </p>
                {outcomes.map((outcome, index) => (
                  <div key={`initial-q-${index}`} className="rounded-2xl border border-border bg-[#141414] p-4">
                    <p className="text-sm font-medium text-text-primary">{outcome || `Outcome ${index + 1}`}</p>
                    <div className="mt-3">
                      <Input
                        label="Initial q"
                        type="number"
                        min={0}
                        step="0.01"
                        value={initialQ[index] ?? '0'}
                        onChange={(event) => handleInitialQChange(index, event.target.value)}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-text-muted">Must be zero or greater. Creation cost is C(q).</p>
              </div>
            ) : null}

            <div className="space-y-3 rounded-2xl border border-gold/20 bg-gold/5 p-4 text-sm">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-light">Make preview</h4>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-[#141414] px-3 py-2">
                <span className="text-text-secondary">Cost = Legitimacy</span>
                <span className="font-semibold text-gold-light">Ξ {formatDecimal(makePreview.legitimacy, 4)}</span>
              </div>
              <div className="space-y-3 rounded-xl border border-border bg-[#141414] p-3">
                {outcomes.map((outcome, index) => (
                  <ProbabilityBar
                    key={`make-preview-${index}`}
                    label={outcome || `Outcome ${index + 1}`}
                    value={makePreview.probabilities[index] ?? 0}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => router.push('/dashboard')}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading} disabled={!canSubmit}>
          Create Market
        </Button>
      </div>
    </form>
  );
}
