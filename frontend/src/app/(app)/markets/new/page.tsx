import { CreateMarketForm } from '@/components/markets/CreateMarketForm';
import { Card } from '@/components/ui/Card';

export default function NewMarketPage() {
  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-gold-light">Create market</p>
        <h1 className="mt-3 text-3xl font-semibold text-text-primary">Launch a new governance question</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-text-secondary">
          Build a decision market with unambiguous outcomes, enough liquidity to invite measured trading, and context that helps participants reason clearly.
        </p>
      </Card>
      <CreateMarketForm />
    </div>
  );
}
