/**
 * SchemaCreateDialog Component Tests
 *
 * Tests for SchemaCreateDialog including:
 * - Dialog opening/closing
 * - Form validation (name, description, project selection)
 * - Global vs project-specific schema creation
 * - Error handling and success scenarios
 * - User interactions and workflow completion
 */

import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SchemaCreateDialog from './SchemaCreateDialog';

// Mock the schema queries and API
jest.mock('../../services/schemaQueries.ts');
jest.mock('../../services/api.ts', () => ({
  getProjects: jest.fn(),
}));

// Import mocked functions
const { useCreateSchema } = require('../../services/schemaQueries.ts');
const { getProjects } = require('../../services/api.ts');

// Mock data
const mockProjects = [
  { id: 'project-1', name: 'Test Project 1', description: 'First test project' },
  { id: 'project-2', name: 'Test Project 2', description: 'Second test project' },
];

const mockCreatedSchema = {
  id: 'schema-new-1',
  name: 'New Test Schema',
  description: 'A newly created test schema',
  version: '1.0.0',
  is_active: true,
  is_default: false,
  project_id: 'project-1',
  fields: [],
  created_at: '2025-01-28T10:00:00Z',
  updated_at: '2025-01-28T10:00:00Z',
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

describe('SchemaCreateDialog', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  const mockCreateMutation = {
    mutate: jest.fn(),
    isLoading: false,
    error: null,
    reset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useCreateSchema
    useCreateSchema.mockReturnValue(mockCreateMutation);

    // Mock getProjects
    getProjects.mockResolvedValue(mockProjects);

    // Mock QueryClient for projects
    const queryClient = new QueryClient();
    queryClient.setQueryData('projects', mockProjects);
  });

  describe('Dialog Rendering', () => {
    it('renders dialog when open', () => {
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create New Schema')).toBeInTheDocument();
      expect(screen.getByLabelText(/schema name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('does not render dialog when closed', () => {
      render(<SchemaCreateDialog {...defaultProps} open={false} />, {
        wrapper: createWrapper()
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders with pre-selected project when projectId provided', async () => {
      render(
        <SchemaCreateDialog {...defaultProps} projectId="project-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
    });

    it('renders global schema option by default', () => {
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText(/global schema/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/global schema/i)).not.toBeChecked();
    });
  });

  describe('Form Validation', () => {
    it('validates required schema name', async () => {
      const user = userEvent.setup();
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      const createButton = screen.getByRole('button', { name: /create schema/i });

      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/schema name is required/i)).toBeInTheDocument();
      });
    });

    it('validates schema name length constraints', async () => {
      const user = userEvent.setup();
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      const nameField = screen.getByLabelText(/schema name/i);

      // Test minimum length
      await user.type(nameField, 'AB');
      await user.tab(); // Trigger validation

      await waitFor(() => {
        expect(screen.getByText(/must be at least 3 characters/i)).toBeInTheDocument();
      });

      // Test maximum length
      await user.clear(nameField);
      await user.type(nameField, 'A'.repeat(101));
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/must be less than 100 characters/i)).toBeInTheDocument();
      });
    });

    it('validates schema name format', async () => {
      const user = userEvent.setup();
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      const nameField = screen.getByLabelText(/schema name/i);

      await user.type(nameField, 'Invalid@Name!');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/can only contain letters, numbers/i)).toBeInTheDocument();
      });
    });

    it('validates description length', async () => {
      const user = userEvent.setup();
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      const descriptionField = screen.getByLabelText(/description/i);

      await user.type(descriptionField, 'A'.repeat(501));
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/must be less than 500 characters/i)).toBeInTheDocument();
      });
    });

    it('requires project selection for non-global schemas', async () => {
      const user = userEvent.setup();
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      // Ensure it starts as non-global
      const globalToggle = screen.getByLabelText(/global schema/i);
      expect(globalToggle).not.toBeChecked();

      const nameField = screen.getByLabelText(/schema name/i);
      await user.type(nameField, 'Valid Schema Name');

      const createButton = screen.getByRole('button', { name: /create schema/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/project selection is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Global vs Project-Specific Logic', () => {
    it('shows project selection when not global', async () => {
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/project/i)).toBeInTheDocument();
      });
    });

    it('hides project selection when global', async () => {
      const user = userEvent.setup();
      render(<SchemaCreateDialog {...defaultProps} defaultToGlobal={true} />, {
        wrapper: createWrapper()
      });

      const globalToggle = screen.getByLabelText(/global schema/i);
      expect(globalToggle).toBeChecked();

      expect(screen.queryByLabelText(/project/i)).not.toBeInTheDocument();
    });

    it('toggles project selection visibility with global toggle', async () => {
      const user = userEvent.setup();
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      // Initially not global, project selection visible
      await waitFor(() => {
        expect(screen.getByLabelText(/project/i)).toBeInTheDocument();
      });

      // Toggle to global
      const globalToggle = screen.getByLabelText(/global schema/i);
      await user.click(globalToggle);

      await waitFor(() => {
        expect(screen.queryByLabelText(/project/i)).not.toBeInTheDocument();
      });

      // Toggle back to project-specific
      await user.click(globalToggle);

      await waitFor(() => {
        expect(screen.getByLabelText(/project/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('creates global schema with correct data', async () => {
      const user = userEvent.setup();
      render(<SchemaCreateDialog {...defaultProps} defaultToGlobal={true} />, {
        wrapper: createWrapper()
      });

      const nameField = screen.getByLabelText(/schema name/i);
      const descriptionField = screen.getByLabelText(/description/i);

      await user.type(nameField, 'Global Test Schema');
      await user.type(descriptionField, 'A global schema for testing');

      const createButton = screen.getByRole('button', { name: /create schema/i });

      await waitFor(() => {
        expect(createButton).not.toBeDisabled();
      });

      await user.click(createButton);

      expect(mockCreateMutation.mutate).toHaveBeenCalledWith({
        name: 'Global Test Schema',
        description: 'A global schema for testing',
        project_id: undefined,
        fields: [],
        is_default: false,
      });
    });

    it('creates project-specific schema with correct data', async () => {
      const user = userEvent.setup();
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      const nameField = screen.getByLabelText(/schema name/i);
      const descriptionField = screen.getByLabelText(/description/i);

      await user.type(nameField, 'Project Test Schema');
      await user.type(descriptionField, 'A project-specific schema');

      // Select project
      await waitFor(() => {
        expect(screen.getByLabelText(/project/i)).toBeInTheDocument();
      });

      const projectSelect = screen.getByLabelText(/project/i);
      await user.click(projectSelect);

      const project1Option = await screen.findByText('Test Project 1');
      await user.click(project1Option);

      const createButton = screen.getByRole('button', { name: /create schema/i });

      await waitFor(() => {
        expect(createButton).not.toBeDisabled();
      });

      await user.click(createButton);

      expect(mockCreateMutation.mutate).toHaveBeenCalledWith({
        name: 'Project Test Schema',
        description: 'A project-specific schema',
        project_id: 'project-1',
        fields: [],
        is_default: false,
      });
    });

    it('includes default schema flag when selected', async () => {
      const user = userEvent.setup();
      render(<SchemaCreateDialog {...defaultProps} projectId="project-1" />, {
        wrapper: createWrapper()
      });

      const nameField = screen.getByLabelText(/schema name/i);
      await user.type(nameField, 'Default Test Schema');

      const defaultToggle = screen.getByLabelText(/set as default/i);
      await user.click(defaultToggle);

      const createButton = screen.getByRole('button', { name: /create schema/i });

      await waitFor(() => {
        expect(createButton).not.toBeDisabled();
      });

      await user.click(createButton);

      expect(mockCreateMutation.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_default: true,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('displays API error messages', async () => {
      const user = userEvent.setup();
      const errorMutation = {
        ...mockCreateMutation,
        mutate: jest.fn((data, options) => {
          options?.onError?.({
            response: { data: { detail: 'Schema name already exists' } }
          });
        }),
      };

      useCreateSchema.mockReturnValue(errorMutation);

      render(<SchemaCreateDialog {...defaultProps} defaultToGlobal={true} />, {
        wrapper: createWrapper()
      });

      const nameField = screen.getByLabelText(/schema name/i);
      await user.type(nameField, 'Duplicate Schema');

      const createButton = screen.getByRole('button', { name: /create schema/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Schema name already exists')).toBeInTheDocument();
      });
    });

    it('shows loading state during creation', async () => {
      const loadingMutation = {
        ...mockCreateMutation,
        isLoading: true,
      };

      useCreateSchema.mockReturnValue(loadingMutation);

      render(<SchemaCreateDialog {...defaultProps} defaultToGlobal={true} />, {
        wrapper: createWrapper()
      });

      const createButton = screen.getByRole('button', { name: /creating/i });
      expect(createButton).toBeDisabled();
    });
  });

  describe('Dialog Controls', () => {
    it('calls onClose when cancel button clicked', async () => {
      const user = userEvent.setup();
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when close icon clicked', async () => {
      const user = userEvent.setup();
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      const closeButton = screen.getByLabelText(/close/i);
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onSuccess and closes on successful creation', async () => {
      const successMutation = {
        ...mockCreateMutation,
        mutate: jest.fn((data, options) => {
          options?.onSuccess?.(mockCreatedSchema);
        }),
      };

      useCreateSchema.mockReturnValue(successMutation);

      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      const nameField = screen.getByLabelText(/schema name/i);
      await userEvent.type(nameField, 'Success Schema');

      const createButton = screen.getByRole('button', { name: /create schema/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockCreatedSchema);
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/schema name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/global schema/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<SchemaCreateDialog {...defaultProps} />, { wrapper: createWrapper() });

      const nameField = screen.getByLabelText(/schema name/i);

      await user.tab();
      expect(nameField).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();
    });
  });
});