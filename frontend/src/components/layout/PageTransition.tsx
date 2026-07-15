'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type PageTransitionVariant = 'default' | 'app' | 'auth';

export function PageTransition({ children, variant = 'default' }: { children: ReactNode; variant?: PageTransitionVariant }) {
  const pathname = usePathname();
  const className =
    variant === 'app' ? 'page-enter page-enter-app' : variant === 'auth' ? 'page-enter page-enter-auth' : 'page-enter';

  return (
    <div key={pathname} className={className}>
      {children}
    </div>
  );
}
