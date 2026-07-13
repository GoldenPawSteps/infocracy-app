'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

  return (
    <nav className={cn('flex gap-2', vertical ? 'flex-col' : 'flex-row overflow-x-auto pb-1')}>
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
