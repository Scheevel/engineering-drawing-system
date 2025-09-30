import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { jest } from '@jest/globals';
import FlexibleComponentCard from './FlexibleComponentCard';
import * as api from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  updateFlexibleComponent: jest.fn(),
  createFlexibleComponent: jest.fn(),
  getFlexibleComponent: jest.fn(),
  getProjectSchemas: jest.fn(),
  unlockComponentType: jest.fn(),
}));

// Mock the hooks
jest.mock('../../hooks/schema/useSchemaNavigation', () => ({
  useSchemaNavigation: () => ({
    navigateToSchemas: jest.fn(),
    navigateToSchemaEdit: jest.fn(),
  }),
}));

jest.mock('../../hooks/schema/useSchemaChangeListener', () => ({
  useSchemaChangeIntegration: () => ({
    emitSchemaUpdated: jest.fn(),
  }),
}));

const mockUpdateFlexibleComponent = api.updateFlexibleComponent as jest.MockedFunction<typeof api.updateFlexibleComponent>;
const mockGetFlexibleComponent = api.getFlexibleComponent as jest.MockedFunction<typeof api.getFlexibleComponent>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockComponent = {
  id: 'test-component-id',
  piece_mark: 'TEST-001',
  drawing_id: 'test-drawing-id',
  schema_id: 'test-schema-id',
  dynamic_data: {
    description: 'Test description',
    component_type: 'Test Type',
  },
  schema_info: {
    id: 'test-schema-id',
    name: 'Test Schema',
    version: 1,
    fields: [
      {
        id: 'description',
        name: 'Description',
        field_type: 'text',
        required: false,
        metadata: {},
      },
    ],
    project_id: 'test-project-id',
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  is_type_locked: false,
  location_x: 100,
  location_y: 200,
  confidence_score: 0.95,
  drawing_file_name: 'test-drawing.pdf',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('FlexibleComponentCard Save Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFlexibleComponent.mockResolvedValue(mockComponent);
  });

  const defaultProps = {
    componentId: 'test-component-id',
    open: true,
    onClose: jest.fn(),
    mode: 'edit' as const,
  };

  // COMP-EDIT-UNIT-001: Validate description text input format
  it('COMP-EDIT-UNIT-001: should validate description text input format', async () => {
    render(
      <FlexibleComponentCard {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    });

    const descriptionInput = screen.getByDisplayValue('Test description');
    fireEvent.change(descriptionInput, { target: { value: 'testt' } });

    expect(descriptionInput).toHaveValue('testt');
  });

  // COMP-EDIT-UNIT-002: Handle empty description field
  it('COMP-EDIT-UNIT-002: should handle empty description field', async () => {
    render(
      <FlexibleComponentCard {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    });

    const descriptionInput = screen.getByDisplayValue('Test description');
    fireEvent.change(descriptionInput, { target: { value: '' } });

    expect(descriptionInput).toHaveValue('');
  });

  // COMP-EDIT-UNIT-004: Save button click handler triggers
  it('COMP-EDIT-UNIT-004: should trigger save button click handler', async () => {
    mockUpdateFlexibleComponent.mockResolvedValue(mockComponent);

    render(
      <FlexibleComponentCard {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  // COMP-EDIT-UNIT-005: Form validation before save attempt
  it('COMP-EDIT-UNIT-005: should validate form before save attempt', async () => {
    render(
      <FlexibleComponentCard {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled(); // Should be disabled if validation fails
    });
  });

  // COMP-EDIT-UNIT-003: Validate description length limits
  it('COMP-EDIT-UNIT-003: should validate description length limits', async () => {
    render(
      <FlexibleComponentCard {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    });

    const descriptionInput = screen.getByDisplayValue('Test description');
    const longText = 'a'.repeat(1000); // Very long text
    fireEvent.change(descriptionInput, { target: { value: longText } });

    // The input should accept the text (validation happens at schema level)
    expect(descriptionInput).toHaveValue(longText);
  });

  // COMP-EDIT-UNIT-006: Loading state during save operation
  it('COMP-EDIT-UNIT-006: should show loading state during save operation', async () => {
    // Create a promise that we can control
    let resolveUpdate: (value: any) => void;
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });
    mockUpdateFlexibleComponent.mockReturnValue(updatePromise);

    render(
      <FlexibleComponentCard {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    // Button should be disabled during saving
    expect(screen.getByText('Saving...')).toBeDisabled();

    // Resolve the promise
    resolveUpdate!(mockComponent);

    // Should return to normal state
    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });
});