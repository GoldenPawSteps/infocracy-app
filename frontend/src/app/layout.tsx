import '@fontsource/inter/index.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

import '@/app/globals.css';
import { AppProviders } from '@/components/providers/AppProviders';

export const metadata: Metadata = {
  title: 'Infocracy',
  description: 'Governance prediction markets for institutional decision making.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans text-text-primary">
        <AppProviders>{children}</AppProviders>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a1a',
              color: '#e8e8e8',
              border: '1px solid rgba(212,160,23,0.2)',
            },
          }}
        />
      </body>
    </html>
  );
}
