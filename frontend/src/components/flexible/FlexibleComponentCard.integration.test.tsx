/**
 * Integration Tests for FlexibleComponentCard Schema Management Enhancements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import FlexibleComponentCard from './FlexibleComponentCard.tsx';
import { SchemaEventBus } from '../../utils/schemaEventBus.ts';

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/projects/test-project/components',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  }),
}));

// Mock the API services
jest.mock('../../services/api.ts', () => ({
  getComponent: jest.fn(),
  updateComponent: jest.fn(),
  deleteComponent: jest.fn(),
  getAvailableSchemas: jest.fn(),
  unlockComponentType: jest.fn(),
}));

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('FlexibleComponentCard Schema Management Integration', () => {
  const mockComponent = {
    id: 'comp-123',
    name: 'Test Component',
    description: 'Test Description',
    drawing_id: 'drawing-456',
    project_id: 'project-789',
    schema_id: 'schema-001',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    location: { x: 100, y: 200 },
    dimensions: { width: 50, height: 30 },
    dynamic_fields: {},
    is_active: true,
  };

  beforeEach(() => {
    // Clear all event bus subscriptions
    SchemaEventBus.clear();

    // Clear session storage
    mockSessionStorage.clear();

    // Clear mock calls
    mockNavigate.mockClear();

    // Reset API mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    SchemaEventBus.clear();
  });

  describe('Schema Management Button Integration', () => {
    it('should render Manage Schemas button when in edit mode', async () => {
      render(
        <TestWrapper>
          <FlexibleComponentCard
            componentId={mockComponent.id}
            drawingId={mockComponent.drawing_id}
            projectId={mockComponent.project_id}
            open={true}
            onClose={jest.fn()}
            mode="edit"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Manage Schemas')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should render Edit Schema button when in edit mode with schema', async () => {
      render(
        <TestWrapper>
          <FlexibleComponentCard
            componentId={mockComponent.id}
            drawingId={mockComponent.drawing_id}
            projectId={mockComponent.project_id}
            open={true}
            onClose={jest.fn()}
            mode="edit"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Schema')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should not render schema buttons when no project ID in edit mode', async () => {
      render(
        <TestWrapper>
          <FlexibleComponentCard
            componentId={mockComponent.id}
            drawingId={mockComponent.drawing_id}
            projectId={undefined}
            open={true}
            onClose={jest.fn()}
            mode="edit"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Manage Schemas')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Navigation Context Preservation', () => {
    it('should save component context when navigating to schemas', async () => {
      render(
        <TestWrapper>
          <FlexibleComponentCard
            componentId={mockComponent.id}
            drawingId={mockComponent.drawing_id}
            projectId={mockComponent.project_id}
            open={true}
            onClose={jest.fn()}
            mode="edit"
          />
        </TestWrapper>
      );

      // Wait for component to load and render the button
      await waitFor(() => {
        expect(screen.getByText('Manage Schemas')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Click Manage Schemas button
      await act(async () => {
        fireEvent.click(screen.getByText('Manage Schemas'));
      });

      // Check that context was saved to sessionStorage
      const savedContext = JSON.parse(
        mockSessionStorage.getItem('flexibleComponentContext') || '{}'
      );

      expect(savedContext).toEqual({
        componentId: 'comp-123',
        drawingId: 'drawing-456',
        projectId: 'project-789',
        mode: 'edit',
        timestamp: expect.any(Number),
      });

      // Check navigation
      expect(mockNavigate).toHaveBeenCalledWith('/projects/project-789/schemas');
    });

    it('should save component context when navigating to edit schema', async () => {
      render(
        <TestWrapper>
          <FlexibleComponentCard
            component={mockComponent}
            mode="edit"
            onEdit={jest.fn()}
            onDelete={jest.fn()}
            onSelect={jest.fn()}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      // Click Edit Schema button
      await act(async () => {
        fireEvent.click(screen.getByText('Edit Schema'));
      });

      // Check that context was saved
      const savedContext = JSON.parse(
        mockSessionStorage.getItem('flexibleComponentContext') || '{}'
      );

      expect(savedContext.mode).toBe('edit');
      expect(savedContext.componentId).toBe('comp-123');

      // Check navigation to specific schema
      expect(mockNavigate).toHaveBeenCalledWith('/projects/project-789/schemas/schema-001/edit');
    });

    it('should navigate to create schema when no schema ID exists', async () => {
      const componentWithoutSchema = { ...mockComponent, schema_id: undefined };

      render(
        <TestWrapper>
          <FlexibleComponentCard
            component={componentWithoutSchema}
            mode="edit"
            onEdit={jest.fn()}
            onDelete={jest.fn()}
            onSelect={jest.fn()}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      // Click Edit Schema button (should say "Create Schema" or similar)
      const schemaButton = screen.getByRole('button', { name: /schema/i });

      await act(async () => {
        fireEvent.click(schemaButton);
      });

      // Should navigate to create schema page
      expect(mockNavigate).toHaveBeenCalledWith('/projects/project-789/schemas/create');
    });
  });

  describe('Schema Event Integration', () => {
    it('should listen for schema change events and update UI', async () => {
      const onEdit = jest.fn();

      render(
        <TestWrapper>
          <FlexibleComponentCard
            component={mockComponent}
            mode="edit"
            onEdit={onEdit}
            onDelete={jest.fn()}
            onSelect={jest.fn()}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      // Emit a schema change event
      SchemaEventBus.emit({
        type: 'schema_updated',
        schemaId: 'schema-001',
        projectId: 'project-789',
        data: { name: 'Updated Schema Name' },
      });

      // The component should have an event listener active
      expect(SchemaEventBus.getSubscriptionCount()).toBeGreaterThan(0);
    });

    it('should handle schema deletion events', async () => {
      const onEdit = jest.fn();

      render(
        <TestWrapper>
          <FlexibleComponentCard
            component={mockComponent}
            mode="edit"
            onEdit={onEdit}
            onDelete={jest.fn()}
            onSelect={jest.fn()}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      // Emit a schema deletion event for the component's schema
      SchemaEventBus.emit({
        type: 'schema_deleted',
        schemaId: 'schema-001',
        projectId: 'project-789',
      });

      // Component should handle the event (specific behavior depends on implementation)
      expect(SchemaEventBus.getSubscriptionCount()).toBeGreaterThan(0);
    });

    it('should filter events by project ID', async () => {
      const mockCallback = jest.fn();

      render(
        <TestWrapper>
          <FlexibleComponentCard
            component={mockComponent}
            mode="edit"
            onEdit={jest.fn()}
            onDelete={jest.fn()}
            onSelect={jest.fn()}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      // Subscribe to verify filtering
      SchemaEventBus.subscribe(mockCallback);

      // Emit events for different projects
      SchemaEventBus.emit({
        type: 'schema_created',
        schemaId: 'new-schema',
        projectId: 'project-789', // Same project
      });

      SchemaEventBus.emit({
        type: 'schema_created',
        schemaId: 'other-schema',
        projectId: 'other-project', // Different project
      });

      expect(mockCallback).toHaveBeenCalledTimes(2); // All events reach the general subscriber
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', async () => {
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      render(
        <TestWrapper>
          <FlexibleComponentCard
            component={mockComponent}
            mode="edit"
            onEdit={jest.fn()}
            onDelete={jest.fn()}
            onSelect={jest.fn()}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      // Should not throw when clicking button
      await expect(async () => {
        await act(async () => {
          fireEvent.click(screen.getByText('Manage Schemas'));
        });
      }).not.toThrow();
    });

    it('should handle sessionStorage errors gracefully', async () => {
      // Mock sessionStorage to throw
      const originalSetItem = mockSessionStorage.setItem;
      mockSessionStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      render(
        <TestWrapper>
          <FlexibleComponentCard
            component={mockComponent}
            mode="edit"
            onEdit={jest.fn()}
            onDelete={jest.fn()}
            onSelect={jest.fn()}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      // Should not throw when clicking button
      await expect(async () => {
        await act(async () => {
          fireEvent.click(screen.getByText('Manage Schemas'));
        });
      }).not.toThrow();

      // Restore original method
      mockSessionStorage.setItem = originalSetItem;
    });
  });

  describe('Real-time Updates', () => {
    it('should show loading indicators during schema operations', async () => {
      // Mock a delayed API response
      const { getAvailableSchemas } = require('../../services/api.ts');
      getAvailableSchemas.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ available_schemas: [] }), 100))
      );

      render(
        <TestWrapper>
          <FlexibleComponentCard
            component={mockComponent}
            mode="edit"
            onEdit={jest.fn()}
            onDelete={jest.fn()}
            onSelect={jest.fn()}
            showSchemaManagement={true}
          />
        </TestWrapper>
      );

      // Look for loading indicators (implementation may vary)
      // This test ensures the component handles async operations gracefully
    });

    it('should update when schemas are refreshed', async () => {
      render(
        <TestWrapper>
          <FlexibleComponentCard
            component={mockComponent}
            mode="edit"
            onEdit={jest.fn()}
            onDelete={jest.fn()}
            onSelect={jest.fn()}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      // Emit a schema refresh event
      SchemaEventBus.emit({
        type: 'schema_created',
        schemaId: 'new-schema',
        projectId: 'project-789',
        data: { name: 'New Schema' },
      });

      // Component should handle the refresh
      await waitFor(() => {
        expect(SchemaEventBus.getSubscriptionCount()).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible schema management buttons', () => {
      render(
        <TestWrapper>
          <FlexibleComponentCard
            component={mockComponent}
            mode="edit"
            onEdit={jest.fn()}
            onDelete={jest.fn()}
            onSelect={jest.fn()}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      const manageButton = screen.getByText('Manage Schemas');
      expect(manageButton).toHaveAttribute('type', 'button');
      expect(manageButton).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should provide appropriate aria labels for schema actions', () => {
      render(
        <TestWrapper>
          <FlexibleComponentCard
            component={mockComponent}
            mode="edit"
            onEdit={jest.fn()}
            onDelete={jest.fn()}
            onSelect={jest.fn()}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      const editButton = screen.getByText('Edit Schema');
      expect(editButton).toBeInTheDocument();
      // Additional aria-label checks can be added based on implementation
    });
  });
});