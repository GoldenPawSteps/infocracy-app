'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import { getInternalNavigationPathFromClick } from '@/lib/navigation';

export function RouteProgress() {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = () => {
      setIsVisible(true);
      setProgress((current) => (current < 12 ? 12 : current));
    };

    const onClick = (event: MouseEvent) => {
      if (getInternalNavigationPathFromClick(event)) {
        start();
      }
    };

    const onTransitionStart = () => {
      start();
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('route:transition-start', onTransitionStart);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('route:transition-start', onTransitionStart);
    };
  }, []);

  useEffect(() => {
    if (!isVisible || progress >= 92) {
      return;
    }

    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) {
          return current;
        }

        const remaining = 100 - current;
        const increment = Math.max(1.4, remaining * 0.08);
        return Math.min(92, current + increment);
      });
    }, 120);

    return () => {
      window.clearInterval(timer);
    };
  }, [isVisible, progress]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return;
    }

    previousPathnameRef.current = pathname;
    setIsVisible(true);
    setProgress(100);

    const timer = window.setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 260);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-1.5" aria-hidden>
      <div
        className="route-progress h-full"
        style={{
          width: `${progress}%`,
          opacity: isVisible ? 1 : 0,
        }}
      />
    </div>
  );
}
