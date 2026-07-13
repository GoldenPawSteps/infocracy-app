'use client';

import { useMemo } from 'react';

import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const store = useAuthStore();

  return useMemo(
    () => ({
      ...store,
      isAuthenticated: Boolean(store.user),
    }),
    [store],
  );
}
