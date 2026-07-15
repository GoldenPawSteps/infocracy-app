'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { startRouteTransition } from '@/lib/navigation';
import { formatBalance, formatInfluence, formatPower } from '@/lib/utils';

export function Header() {
  const router = useRouter();
  const { user, balance, influence, power, logout } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      startRouteTransition('/signin');
      router.push('/signin');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="rounded-2xl border border-border bg-surface/85 px-4 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.2)] backdrop-blur md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href="/dashboard" className="text-lg font-semibold tracking-[0.24em] text-gold-light md:hidden">
            INFOCRACY
          </Link>
          <p className="text-sm text-text-secondary">Governance markets, real-time signal, accountable outcomes.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="rounded-xl border border-border bg-[#141414] px-4 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Balance</p>
            <p className="mt-1 font-medium text-text-primary">{formatBalance(balance)}</p>
          </div>
          <div className="rounded-xl border border-border bg-[#141414] px-4 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Influence</p>
            <p className="mt-1 font-medium text-text-primary">{formatInfluence(influence)}</p>
          </div>
          <div className="rounded-xl border border-border bg-[#141414] px-4 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Power</p>
            <p className="mt-1 font-medium text-text-primary">{formatPower(power)}</p>
          </div>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-4 py-2 text-sm font-medium text-text-primary transition hover:border-gold hover:text-gold-light">
              <span>{user?.username ?? 'Account'}</span>
              <span className="text-gold-light transition group-open:rotate-180">▾</span>
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-border bg-surface p-2 shadow-glow">
              <Link
                href="/profile"
                className="block rounded-xl px-3 py-2 text-sm text-text-secondary transition hover:bg-[#151515] hover:text-text-primary"
              >
                Profile
              </Link>
              <Button
                type="button"
                variant="ghost"
                className="mt-1 w-full justify-start px-3"
                onClick={handleSignOut}
                loading={isSigningOut}
              >
                Sign out
              </Button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
