'use client';

import { useEffect, useMemo, useState } from 'react';
import { Toaster } from 'react-hot-toast';

export function AppToaster() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const apply = () => setIsMobile(mediaQuery.matches);
    apply();

    mediaQuery.addEventListener('change', apply);
    return () => mediaQuery.removeEventListener('change', apply);
  }, []);

  const position = isMobile ? 'bottom-center' : 'top-right';

  const containerStyle = useMemo(
    () =>
      isMobile
        ? {
            left: 'max(env(safe-area-inset-left, 0px), 12px)',
            right: 'max(env(safe-area-inset-right, 0px), 12px)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          }
        : {
            top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
            right: 'max(env(safe-area-inset-right, 0px), 12px)',
          },
    [isMobile],
  );

  return (
    <Toaster
      position={position}
      containerStyle={containerStyle}
      toastOptions={{
        style: {
          background: '#1a1a1a',
          color: '#e8e8e8',
          border: '1px solid rgba(212,160,23,0.2)',
        },
      }}
    />
  );
}
