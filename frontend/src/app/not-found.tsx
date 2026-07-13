import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="max-w-xl p-8 text-center" glow>
        <p className="text-sm uppercase tracking-[0.24em] text-gold-light">404</p>
        <h1 className="mt-4 text-3xl font-semibold text-text-primary">Market not found</h1>
        <p className="mt-4 text-base leading-7 text-text-secondary">
          The page you requested is unavailable or may have been retired from active deliberation.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/dashboard">
            <Button>Return to dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
