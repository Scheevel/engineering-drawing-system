/**
 * Test: SnackbarContext (Story 8.1b Phase 7)
 *
 * Tests toast notification system functionality, queue management, and hook usage
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SnackbarProvider, useSnackbar } from './SnackbarContext';

// Test component that uses the snackbar hook
const TestComponent: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useSnackbar();

  return (
    <div>
      <button onClick={() => showSuccess('Success message')}>Show Success</button>
      <button onClick={() => showError('Error message')}>Show Error</button>
      <button onClick={() => showWarning('Warning message')}>Show Warning</button>
      <button onClick={() => showInfo('Info message')}>Show Info</button>
    </div>
  );
};

describe('SnackbarContext (Story 8.1b)', () => {
  test('throws error when useSnackbar used outside provider', () => {
    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSnackbar must be used within a SnackbarProvider');

    spy.mockRestore();
  });

  test('renders success toast when showSuccess is called', async () => {
    const user = userEvent.setup();

    render(
      <SnackbarProvider>
        <TestComponent />
      </SnackbarProvider>
    );

    const successButton = screen.getByText('Show Success');

    await act(async () => {
      await user.click(successButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  test('renders error toast when showError is called', async () => {
    const user = userEvent.setup();

    render(
      <SnackbarProvider>
        <TestComponent />
      </SnackbarProvider>
    );

    const errorButton = screen.getByText('Show Error');

    await act(async () => {
      await user.click(errorButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  test('renders warning toast when showWarning is called', async () => {
    const user = userEvent.setup();

    render(
      <SnackbarProvider>
        <TestComponent />
      </SnackbarProvider>
    );

    const warningButton = screen.getByText('Show Warning');

    await act(async () => {
      await user.click(warningButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });
  });

  test('renders info toast when showInfo is called', async () => {
    const user = userEvent.setup();

    render(
      <SnackbarProvider>
        <TestComponent />
      </SnackbarProvider>
    );

    const infoButton = screen.getByText('Show Info');

    await act(async () => {
      await user.click(infoButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  test('displays success toast with filled variant', async () => {
    const user = userEvent.setup();

    render(
      <SnackbarProvider>
        <TestComponent />
      </SnackbarProvider>
    );

    const successButton = screen.getByText('Show Success');

    await act(async () => {
      await user.click(successButton);
    });

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('MuiAlert-filledSuccess');
    });
  });

  test('toast can be dismissed by clicking close button', async () => {
    const user = userEvent.setup();

    render(
      <SnackbarProvider>
        <TestComponent />
      </SnackbarProvider>
    );

    const successButton = screen.getByText('Show Success');

    await act(async () => {
      await user.click(successButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    // Find and click close button
    const closeButton = screen.getByRole('button', { name: /close/i });

    await act(async () => {
      await user.click(closeButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  test('queues multiple notifications (shows one at a time)', async () => {
    const user = userEvent.setup();

    render(
      <SnackbarProvider>
        <TestComponent />
      </SnackbarProvider>
    );

    const successButton = screen.getByText('Show Success');
    const errorButton = screen.getByText('Show Error');

    // Trigger two notifications quickly
    await act(async () => {
      await user.click(successButton);
      await user.click(errorButton);
    });

    // First message should be visible
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    // Second message should not be visible yet (queued)
    expect(screen.queryByText('Error message')).not.toBeInTheDocument();
  });

  test('provides all snackbar methods via hook', () => {
    let snackbarMethods: any;

    const HookTestComponent = () => {
      snackbarMethods = useSnackbar();
      return null;
    };

    render(
      <SnackbarProvider>
        <HookTestComponent />
      </SnackbarProvider>
    );

    expect(snackbarMethods).toHaveProperty('showSuccess');
    expect(snackbarMethods).toHaveProperty('showError');
    expect(snackbarMethods).toHaveProperty('showWarning');
    expect(snackbarMethods).toHaveProperty('showInfo');
    expect(typeof snackbarMethods.showSuccess).toBe('function');
    expect(typeof snackbarMethods.showError).toBe('function');
  });
});
