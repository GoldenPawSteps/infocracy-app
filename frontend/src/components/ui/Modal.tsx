'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';

import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, title, description, onClose, children, className }: ModalProps) {
  const idBase = useId();
  const titleId = `${idBase}-modal-title`;
  const descriptionId = `${idBase}-modal-description`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const getFocusableElements = () => {
      if (!dialogRef.current) {
        return [] as HTMLElement[];
      }

      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');

      return Array.from(dialogRef.current.querySelectorAll<HTMLElement>(selector)).filter(
        (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
      );
    };

    const setInitialFocus = () => {
      const focusableElements = getFocusableElements();
      const initialTarget = closeButtonRef.current ?? focusableElements[0] ?? dialogRef.current;
      initialTarget?.focus();
    };

    const focusTimer = window.setTimeout(setInitialFocus, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
      previousActiveElementRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
      }}
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close modal" tabIndex={-1} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        ref={dialogRef}
        className={cn(
          'relative z-10 mx-auto my-4 w-full max-w-2xl rounded-2xl border border-gold/20 bg-surface p-6 shadow-glow md:my-8',
          className,
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-2xl font-semibold text-text-primary">{title}</h2>
            {description ? <p id={descriptionId} className="mt-2 text-sm text-text-secondary">{description}</p> : null}
          </div>
          <button
            ref={closeButtonRef}
            className="focus-ring rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition hover:border-gold hover:text-gold-light"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
