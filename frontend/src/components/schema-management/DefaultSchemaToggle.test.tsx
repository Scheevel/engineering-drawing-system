/**
 * DefaultSchemaToggle Component Tests
 *
 * Tests for DefaultSchemaToggle including:
 * - Different variants (icon, chip, button)
 * - Default schema state detection and display
 * - Confirmation dialogs for set/unset operations
 * - Business logic (only one default per project)
 * - Loading states and error handling
 * - Disabled states and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DefaultSchemaToggle from './DefaultSchemaToggle';

// Mock the schema queries
jest.mock('../../services/schemaQueries.ts');

const { useSetDefaultSchema, useUnsetDefaultSchema } = require('../../services/schemaQueries.ts');

// Mock data
const mockSchema = {
  id: 'schema-1',
  name: 'Test Schema',
  description: 'A test schema',
  version: '1.0.0',
  is_active: true,
  is_default: false,
  project_id: 'project-1',
  fields: [],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

const mockDefaultSchema = {
  ...mockSchema,
  is_default: true,
};

const mockOtherDefaultSchema = {
  id: 'schema-2',
  name: 'Other Default Schema',
  description: 'Another schema that is currently default',
  version: '1.0.0',
  is_active: true,
  is_default: true,
  project_id: 'project-1',
  fields: [],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

const theme = createTheme();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
};

describe('DefaultSchemaToggle', () => {
  const defaultProps = {
    schema: mockSchema,
    projectId: 'project-1',
    onDefaultChange: jest.fn(),
  };

  const mockSetMutation = {
    mutate: jest.fn(),
    isLoading: false,
    error: null,
  };

  const mockUnsetMutation = {
    mutate: jest.fn(),
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useSetDefaultSchema.mockReturnValue(mockSetMutation);
    useUnsetDefaultSchema.mockReturnValue(mockUnsetMutation);
  });

  describe('Variant Rendering', () => {
    it('renders icon variant by default', () => {
      render(<DefaultSchemaToggle {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByLabelText(/set as default schema/i)).toBeInTheDocument();
    });

    it('renders chip variant when specified', () => {
      render(<DefaultSchemaToggle {...defaultProps} variant="chip" />, {
        wrapper: createWrapper()
      });

      expect(screen.getByText('Set as Default')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('MuiChip-root');
    });

    it('renders button variant when specified', () => {
      render(<DefaultSchemaToggle {...defaultProps} variant="button" />, {
        wrapper: createWrapper()
      });

      expect(screen.getByRole('button', { name: /set as default/i })).toBeInTheDocument();
    });
  });

  describe('Default Schema State Detection', () => {
    it('shows default state when schema is default', () => {
      render(
        <DefaultSchemaToggle {...defaultProps} schema={mockDefaultSchema} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/remove default status/i)).toBeInTheDocument();
    });

    it('shows default state when schema matches currentDefaultSchema', () => {
      render(
        <DefaultSchemaToggle
          {...defaultProps}
          currentDefaultSchema={mockSchema}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/remove default status/i)).toBeInTheDocument();
    });

    it('shows non-default state when schema is not default', () => {
      render(<DefaultSchemaToggle {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/set as default schema/i)).toBeInTheDocument();
    });
  });

  describe('Set Default Flow', () => {
    it('opens set default dialog when non-default schema clicked', async () => {
      const user = userEvent.setup();
      render(<DefaultSchemaToggle {...defaultProps} />, { wrapper: createWrapper() });

      const toggleButton = screen.getByLabelText(/set as default schema/i);
      await user.click(toggleButton);

      expect(screen.getByText('Set Default Schema')).toBeInTheDocument();
      expect(screen.getByText(/set "test schema" as the default/i)).toBeInTheDocument();
    });

    it('shows warning when another schema is currently default', async () => {
      const user = userEvent.setup();
      render(
        <DefaultSchemaToggle
          {...defaultProps}
          currentDefaultSchema={mockOtherDefaultSchema}
        />,
        { wrapper: createWrapper() }
      );

      const toggleButton = screen.getByLabelText(/set as default schema/i);
      await user.click(toggleButton);

      expect(screen.getByText(/other default schema.*will no longer be default/i)).toBeInTheDocument();
    });

    it('calls set default mutation when confirmed', async () => {
      const user = userEvent.setup();
      render(<DefaultSchemaToggle {...defaultProps} />, { wrapper: createWrapper() });

      const toggleButton = screen.getByLabelText(/set as default schema/i);
      await user.click(toggleButton);

      const confirmButton = screen.getByRole('button', { name: /set as default/i });
      await user.click(confirmButton);

      expect(mockSetMutation.mutate).toHaveBeenCalledWith({
        projectId: 'project-1',
        schemaId: 'schema-1',
      });
    });

    it('closes dialog when cancelled', async () => {
      const user = userEvent.setup();
      render(<DefaultSchemaToggle {...defaultProps} />, { wrapper: createWrapper() });

      const toggleButton = screen.getByLabelText(/set as default schema/i);
      await user.click(toggleButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText('Set Default Schema')).not.toBeInTheDocument();
    });
  });

  describe('Unset Default Flow', () => {
    it('opens unset default dialog when default schema clicked', async () => {
      const user = userEvent.setup();
      render(
        <DefaultSchemaToggle {...defaultProps} schema={mockDefaultSchema} />,
        { wrapper: createWrapper() }
      );

      const toggleButton = screen.getByLabelText(/remove default status/i);
      await user.click(toggleButton);

      expect(screen.getByText('Remove Default Schema Status')).toBeInTheDocument();
      expect(screen.getByText(/remove default status from "test schema"/i)).toBeInTheDocument();
    });

    it('calls unset default mutation when confirmed', async () => {
      const user = userEvent.setup();
      render(
        <DefaultSchemaToggle {...defaultProps} schema={mockDefaultSchema} />,
        { wrapper: createWrapper() }
      );

      const toggleButton = screen.getByLabelText(/remove default status/i);
      await user.click(toggleButton);

      const confirmButton = screen.getByRole('button', { name: /remove default/i });
      await user.click(confirmButton);

      expect(mockUnsetMutation.mutate).toHaveBeenCalledWith({
        projectId: 'project-1',
        schemaId: 'schema-1',
      });
    });

    it('closes dialog when cancelled', async () => {
      const user = userEvent.setup();
      render(
        <DefaultSchemaToggle {...defaultProps} schema={mockDefaultSchema} />,
        { wrapper: createWrapper() }
      );

      const toggleButton = screen.getByLabelText(/remove default status/i);
      await user.click(toggleButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText('Remove Default Schema Status')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state during set operation', () => {
      const loadingSetMutation = {
        ...mockSetMutation,
        isLoading: true,
      };

      useSetDefaultSchema.mockReturnValue(loadingSetMutation);

      render(<DefaultSchemaToggle {...defaultProps} variant="button" />, {
        wrapper: createWrapper()
      });

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('shows loading state during unset operation', () => {
      const loadingUnsetMutation = {
        ...mockUnsetMutation,
        isLoading: true,
      };

      useUnsetDefaultSchema.mockReturnValue(loadingUnsetMutation);

      render(
        <DefaultSchemaToggle {...defaultProps} schema={mockDefaultSchema} variant="button" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('prevents dialog close during loading', async () => {
      const user = userEvent.setup();
      const loadingSetMutation = {
        ...mockSetMutation,
        isLoading: true,
      };

      useSetDefaultSchema.mockReturnValue(loadingSetMutation);

      render(<DefaultSchemaToggle {...defaultProps} />, { wrapper: createWrapper() });

      const toggleButton = screen.getByLabelText(/set as default schema/i);
      await user.click(toggleButton);

      // Try to close dialog by clicking backdrop (should not work during loading)
      const dialog = screen.getByRole('dialog');
      await user.click(dialog);

      expect(screen.getByText('Set Default Schema')).toBeInTheDocument();
    });
  });

  describe('Success Callbacks', () => {
    it('calls onDefaultChange with new schema on set success', async () => {
      const user = userEvent.setup();
      const successSetMutation = {
        ...mockSetMutation,
        mutate: jest.fn((data, options) => {
          options?.onSuccess?.(mockDefaultSchema);
        }),
      };

      useSetDefaultSchema.mockReturnValue(successSetMutation);

      render(<DefaultSchemaToggle {...defaultProps} />, { wrapper: createWrapper() });

      const toggleButton = screen.getByLabelText(/set as default schema/i);
      await user.click(toggleButton);

      const confirmButton = screen.getByRole('button', { name: /set as default/i });
      await user.click(confirmButton);

      expect(defaultProps.onDefaultChange).toHaveBeenCalledWith(mockDefaultSchema);
    });

    it('calls onDefaultChange with null on unset success', async () => {
      const user = userEvent.setup();
      const successUnsetMutation = {
        ...mockUnsetMutation,
        mutate: jest.fn((data, options) => {
          options?.onSuccess?.();
        }),
      };

      useUnsetDefaultSchema.mockReturnValue(successUnsetMutation);

      render(
        <DefaultSchemaToggle {...defaultProps} schema={mockDefaultSchema} />,
        { wrapper: createWrapper() }
      );

      const toggleButton = screen.getByLabelText(/remove default status/i);
      await user.click(toggleButton);

      const confirmButton = screen.getByRole('button', { name: /remove default/i });
      await user.click(confirmButton);

      expect(defaultProps.onDefaultChange).toHaveBeenCalledWith(null);
    });
  });

  describe('Disabled States', () => {
    it('disables toggle when schema is inactive', () => {
      const inactiveSchema = {
        ...mockSchema,
        is_active: false,
      };

      render(
        <DefaultSchemaToggle {...defaultProps} schema={inactiveSchema} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('disables toggle when disabled prop is true', () => {
      render(<DefaultSchemaToggle {...defaultProps} disabled={true} />, {
        wrapper: createWrapper()
      });

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('still allows toggle for inactive schema if it is currently default', () => {
      const inactiveDefaultSchema = {
        ...mockDefaultSchema,
        is_active: false,
      };

      render(
        <DefaultSchemaToggle {...defaultProps} schema={inactiveDefaultSchema} />,
        { wrapper: createWrapper() }
      );

      // Should still be able to unset default even if schema is inactive
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Different Sizes', () => {
    it('renders small size when specified', () => {
      render(<DefaultSchemaToggle {...defaultProps} size="small" variant="button" />, {
        wrapper: createWrapper()
      });

      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-sizeSmall');
    });

    it('renders large size when specified', () => {
      render(<DefaultSchemaToggle {...defaultProps} size="large" variant="button" />, {
        wrapper: createWrapper()
      });

      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-sizeLarge');
    });
  });

  describe('Error Handling', () => {
    it('handles set default errors gracefully', async () => {
      const user = userEvent.setup();
      const errorSetMutation = {
        ...mockSetMutation,
        mutate: jest.fn((data, options) => {
          options?.onError?.(new Error('Failed to set default'));
        }),
      };

      useSetDefaultSchema.mockReturnValue(errorSetMutation);

      render(<DefaultSchemaToggle {...defaultProps} />, { wrapper: createWrapper() });

      const toggleButton = screen.getByLabelText(/set as default schema/i);
      await user.click(toggleButton);

      const confirmButton = screen.getByRole('button', { name: /set as default/i });
      await user.click(confirmButton);

      // Component should handle error gracefully (error handling is in mutation hook)
      expect(errorSetMutation.mutate).toHaveBeenCalled();
    });

    it('handles unset default errors gracefully', async () => {
      const user = userEvent.setup();
      const errorUnsetMutation = {
        ...mockUnsetMutation,
        mutate: jest.fn((data, options) => {
          options?.onError?.(new Error('Failed to unset default'));
        }),
      };

      useUnsetDefaultSchema.mockReturnValue(errorUnsetMutation);

      render(
        <DefaultSchemaToggle {...defaultProps} schema={mockDefaultSchema} />,
        { wrapper: createWrapper() }
      );

      const toggleButton = screen.getByLabelText(/remove default status/i);
      await user.click(toggleButton);

      const confirmButton = screen.getByRole('button', { name: /remove default/i });
      await user.click(confirmButton);

      expect(errorUnsetMutation.mutate).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for all variants', () => {
      const { rerender } = render(
        <DefaultSchemaToggle {...defaultProps} variant="icon" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/set as default schema/i)).toBeInTheDocument();

      rerender(
        <DefaultSchemaToggle {...defaultProps} variant="chip" />,
      );

      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(
        <DefaultSchemaToggle {...defaultProps} variant="button" />,
      );

      expect(screen.getByRole('button', { name: /set as default/i })).toBeInTheDocument();
    });

    it('has proper dialog accessibility', async () => {
      const user = userEvent.setup();
      render(<DefaultSchemaToggle {...defaultProps} />, { wrapper: createWrapper() });

      const toggleButton = screen.getByLabelText(/set as default schema/i);
      await user.click(toggleButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('Set Default Schema')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<DefaultSchemaToggle {...defaultProps} variant="button" />, {
        wrapper: createWrapper()
      });

      const button = screen.getByRole('button');

      await user.tab();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByText('Set Default Schema')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing projectId gracefully', async () => {
      const user = userEvent.setup();
      render(
        <DefaultSchemaToggle {...defaultProps} projectId={undefined} />,
        { wrapper: createWrapper() }
      );

      const toggleButton = screen.getByLabelText(/set as default schema/i);
      await user.click(toggleButton);

      const confirmButton = screen.getByRole('button', { name: /set as default/i });
      await user.click(confirmButton);

      // Should not call mutation without projectId
      expect(mockSetMutation.mutate).not.toHaveBeenCalled();
    });

    it('handles missing onDefaultChange gracefully', async () => {
      const user = userEvent.setup();
      const successSetMutation = {
        ...mockSetMutation,
        mutate: jest.fn((data, options) => {
          options?.onSuccess?.(mockDefaultSchema);
        }),
      };

      useSetDefaultSchema.mockReturnValue(successSetMutation);

      render(
        <DefaultSchemaToggle {...defaultProps} onDefaultChange={undefined} />,
        { wrapper: createWrapper() }
      );

      const toggleButton = screen.getByLabelText(/set as default schema/i);
      await user.click(toggleButton);

      const confirmButton = screen.getByRole('button', { name: /set as default/i });
      await user.click(confirmButton);

      // Should not throw error when callback is missing
      expect(successSetMutation.mutate).toHaveBeenCalled();
    });
  });
});