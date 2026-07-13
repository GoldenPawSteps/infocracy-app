import { formatPercent } from '@/lib/utils';

interface ProbabilityBarProps {
  label: string;
  value: number;
}

export function ProbabilityBar({ label, value }: ProbabilityBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-text-primary">{label}</span>
        <span className="text-gold-light">{formatPercent(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#121212]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light transition-all duration-500 ease-out"
          style={{ width: `${Math.max(Math.min(value * 100, 100), 0)}%` }}
        />
      </div>
    </div>
  );
}
