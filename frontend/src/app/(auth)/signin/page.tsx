'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { startRouteTransition } from '@/lib/navigation';

export default function SignInPage() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      startRouteTransition('/dashboard');
      router.replace('/dashboard');
    }
  }, [router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await login(email, password);
      startRouteTransition('/dashboard');
      router.push('/dashboard');
    } catch {
      return;
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-6 py-12">
      <Card className="grid max-w-5xl overflow-hidden lg:grid-cols-[1.2fr_0.8fr]" glow>
        <div className="bg-gold-radial p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.34em] text-gold-light">INFOCRACY</p>
          <h1 className="mt-6 max-w-lg text-4xl font-semibold leading-tight text-text-primary">
            Enter a governance market built for serious institutional decisions.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-text-secondary">
            Observe live probabilities, test conviction with capital, and surface transparent collective judgment on high-stakes policy choices.
          </p>
        </div>

        <div className="p-8 md:p-12">
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold text-text-primary">Sign in</h2>
            <p className="mt-2 text-sm text-text-secondary">Use your Infocracy account to access markets, balances, and live governance signal.</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.org"
                required
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
              <Button type="submit" className="w-full" loading={isLoading}>
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-sm text-text-secondary">
              New to Infocracy?{' '}
              <Link href="/signup" className="font-medium text-gold-light hover:text-gold">
                Create an account
              </Link>
            </p>
            <p className="mt-3 text-sm text-text-secondary">
              Prefer to browse first?{' '}
              <Link href="/dashboard" className="font-medium text-gold-light hover:text-gold">
                Continue as guest
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
