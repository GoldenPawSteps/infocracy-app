'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useMarketStore } from '@/store/marketStore';

export function CreateMarketForm() {
  const router = useRouter();
  const createMarket = useMarketStore((state) => state.createMarket);
  const isLoading = useMarketStore((state) => state.isLoading);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outcomeCount, setOutcomeCount] = useState(2);
  const [outcomes, setOutcomes] = useState<string[]>(['Approve', 'Reject']);
  const [liquidityB, setLiquidityB] = useState('100');

  const canSubmit = useMemo(
    () =>
      Boolean(title.trim()) &&
      Boolean(description.trim()) &&
      outcomes.every((outcome) => outcome.trim().length > 0) &&
      Number(liquidityB) > 0,
    [description, liquidityB, outcomes, title],
  );

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
  };

  const handleOutcomeChange = (index: number, value: string) => {
    setOutcomes((current) => current.map((entry, entryIndex) => (entryIndex === index ? value : entry)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      toast.error('Please complete every field before creating the market.');
      return;
    }

    await createMarket({
      title: title.trim(),
      description: description.trim(),
      outcomes: outcomes.map((outcome) => outcome.trim()),
      liquidityB,
    });

    router.push('/dashboard');
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
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Should the treasury allocate 15% to civic grants in Q4?"
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
