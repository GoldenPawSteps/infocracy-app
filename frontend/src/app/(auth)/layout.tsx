import type { ReactNode } from 'react';

import { PageTransition } from '@/components/layout/PageTransition';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <PageTransition variant="auth">{children}</PageTransition>;
}
