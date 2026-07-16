interface RouteTransitionStartDetail {
  pathname?: string;
}

export function startRouteTransition(pathname?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<RouteTransitionStartDetail>('route:transition-start', { detail: { pathname } }));
}

export function getInternalNavigationPathFromClick(event: MouseEvent): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (event.defaultPrevented || event.button !== 0) {
    return null;
  }

  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return null;
  }

  // Ignore form control interactions, including controls nested inside links.
  if (target.closest('select, option, input, textarea, button, [role="combobox"], [contenteditable="true"]')) {
    return null;
  }

  const anchor = target.closest('a');
  if (!anchor) {
    return null;
  }

  if (anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download')) {
    return null;
  }

  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return null;
  }

  try {
    const current = new URL(window.location.href);
    const destination = new URL(anchor.href, window.location.href);

    if (destination.origin !== current.origin) {
      return null;
    }

    return destination.pathname;
  } catch {
    return null;
  }
}
