/**
 * Test: ConfirmDialog Component (Story 8.1b Phase 7)
 *
 * Tests reusable confirmation dialog functionality, loading states, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfirmDialog from './ConfirmDialog';

const defaultProps = {
  open: true,
  title: 'Confirm Action',
  message: 'Are you sure you want to proceed?',
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

describe('ConfirmDialog (Story 8.1b)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dialog when open', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  test('does not render dialog when closed', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  test('displays custom confirm and cancel button text', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmText="Delete"
        cancelText="Keep"
      />
    );

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  test('calls onConfirm when confirm button clicked', () => {
    const onConfirm = jest.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('calls onCancel when cancel button clicked', () => {
    const onCancel = jest.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('shows loading state when loading prop is true', () => {
    render(<ConfirmDialog {...defaultProps} loading={true} />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  test('disables buttons when loading', () => {
    render(<ConfirmDialog {...defaultProps} loading={true} />);

    const confirmButton = screen.getByRole('button', { name: /processing/i });
    const cancelButton = screen.getByText('Cancel');

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  test('does not call onCancel when loading and dialog clicked outside', () => {
    const onCancel = jest.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} loading={true} />);

    // Attempt to close dialog (would normally call onCancel)
    const backdrop = document.querySelector('.MuiBackdrop-root');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    // onCancel should not be called when loading
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('applies error severity color to confirm button', () => {
    render(<ConfirmDialog {...defaultProps} severity="error" />);

    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveClass('MuiButton-containedError');
  });

  test('applies warning severity color to confirm button', () => {
    render(<ConfirmDialog {...defaultProps} severity="warning" />);

    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveClass('MuiButton-containedWarning');
  });

  test('applies primary (info) severity color to confirm button', () => {
    render(<ConfirmDialog {...defaultProps} severity="info" />);

    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveClass('MuiButton-containedPrimary');
  });

  test('has proper ARIA labels for accessibility', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'confirm-dialog-description');
  });

  test('displays custom message with context', () => {
    const message = 'Are you sure you want to remove "Drawing-001.pdf" from this project?';
    render(<ConfirmDialog {...defaultProps} message={message} />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });
});
