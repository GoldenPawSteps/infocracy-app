import '@fontsource/inter/index.css';

import type { Metadata } from 'next';
import type { Viewport } from 'next';
import type { ReactNode } from 'react';

import '@/app/globals.css';
import { AppToaster } from '@/components/providers/AppToaster';
import { AppProviders } from '@/components/providers/AppProviders';

export const metadata: Metadata = {
  title: 'Infocracy',
  description: 'Governance prediction markets for institutional decision making.',
  applicationName: 'Infocracy',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Infocracy',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans text-text-primary">
        <AppProviders>{children}</AppProviders>
        <AppToaster />
      </body>
    </html>
  );
}
