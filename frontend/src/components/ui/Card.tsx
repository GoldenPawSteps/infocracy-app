import { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function Card({ className, glow = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface/90 backdrop-blur-sm',
        glow ? 'shadow-glow' : 'shadow-[0_10px_30px_rgba(0,0,0,0.2)]',
        className,
      )}
      {...props}
    />
  );
}
