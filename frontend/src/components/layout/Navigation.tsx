'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { getInternalNavigationPathFromClick } from '@/lib/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/markets/new', label: 'Create Market' },
  { href: '/profile', label: 'Profile' },
];

interface NavigationProps {
  vertical?: boolean;
}

export function Navigation({ vertical = true }: NavigationProps) {
  const pathname = usePathname();
  const [pendingPathname, setPendingPathname] = useState<string | null>(null);

  useEffect(() => {
    setPendingPathname((current) => (current === pathname ? null : current));
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const nextPathname = getInternalNavigationPathFromClick(event);
      if (!nextPathname || nextPathname === pathname) {
        return;
      }

      setPendingPathname(nextPathname);
    };

    const onTransitionStart = (event: Event) => {
      const nextPathname = (event as CustomEvent<{ pathname?: string }>).detail?.pathname;
      if (!nextPathname || nextPathname === pathname) {
        return;
      }

      setPendingPathname(nextPathname);
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('route:transition-start', onTransitionStart);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('route:transition-start', onTransitionStart);
    };
  }, [pathname]);

  const activePathname = useMemo(() => pendingPathname ?? pathname, [pendingPathname, pathname]);

  return (
    <nav className={cn('flex gap-2', vertical ? 'flex-col' : 'flex-row overflow-x-auto pb-1')}>
      {items.map((item) => {
        const isActive = activePathname === item.href || activePathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-xl border px-4 py-3 text-sm font-medium transition-all',
              isActive
                ? 'border-gold/50 bg-gold/10 text-gold-light shadow-[0_0_0_1px_rgba(212,160,23,0.2)]'
                : 'border-transparent text-text-secondary hover:border-border hover:bg-[#161616] hover:text-text-primary',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
