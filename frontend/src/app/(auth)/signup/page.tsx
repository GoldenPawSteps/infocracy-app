'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export default function SignUpPage() {
  const router = useRouter();
  const { signup, user, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await signup(username, email, password);
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="grid max-w-5xl overflow-hidden lg:grid-cols-[0.85fr_1.15fr]" glow>
        <div className="p-8 md:p-12">
          <div className="max-w-md">
            <p className="text-sm uppercase tracking-[0.34em] text-gold-light">Create account</p>
            <h1 className="mt-4 text-3xl font-semibold text-text-primary">Join the governance market</h1>
            <p className="mt-4 text-sm leading-6 text-text-secondary">
              Open an account to create questions, trade on governance outcomes, and build reputation through accurate signal.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="citizen-scholar"
                required
              />
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
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Choose a strong password"
                required
              />
              <Button type="submit" className="w-full" loading={isLoading}>
                Create account
              </Button>
            </form>

            <p className="mt-6 text-sm text-text-secondary">
              Already a member?{' '}
              <Link href="/signin" className="font-medium text-gold-light hover:text-gold">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>

        <div className="bg-gold-radial p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.34em] text-gold-light">Why Infocracy</p>
          <div className="mt-6 space-y-6">
            {[
              'Quantify disagreement with transparent, continuously updating probabilities.',
              'Reward careful information discovery rather than rhetorical confidence alone.',
              'Preserve an audit trail of how collective expectation shifted over time.',
            ].map((point) => (
              <div key={point} className="rounded-2xl border border-gold/20 bg-surface/30 p-5 backdrop-blur-sm">
                <p className="text-base leading-7 text-text-primary">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
