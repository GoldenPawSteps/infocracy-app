import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from '@/components/ui/Modal';

describe('Modal accessibility behavior', () => {
  it('moves initial focus to the close button when opened', async () => {
    render(
      <Modal open title="Trade modal" onClose={() => undefined}>
        <button type="button">Confirm trade</button>
      </Modal>,
    );

    const closeButton = screen.getByRole('button', { name: 'Close' });

    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });
  });

  it('traps focus inside the dialog on Tab and Shift+Tab', async () => {
    render(
      <Modal open title="Trade modal" onClose={() => undefined}>
        <button type="button">Confirm trade</button>
      </Modal>,
    );

    const closeButton = screen.getByRole('button', { name: 'Close' });
    const confirmButton = screen.getByRole('button', { name: 'Confirm trade' });

    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    confirmButton.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    closeButton.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(confirmButton).toHaveFocus();
  });

  it('restores focus to the previously focused element after close', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <div>
        <button type="button">Launch modal</button>
        <Modal open={false} title="Trade modal" onClose={onClose}>
          <button type="button">Confirm trade</button>
        </Modal>
      </div>,
    );

    const launcherButton = screen.getByRole('button', { name: 'Launch modal' });
    launcherButton.focus();
    expect(launcherButton).toHaveFocus();

    rerender(
      <div>
        <button type="button">Launch modal</button>
        <Modal open title="Trade modal" onClose={onClose}>
          <button type="button">Confirm trade</button>
        </Modal>
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    });

    rerender(
      <div>
        <button type="button">Launch modal</button>
        <Modal open={false} title="Trade modal" onClose={onClose}>
          <button type="button">Confirm trade</button>
        </Modal>
      </div>,
    );

    expect(launcherButton).toHaveFocus();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();

    render(
      <Modal open title="Trade modal" onClose={onClose}>
        <button type="button">Confirm trade</button>
      </Modal>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
