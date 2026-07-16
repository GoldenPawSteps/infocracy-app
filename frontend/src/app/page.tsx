'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';
import { startRouteTransition } from '@/lib/navigation';

export default function HomePage() {
  const router = useRouter();
  const { isLoading, fetchMe } = useAuth();

  useEffect(() => {
    void fetchMe().catch(() => undefined);
  }, [fetchMe]);

  useEffect(() => {
    if (!isLoading) {
      const destinationPath = '/dashboard';
      startRouteTransition(destinationPath);
      router.replace(destinationPath);
    }
  }, [isLoading, router]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-6">
      <div className="rounded-2xl border border-gold/20 bg-surface px-8 py-6 text-center shadow-glow">
        <p className="text-sm uppercase tracking-[0.24em] text-gold-light">INFOCRACY</p>
        <p className="mt-3 text-text-secondary">Preparing your governance workspace…</p>
      </div>
    </div>
  );
}
