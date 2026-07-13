'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading, fetchMe } = useAuth();

  useSocket();

  useEffect(() => {
    if (!user) {
      void fetchMe().catch(() => undefined);
    }
  }, [fetchMe, user]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/signin');
    }
  }, [isLoading, router, user]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-2xl border border-gold/20 bg-surface px-8 py-6 shadow-glow">
          <div className="flex items-center gap-3 text-gold-light">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm uppercase tracking-[0.24em]">Loading workspace</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
      <div className="flex gap-6">
        <Sidebar />
        <main className="min-w-0 flex-1 space-y-4 md:space-y-6">
          <Header />
          <div className="md:hidden">
            <Navigation vertical={false} />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
