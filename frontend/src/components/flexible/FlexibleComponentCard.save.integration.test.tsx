import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { jest } from '@jest/globals';
import FlexibleComponentCard from './FlexibleComponentCard';

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

// Setup MSW server
const server = setupServer(
  rest.get('http://localhost:8001/api/v1/flexible-components/:id', (req, res, ctx) => {
    return res(ctx.json(mockComponent));
  }),
  rest.put('http://localhost:8001/api/v1/flexible-components/:id', (req, res, ctx) => {
    return res(ctx.json({ ...mockComponent, ...req.body }));
  }),
  rest.put('http://localhost:8001/api/v1/flexible-components/:id/error', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ detail: 'Internal server error' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

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

describe('FlexibleComponentCard Save Integration Tests', () => {
  const defaultProps = {
    componentId: 'test-component-id',
    open: true,
    onClose: jest.fn(),
    mode: 'edit' as const,
  };

  // COMP-EDIT-INT-001: Form state updates on description change
  it('COMP-EDIT-INT-001: should update form state when description changes', async () => {
    render(
      <FlexibleComponentCard {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    });

    const descriptionInput = screen.getByDisplayValue('Test description');

    // Change the value
    fireEvent.change(descriptionInput, { target: { value: 'testt' } });

    // Verify the form state updated
    expect(descriptionInput).toHaveValue('testt');

    // Verify the change persists
    fireEvent.blur(descriptionInput);
    expect(descriptionInput).toHaveValue('testt');
  });

  // COMP-EDIT-INT-002: Save action calls API service correctly
  it('COMP-EDIT-INT-002: should call API service correctly on save', async () => {
    let requestBody: any;
    server.use(
      rest.put('http://localhost:8001/api/v1/flexible-components/:id', (req, res, ctx) => {
        requestBody = req.body;
        return res(ctx.json({ ...mockComponent, ...req.body }));
      })
    );

    render(
      <FlexibleComponentCard {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    });

    // Make a change
    const descriptionInput = screen.getByDisplayValue('Test description');
    fireEvent.change(descriptionInput, { target: { value: 'testt' } });

    // Click save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Verify API was called with correct data
    await waitFor(() => {
      expect(requestBody).toBeDefined();
    });
  });

  // COMP-EDIT-INT-003: Handle API success response
  it('COMP-EDIT-INT-003: should handle API success response correctly', async () => {
    render(
      <FlexibleComponentCard {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    // Click save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Component updated successfully!')).toBeInTheDocument();
    });

    // Success alert should be visible
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardSuccess');
  });

  // COMP-EDIT-INT-004: Handle API error responses (4xx, 5xx)
  it('COMP-EDIT-INT-004: should handle API error responses correctly', async () => {
    // Set up error response
    server.use(
      rest.put('http://localhost:8001/api/v1/flexible-components/:id', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ detail: 'Internal server error' }));
      })
    );

    render(
      <FlexibleComponentCard {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    // Click save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to save changes/)).toBeInTheDocument();
    });

    // Error alert should be visible
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardError');
  });

  // COMP-EDIT-INT-005: Handle network timeout/failures
  it('COMP-EDIT-INT-005: should handle network timeout and failures', async () => {
    // Set up network error
    server.use(
      rest.put('http://localhost:8001/api/v1/flexible-components/:id', (req, res, ctx) => {
        return res.networkError('Network error');
      })
    );

    render(
      <FlexibleComponentCard {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    // Click save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to save changes/)).toBeInTheDocument();
    });

    // Error alert should be visible
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardError');
  });
});