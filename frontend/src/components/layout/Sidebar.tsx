import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { Navigation } from '@/components/layout/Navigation';

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 md:block">
      <Card className="sticky top-6 space-y-8 p-6">
        <div>
          <Link href="/dashboard" className="text-2xl font-semibold tracking-[0.28em] text-gold-light">
            INFOCRACY
          </Link>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            A governance prediction market for rigorous, transparent institutional decision-making.
          </p>
        </div>
        <Navigation />
        <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4 text-sm text-text-secondary">
          <p className="font-medium text-gold-light">Signal over noise</p>
          <p className="mt-2 leading-6">
            Markets reflect collective conviction. Trade carefully, watch liquidity, and treat each decision as a measurable claim.
          </p>
        </div>
      </Card>
    </aside>
  );
}
