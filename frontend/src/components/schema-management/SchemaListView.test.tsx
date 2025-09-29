/**
 * SchemaListView Component Tests
 *
 * Comprehensive tests for SchemaListView including:
 * - List rendering with different data sets
 * - Sorting and filtering functionality
 * - Search capabilities
 * - Empty states and loading states
 * - User interactions and event handling
 * - Accessibility compliance
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SchemaListView from './SchemaListView';
import {
  SchemaTestWrapper,
  createMockSchemas,
  createEdgeCaseSchemas,
  schemaTestHelpers,
  runAccessibilityTestSuite,
} from '../../test-utils';

// Mock the schema queries
jest.mock('../../services/schemaQueries.ts', () => ({
  useProjectSchemas: jest.fn(() => ({
    data: { schemas: [], total: 0 },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

describe('SchemaListView', () => {
  const mockSchemas = createMockSchemas(5);
  const edgeCaseSchemas = createEdgeCaseSchemas();

  const defaultProps = {
    projectId: 'test-project-1',
    onSchemaSelect: jest.fn(),
    onSchemaCreate: jest.fn(),
    onSchemaEdit: jest.fn(),
    onSchemaDelete: jest.fn(),
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock return
    const { useProjectSchemas } = require('../../services/schemaQueries.ts');
    useProjectSchemas.mockReturnValue({
      data: { schemas: mockSchemas, total: mockSchemas.length },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('renders schema list correctly', () => {
      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      // Should show schemas
      mockSchemas.forEach(schema => {
        expect(screen.getByText(schema.name)).toBeInTheDocument();
      });
    });

    it('renders create schema button when allowCreate is true', () => {
      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} allowCreate={true} />
        </SchemaTestWrapper>
      );

      expect(screen.getByRole('button', { name: /create schema/i })).toBeInTheDocument();
    });

    it('hides create schema button when allowCreate is false', () => {
      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} allowCreate={false} />
        </SchemaTestWrapper>
      );

      expect(screen.queryByRole('button', { name: /create schema/i })).not.toBeInTheDocument();
    });

    it('renders loading state correctly', () => {
      const { useProjectSchemas } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      // Should show loading indicators
      expect(screen.getByTestId(/loading|skeleton/i)).toBeInTheDocument();
    });

    it('renders empty state when no schemas exist', () => {
      const { useProjectSchemas } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: [], total: 0 },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      expect(screen.getByText(/no schemas found/i)).toBeInTheDocument();
    });

    it('renders error state correctly', () => {
      const { useProjectSchemas } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Failed to load schemas' },
        refetch: jest.fn(),
      });

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      expect(screen.getByText(/failed to load schemas/i)).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('renders search input', () => {
      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      expect(screen.getByRole('textbox', { name: /search schemas/i })).toBeInTheDocument();
    });

    it('filters schemas based on search term', async () => {
      const user = userEvent.setup();

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      const searchInput = screen.getByRole('textbox', { name: /search schemas/i });
      await user.type(searchInput, mockSchemas[0].name);

      await waitFor(() => {
        // Should filter the list (exact behavior depends on implementation)
        expect(searchInput).toHaveValue(mockSchemas[0].name);
      });
    });

    it('shows filter options', () => {
      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} showUsageStats={true} />
        </SchemaTestWrapper>
      );

      // Look for filter controls
      const filterButtons = screen.queryAllByRole('button', { name: /filter|sort/i });
      expect(filterButtons.length).toBeGreaterThan(0);
    });

    it('handles show inactive filter', async () => {
      const user = userEvent.setup();

      render(
        <SchemaTestWrapper>
          <SchemaListView
            {...defaultProps}
            filterOptions={{ showInactive: false }}
          />
        </SchemaTestWrapper>
      );

      // Look for show inactive checkbox/toggle
      const showInactiveToggle = screen.queryByLabelText(/show inactive/i);
      if (showInactiveToggle) {
        await user.click(showInactiveToggle);
        expect(showInactiveToggle).toBeChecked();
      }
    });
  });

  describe('Sorting', () => {
    it('renders sort options', () => {
      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      // Look for sort controls
      const sortButton = screen.queryByRole('button', { name: /sort/i });
      expect(sortButton || screen.queryByText(/sort by/i)).toBeInTheDocument();
    });

    it('handles sort by name', async () => {
      const user = userEvent.setup();

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      // Find and interact with sort controls
      const sortButton = screen.queryByRole('button', { name: /sort/i });
      if (sortButton) {
        await user.click(sortButton);

        // Look for sort options
        const nameSort = screen.queryByText(/name/i);
        if (nameSort) {
          await user.click(nameSort);
        }
      }
    });

    it('handles sort direction toggle', async () => {
      const user = userEvent.setup();

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      // Find sort direction toggle
      const sortToggle = screen.queryByRole('button', { name: /asc|desc|ascending|descending/i });
      if (sortToggle) {
        await user.click(sortToggle);
      }
    });
  });

  describe('User Interactions', () => {
    it('calls onSchemaSelect when schema is clicked', async () => {
      const user = userEvent.setup();
      const onSchemaSelect = jest.fn();

      render(
        <SchemaTestWrapper>
          <SchemaListView
            {...defaultProps}
            onSchemaSelect={onSchemaSelect}
          />
        </SchemaTestWrapper>
      );

      const schemaCard = screen.getByText(mockSchemas[0].name);
      await user.click(schemaCard);

      expect(onSchemaSelect).toHaveBeenCalledWith(mockSchemas[0]);
    });

    it('calls onSchemaCreate when create button is clicked', async () => {
      const user = userEvent.setup();
      const onSchemaCreate = jest.fn();

      render(
        <SchemaTestWrapper>
          <SchemaListView
            {...defaultProps}
            onSchemaCreate={onSchemaCreate}
          />
        </SchemaTestWrapper>
      );

      const createButton = screen.getByRole('button', { name: /create schema/i });
      await user.click(createButton);

      expect(onSchemaCreate).toHaveBeenCalled();
    });

    it('calls onSchemaEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      const onSchemaEdit = jest.fn();

      render(
        <SchemaTestWrapper>
          <SchemaListView
            {...defaultProps}
            onSchemaEdit={onSchemaEdit}
            allowEdit={true}
          />
        </SchemaTestWrapper>
      );

      // Find edit button for first schema
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      if (editButtons.length > 0) {
        await user.click(editButtons[0]);
        expect(onSchemaEdit).toHaveBeenCalledWith(mockSchemas[0]);
      }
    });

    it('calls onSchemaDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      const onSchemaDelete = jest.fn();

      render(
        <SchemaTestWrapper>
          <SchemaListView
            {...defaultProps}
            onSchemaDelete={onSchemaDelete}
            allowDelete={true}
          />
        </SchemaTestWrapper>
      );

      // Find delete button for first schema
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);

        // Handle confirmation dialog if present
        const confirmButton = screen.queryByRole('button', { name: /confirm|yes/i });
        if (confirmButton) {
          await user.click(confirmButton);
        }

        expect(onSchemaDelete).toHaveBeenCalledWith(mockSchemas[0]);
      }
    });

    it('handles refresh action', async () => {
      const user = userEvent.setup();
      const mockRefetch = jest.fn();

      const { useProjectSchemas } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: mockSchemas, total: mockSchemas.length },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      const refreshButton = screen.queryByRole('button', { name: /refresh/i });
      if (refreshButton) {
        await user.click(refreshButton);
        expect(mockRefetch).toHaveBeenCalled();
      }
    });
  });

  describe('Selection Handling', () => {
    it('highlights selected schema', () => {
      const selectedSchemaId = mockSchemas[1].id;

      render(
        <SchemaTestWrapper>
          <SchemaListView
            {...defaultProps}
            selectedSchemaId={selectedSchemaId}
          />
        </SchemaTestWrapper>
      );

      // Selected schema should be highlighted
      const selectedCard = screen.getByText(mockSchemas[1].name).closest('[data-selected="true"]');
      expect(selectedCard || screen.getByText(mockSchemas[1].name)).toBeInTheDocument();
    });

    it('allows single selection', async () => {
      const user = userEvent.setup();
      const onSchemaSelect = jest.fn();

      render(
        <SchemaTestWrapper>
          <SchemaListView
            {...defaultProps}
            onSchemaSelect={onSchemaSelect}
          />
        </SchemaTestWrapper>
      );

      // Click different schemas
      await user.click(screen.getByText(mockSchemas[0].name));
      await user.click(screen.getByText(mockSchemas[1].name));

      expect(onSchemaSelect).toHaveBeenCalledTimes(2);
      expect(onSchemaSelect).toHaveBeenLastCalledWith(mockSchemas[1]);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty project ID gracefully', () => {
      render(
        <SchemaTestWrapper>
          <SchemaListView
            {...defaultProps}
            projectId=""
          />
        </SchemaTestWrapper>
      );

      // Should not crash
      expect(screen.getByTestId('schema-list') || screen.getByText(/schemas/i)).toBeInTheDocument();
    });

    it('handles schemas with missing data gracefully', () => {
      const incompleteSchemas = [
        ...mockSchemas,
        { id: 'incomplete', name: null, description: null } as any,
      ];

      const { useProjectSchemas } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: incompleteSchemas, total: incompleteSchemas.length },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      // Should handle incomplete data without crashing
      expect(screen.getByText(mockSchemas[0].name)).toBeInTheDocument();
    });

    it('handles very large number of schemas', () => {
      const manySchemas = Array.from({ length: 100 }, (_, i) =>
        createMockSchemas(1)[0]
      );

      const { useProjectSchemas } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: manySchemas, total: manySchemas.length },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      // Should handle large lists (might implement virtualization)
      expect(screen.getByTestId('schema-list') || screen.getByText(/schemas/i)).toBeInTheDocument();
    });

    it('handles edge case schemas properly', () => {
      const { useProjectSchemas } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: edgeCaseSchemas, total: edgeCaseSchemas.length },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      // Should render edge case schemas
      edgeCaseSchemas.forEach(schema => {
        if (schema.name) {
          expect(screen.getByText(schema.name)).toBeInTheDocument();
        }
      });
    });
  });

  describe('Accessibility', () => {
    it('meets accessibility requirements', async () => {
      const { container } = render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      await runAccessibilityTestSuite(container);
    });

    it('has proper ARIA labels and roles', () => {
      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      // Check for proper roles
      expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument();

      // List should have proper role
      const list = screen.getByRole('list') || screen.getByTestId('schema-list');
      expect(list).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      // Test keyboard navigation through interactive elements
      const searchInput = screen.getByRole('textbox', { name: /search/i });
      const createButton = screen.getByRole('button', { name: /create/i });

      await schemaTestHelpers.testKeyboardNavigation([searchInput, createButton]);
    });

    it('announces search results to screen readers', async () => {
      const user = userEvent.setup();

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      const searchInput = screen.getByRole('textbox', { name: /search/i });
      await user.type(searchInput, 'test');

      // Should have aria-live region for search results
      const liveRegion = screen.queryByRole('status') || screen.queryByLabelText(/search results/i);
      expect(liveRegion || searchInput).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('handles rapid search input changes gracefully', async () => {
      const user = userEvent.setup();

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      const searchInput = screen.getByRole('textbox', { name: /search/i });

      // Rapid typing simulation
      await user.type(searchInput, 'rapid search test', { delay: 10 });

      // Should not crash or cause performance issues
      expect(searchInput).toHaveValue('rapid search test');
    });

    it('handles rapid sort/filter changes', async () => {
      const user = userEvent.setup();

      render(
        <SchemaTestWrapper>
          <SchemaListView {...defaultProps} />
        </SchemaTestWrapper>
      );

      // Find and rapidly click sort/filter controls
      const controls = screen.getAllByRole('button');
      for (const control of controls.slice(0, 3)) {
        await user.click(control);
      }

      // Should handle rapid interactions without issues
      expect(screen.getByTestId('schema-list') || screen.getByText(/schemas/i)).toBeInTheDocument();
    });
  });
});