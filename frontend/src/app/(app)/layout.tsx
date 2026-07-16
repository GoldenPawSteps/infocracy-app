'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { PageTransition } from '@/components/layout/PageTransition';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { fetchMe } = useAuth();

  useSocket();

  useEffect(() => {
    void fetchMe()
      .catch(() => undefined);
  }, [fetchMe]);

  return (
    <div className="mx-auto min-h-[100dvh] max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
      <div className="flex gap-6">
        <Sidebar />
        <main className="min-w-0 flex-1 space-y-4 md:space-y-6">
          <Header />
          <div className="md:hidden">
            <Navigation vertical={false} />
          </div>
          <PageTransition variant="app">{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
