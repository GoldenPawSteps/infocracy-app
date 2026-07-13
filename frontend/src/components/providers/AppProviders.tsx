'use client';

import { ReactNode, useEffect } from 'react';

import { useAuthStore } from '@/store/authStore';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    void fetchMe().catch(() => undefined);
  }, [fetchMe]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuth();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [clearAuth]);

  return <>{children}</>;
}
