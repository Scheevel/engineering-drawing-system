/**
 * SchemaManagementCard Component Tests
 *
 * Tests for SchemaManagementCard including:
 * - Rendering in different modes
 * - User interactions (edit, save, cancel)
 * - Default schema toggle functionality
 * - Error handling and loading states
 * - Accessibility compliance
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SchemaManagementCard from './SchemaManagementCard';

// Mock the schema queries with comprehensive mock
jest.mock('../../services/schemaQueries.ts');

// Mock DefaultSchemaToggle component
jest.mock('./DefaultSchemaToggle.tsx', () => {
  return function MockDefaultSchemaToggle({ schema, disabled, onDefaultChange }: any) {
    return (
      <button
        data-testid="default-schema-toggle"
        disabled={disabled}
        onClick={() => onDefaultChange?.(schema.is_default ? null : schema)}
      >
        {schema.is_default ? 'Default' : 'Set as Default'}
      </button>
    );
  };
});

// Mock data
const mockSchema = {
  id: 'schema-1',
  name: 'Test Schema',
  description: 'A test schema for unit testing',
  version: '1.0.0',
  is_active: true,
  is_default: false,
  project_id: 'test-project-123',
  fields: [
    { id: 'field-1', name: 'Field 1', type: 'text' },
    { id: 'field-2', name: 'Field 2', type: 'number' },
  ],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

const mockUsageStats = {
  schema_id: 'schema-1',
  schema_name: 'Test Schema',
  component_count: 5,
  last_used: '2024-01-15T10:00:00Z',
  created_at: '2023-01-01T00:00:00Z',
  is_active: true,
  is_default: false,
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

describe('SchemaManagementCard', () => {
  const defaultProps = {
    schema: mockSchema,
    usageStats: mockUsageStats,
    onEdit: jest.fn(),
    onView: jest.fn(),
    onSaveSuccess: jest.fn(),
    onDefaultChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders schema information correctly', () => {
      render(<SchemaManagementCard {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('Test Schema')).toBeInTheDocument();
      expect(screen.getByText('A test schema for unit testing')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Field count
      expect(screen.getByText('5')).toBeInTheDocument(); // Component count from usage stats
    });

    it('renders default schema indicator when schema is default', () => {
      const defaultSchema = { ...mockSchema, is_default: true };

      render(
        <SchemaManagementCard {...defaultProps} schema={defaultSchema} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('renders inactive schema indicator when schema is inactive', () => {
      const inactiveSchema = { ...mockSchema, is_active: false };

      render(
        <SchemaManagementCard {...defaultProps} schema={inactiveSchema} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('renders loading state correctly', () => {
      render(
        <SchemaManagementCard {...defaultProps} isLoading={true} />,
        { wrapper: createWrapper() }
      );

      // Check for skeleton loaders - MUI Skeleton components
      const skeletons = screen.getAllByTestId(/loading/i) || [];
      // If no specific test IDs, check for skeleton elements by role or class
      const loadingElements = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length > 0 || loadingElements.length > 0).toBe(true);
    });

    it('renders without usage stats gracefully', () => {
      render(
        <SchemaManagementCard schema={mockSchema} onEdit={jest.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Test Schema')).toBeInTheDocument();
      // Should not crash when usageStats is undefined
    });

    it('handles null schema gracefully', () => {
      render(
        <SchemaManagementCard schema={null as any} onEdit={jest.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Schema data not available')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('enters edit mode when edit button is clicked', async () => {
      render(<SchemaManagementCard {...defaultProps} />, { wrapper: createWrapper() });

      const editButton = screen.getByLabelText(/edit schema/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/schema name/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Schema')).toBeInTheDocument();
      });
    });

    it('shows save and cancel buttons in edit mode', async () => {
      render(<SchemaManagementCard {...defaultProps} />, { wrapper: createWrapper() });

      const editButton = screen.getByLabelText(/edit schema/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    it('validates required fields', async () => {
      render(<SchemaManagementCard {...defaultProps} />, { wrapper: createWrapper() });

      const editButton = screen.getByLabelText(/edit schema/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/schema name/i);
        fireEvent.change(nameInput, { target: { value: '' } });
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('User Interactions', () => {
    it('calls onEdit when external edit is triggered', () => {
      const onEdit = jest.fn();
      render(
        <SchemaManagementCard {...defaultProps} onEdit={onEdit} allowInlineEdit={false} />,
        { wrapper: createWrapper() }
      );

      const editButton = screen.getByLabelText(/edit schema/i);
      fireEvent.click(editButton);

      expect(onEdit).toHaveBeenCalledWith(mockSchema);
    });

    it('calls onView when view button is clicked', () => {
      const onView = jest.fn();
      render(
        <SchemaManagementCard {...defaultProps} onView={onView} />,
        { wrapper: createWrapper() }
      );

      const viewButton = screen.getByLabelText(/view schema details/i);
      fireEvent.click(viewButton);

      expect(onView).toHaveBeenCalledWith(mockSchema);
    });
  });

  describe('Default Schema Toggle', () => {
    it('renders default schema toggle when allowed', () => {
      render(
        <SchemaManagementCard
          {...defaultProps}
          allowDefaultToggle={true}
          projectId="test-project"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('default-schema-toggle')).toBeInTheDocument();
    });

    it('calls onDefaultChange when toggle is clicked', () => {
      const onDefaultChange = jest.fn();
      render(
        <SchemaManagementCard
          {...defaultProps}
          onDefaultChange={onDefaultChange}
          allowDefaultToggle={true}
          projectId="test-project"
        />,
        { wrapper: createWrapper() }
      );

      const toggle = screen.getByTestId('default-schema-toggle');
      fireEvent.click(toggle);

      expect(onDefaultChange).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<SchemaManagementCard {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/edit schema/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /test schema/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<SchemaManagementCard {...defaultProps} />, { wrapper: createWrapper() });

      const editButton = screen.getByLabelText(/edit schema/i);
      expect(editButton).toBeVisible();

      // Button should be focusable
      editButton.focus();
      expect(document.activeElement).toBe(editButton);
    });
  });

  describe('Error Handling', () => {
    it('displays error when mutation fails', async () => {
      const { useUpdateSchema } = require('../../services/schemaQueries.ts');
      useUpdateSchema.mockReturnValue({
        mutate: jest.fn(),
        isLoading: false,
        error: new Error('Update failed'),
      });

      render(<SchemaManagementCard {...defaultProps} />, { wrapper: createWrapper() });

      const editButton = screen.getByLabelText(/edit schema/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Component State', () => {
    it('disables edit button for inactive schemas', () => {
      const inactiveSchema = { ...mockSchema, is_active: false };
      render(
        <SchemaManagementCard {...defaultProps} schema={inactiveSchema} />,
        { wrapper: createWrapper() }
      );

      const editButton = screen.getByLabelText(/edit schema/i);
      expect(editButton).toBeDisabled();
    });

    it('shows loading state during save', async () => {
      const { useUpdateSchema } = require('../../services/schemaQueries.ts');
      const mockMutate = jest.fn();
      useUpdateSchema.mockReturnValue({
        mutate: mockMutate,
        isLoading: true,
        error: null,
      });

      render(<SchemaManagementCard {...defaultProps} />, { wrapper: createWrapper() });

      const editButton = screen.getByLabelText(/edit schema/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).toHaveAttribute('aria-disabled', 'true');
      });
    });
  });
});