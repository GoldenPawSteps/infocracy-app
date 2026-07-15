import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Fragment, createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Navigation } from '@/components/layout/Navigation';

let mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'>) =>
    createElement('a', { href, ...props }, children),
}));

function isActive(link: HTMLElement) {
  return link.className.includes('border-gold/50');
}

describe('Navigation active state during transitions', () => {
  beforeEach(() => {
    mockPathname = '/dashboard';
  });

  it('immediately updates active nav on route transition events before pathname updates', async () => {
    render(createElement(Navigation));

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const profileLink = screen.getByRole('link', { name: 'Profile' });

    expect(isActive(dashboardLink)).toBe(true);
    expect(isActive(profileLink)).toBe(false);

    window.dispatchEvent(new CustomEvent('route:transition-start', { detail: { pathname: '/profile' } }));

    await waitFor(() => {
      expect(isActive(dashboardLink)).toBe(false);
      expect(isActive(profileLink)).toBe(true);
    });
  });

  it('clears stale highlight when navigating to a route outside nav sections', () => {
    render(
      createElement(
        Fragment,
        null,
        createElement(Navigation),
        createElement('a', { href: '/markets/market-123' }, 'Go to market'),
      ),
    );

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const profileLink = screen.getByRole('link', { name: 'Profile' });
    const createMarketLink = screen.getByRole('link', { name: 'Create Market' });

    expect(isActive(dashboardLink)).toBe(true);

    fireEvent.click(screen.getByRole('link', { name: 'Go to market' }));

    expect(isActive(dashboardLink)).toBe(false);
    expect(isActive(profileLink)).toBe(false);
    expect(isActive(createMarketLink)).toBe(false);
  });

  it('highlights profile immediately for query-string profile links', async () => {
    render(
      createElement(
        Fragment,
        null,
        createElement(Navigation),
        createElement(
          'a',
          {
            href: '/profile?user=agent-42',
            onClick: (event: MouseEvent) => event.preventDefault(),
          },
          'Open profile',
        ),
      ),
    );

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const profileLink = screen.getByRole('link', { name: 'Profile' });

    expect(isActive(dashboardLink)).toBe(true);
    expect(isActive(profileLink)).toBe(false);

    fireEvent.click(screen.getByRole('link', { name: 'Open profile' }));

    await waitFor(() => {
      expect(isActive(dashboardLink)).toBe(false);
      expect(isActive(profileLink)).toBe(true);
    });
  });
});
