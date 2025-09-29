/**
 * Virtual Field List Component Tests
 *
 * Tests for the virtual scrolling field list including performance optimizations,
 * memoization, and large dataset handling.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import VirtualFieldList, { FieldItem, FieldItemSkeleton } from './VirtualFieldList';
import { ComponentSchemaField } from '../../types/schema';

// Mock react-window
const mockScrollToItem = jest.fn();
const mockReact = require('react');

jest.mock('react-window', () => ({
  FixedSizeList: mockReact.forwardRef(({ children, itemCount, itemSize, onScroll, height }: any, ref: any) => {
    // Expose scroll function for testing
    mockReact.useImperativeHandle(ref, () => ({
      scrollToItem: mockScrollToItem,
    }));

    // Render first few items for testing
    const items = [];
    for (let i = 0; i < Math.min(10, itemCount); i++) {
      items.push(
        children({
          index: i,
          style: { height: itemSize, position: 'absolute', top: i * itemSize },
        })
      );
    }

    return mockReact.createElement(
      'div',
      {
        'data-testid': 'virtual-list',
        style: { height, overflow: 'auto' },
        onScroll: (e: any) => onScroll?.({ scrollTop: e.target.scrollTop }),
      },
      items
    );
  }),
}));

// Mock performance optimizations hooks
jest.mock('../../hooks/schema/usePerformanceOptimizations', () => ({
  useVirtualScroll: () => ({
    virtualItems: [],
    totalHeight: 0,
    scrollTop: 0,
    setScrollTop: jest.fn(),
  }),
  usePerformanceMonitor: () => ({
    start: jest.fn(),
    end: jest.fn(),
    getStats: jest.fn(),
    clear: jest.fn(),
  }),
}));

// Mock schema config
jest.mock('../../config/schemaConfig', () => ({
  useSchemaConfig: () => ({
    config: {
      performance: {
        enableVirtualScrolling: true,
        virtualScrollThreshold: 50,
        enableMemoization: true,
        debounceMs: 300,
      },
    },
  }),
}));

// Test data
const createMockField = (id: string, overrides: Partial<ComponentSchemaField> = {}): ComponentSchemaField => ({
  id,
  schema_id: 'schema-123',
  field_name: `field_${id}`,
  field_type: 'text',
  display_order: parseInt(id),
  is_required: false,
  help_text: `Help text for field ${id}`,
  validation_rules: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const mockFields: ComponentSchemaField[] = Array.from({ length: 100 }, (_, i) =>
  createMockField(i.toString(), {
    field_name: `field_${i}`,
    display_order: i + 1,
    is_required: i % 3 === 0,
  })
);

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  });

  const theme = createTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('VirtualFieldList', () => {
  const defaultProps = {
    fields: mockFields.slice(0, 10),
    onFieldSelect: jest.fn(),
    onFieldEdit: jest.fn(),
    onFieldDelete: jest.fn(),
    selectedFieldIds: new Set<string>(),
    height: 400,
    itemHeight: 80,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render field list', () => {
      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('should render empty state', () => {
      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} fields={[]} />
        </TestWrapper>
      );

      expect(screen.getByText(/no fields available/i)).toBeInTheDocument();
    });

    it('should render custom empty state', () => {
      const customEmpty = <div>Custom empty message</div>;

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} fields={[]} empty={customEmpty} />
        </TestWrapper>
      );

      expect(screen.getByText('Custom empty message')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} loading={true} />
        </TestWrapper>
      );

      // Should show skeleton loaders
      expect(screen.getAllByRole('listitem')).toHaveLength(10);
    });

    it('should render field items', () => {
      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('field_0')).toBeInTheDocument();
      expect(screen.getByText('field_1')).toBeInTheDocument();
    });
  });

  describe('Field Item Rendering', () => {
    it('should display field information', () => {
      const field = createMockField('test', {
        field_name: 'test_field',
        field_type: 'number',
        display_order: 5,
        is_required: true,
        help_text: 'Test help text',
      });

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} fields={[field]} />
        </TestWrapper>
      );

      expect(screen.getByText('test_field')).toBeInTheDocument();
      expect(screen.getByText(/number.*Order: 5.*Required/)).toBeInTheDocument();
      expect(screen.getByText('Test help text')).toBeInTheDocument();
    });

    it('should handle fields without help text', () => {
      const field = createMockField('test', {
        field_name: 'test_field',
        help_text: null,
      });

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} fields={[field]} />
        </TestWrapper>
      );

      expect(screen.getByText('test_field')).toBeInTheDocument();
      expect(screen.queryByText('Test help text')).not.toBeInTheDocument();
    });

    it('should show selected state', () => {
      const selectedIds = new Set(['0']);

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} selectedFieldIds={selectedIds} />
        </TestWrapper>
      );

      const firstItem = screen.getByText('field_0').closest('[role="listitem"]');
      expect(firstItem).toHaveClass('Mui-selected');
    });

    it('should render edit and delete buttons', () => {
      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getAllByText('Edit')).toHaveLength(10);
      expect(screen.getAllByText('Delete')).toHaveLength(10);
    });
  });

  describe('User Interactions', () => {
    it('should handle field selection', () => {
      const onFieldSelect = jest.fn();

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} onFieldSelect={onFieldSelect} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('field_0'));

      expect(onFieldSelect).toHaveBeenCalledWith(mockFields[0]);
    });

    it('should handle field edit', () => {
      const onFieldEdit = jest.fn();

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} onFieldEdit={onFieldEdit} />
        </TestWrapper>
      );

      fireEvent.click(screen.getAllByText('Edit')[0]);

      expect(onFieldEdit).toHaveBeenCalledWith(mockFields[0]);
    });

    it('should handle field delete', () => {
      const onFieldDelete = jest.fn();

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} onFieldDelete={onFieldDelete} />
        </TestWrapper>
      );

      fireEvent.click(screen.getAllByText('Delete')[0]);

      expect(onFieldDelete).toHaveBeenCalledWith(mockFields[0]);
    });

    it('should prevent event propagation for edit/delete buttons', () => {
      const onFieldSelect = jest.fn();
      const onFieldEdit = jest.fn();

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} onFieldSelect={onFieldSelect} onFieldEdit={onFieldEdit} />
        </TestWrapper>
      );

      fireEvent.click(screen.getAllByText('Edit')[0]);

      expect(onFieldEdit).toHaveBeenCalled();
      expect(onFieldSelect).not.toHaveBeenCalled();
    });
  });

  describe('Virtual Scrolling', () => {
    it('should use virtual scrolling for large datasets', () => {
      const largeDataset = mockFields; // 100 items

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} fields={largeDataset} />
        </TestWrapper>
      );

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('should use regular list for small datasets', () => {
      // Mock config to disable virtual scrolling for small datasets
      jest.doMock('../../config/schemaConfig', () => ({
        useSchemaConfig: () => ({
          config: {
            performance: {
              enableVirtualScrolling: true,
              virtualScrollThreshold: 50,
            },
          },
        }),
      }));

      const smallDataset = mockFields.slice(0, 10);

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} fields={smallDataset} />
        </TestWrapper>
      );

      // With small dataset, should render regular list
      expect(screen.getAllByRole('listitem')).toHaveLength(10);
    });

    it('should handle scroll events', () => {
      const onScroll = jest.fn();

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} onScroll={onScroll} />
        </TestWrapper>
      );

      const virtualList = screen.getByTestId('virtual-list');
      fireEvent.scroll(virtualList, { target: { scrollTop: 100 } });

      expect(onScroll).toHaveBeenCalledWith(100);
    });

    it('should show scrolling indicator', () => {
      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} />
        </TestWrapper>
      );

      const virtualList = screen.getByTestId('virtual-list');

      // Simulate scroll start
      fireEvent.scroll(virtualList, { target: { scrollTop: 100 } });

      // Should show scrolling indicator
      waitFor(() => {
        expect(screen.getByText('Scrolling...')).toBeInTheDocument();
      });
    });

    it('should expose scroll to field function', () => {
      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} />
        </TestWrapper>
      );

      // The component should expose scrollToField on window
      expect((window as any).scrollToField).toBeDefined();

      // Test scrolling to a field
      act(() => {
        (window as any).scrollToField('5');
      });

      expect(mockScrollToItem).toHaveBeenCalledWith(5, 'center');
    });
  });

  describe('Custom Rendering', () => {
    it('should use custom field renderer', () => {
      const customRenderer = jest.fn((field, index) => (
        <div key={field.id}>Custom field {field.field_name}</div>
      ));

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} renderField={customRenderer} />
        </TestWrapper>
      );

      expect(screen.getByText('Custom field field_0')).toBeInTheDocument();
      expect(customRenderer).toHaveBeenCalledWith(mockFields[0], 0);
    });
  });

  describe('Performance Optimizations', () => {
    it('should memoize field items', () => {
      const { rerender } = render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} />
        </TestWrapper>
      );

      const firstRender = screen.getByText('field_0').closest('[role="listitem"]');

      // Re-render with same props
      rerender(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} />
        </TestWrapper>
      );

      const secondRender = screen.getByText('field_0').closest('[role="listitem"]');

      // Should be the same element due to memoization
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when field data changes', () => {
      const { rerender } = render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('field_0')).toBeInTheDocument();

      // Change field data
      const updatedFields = [
        { ...mockFields[0], field_name: 'updated_field_0' },
        ...mockFields.slice(1, 10),
      ];

      rerender(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} fields={updatedFields} />
        </TestWrapper>
      );

      expect(screen.getByText('updated_field_0')).toBeInTheDocument();
      expect(screen.queryByText('field_0')).not.toBeInTheDocument();
    });

    it('should handle large datasets efficiently', async () => {
      const veryLargeDataset = Array.from({ length: 1000 }, (_, i) =>
        createMockField(i.toString())
      );

      const start = performance.now();

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} fields={veryLargeDataset} />
        </TestWrapper>
      );

      const end = performance.now();
      const renderTime = end - start;

      // Should render quickly even with large dataset
      expect(renderTime).toBeLessThan(100); // 100ms threshold
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} />
        </TestWrapper>
      );

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(10);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} />
        </TestWrapper>
      );

      const firstItem = screen.getByText('field_0').closest('[role="listitem"]') as HTMLElement;

      fireEvent.keyDown(firstItem, { key: 'Enter' });
      expect(defaultProps.onFieldSelect).toHaveBeenCalledWith(mockFields[0]);

      fireEvent.keyDown(firstItem, { key: ' ' });
      expect(defaultProps.onFieldSelect).toHaveBeenCalledTimes(2);
    });

    it('should have proper button labels', () => {
      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} />
        </TestWrapper>
      );

      const editButtons = screen.getAllByText('Edit');
      const deleteButtons = screen.getAllByText('Delete');

      expect(editButtons).toHaveLength(10);
      expect(deleteButtons).toHaveLength(10);

      editButtons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing field properties gracefully', () => {
      const incompleteField = {
        id: 'incomplete',
        schema_id: 'schema-123',
        field_name: 'incomplete_field',
        field_type: 'text',
        display_order: 1,
        is_required: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        // Missing help_text and validation_rules
      } as ComponentSchemaField;

      expect(() => {
        render(
          <TestWrapper>
            <VirtualFieldList {...defaultProps} fields={[incompleteField]} />
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByText('incomplete_field')).toBeInTheDocument();
    });

    it('should handle callback errors gracefully', () => {
      const throwingCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      render(
        <TestWrapper>
          <VirtualFieldList {...defaultProps} onFieldSelect={throwingCallback} />
        </TestWrapper>
      );

      expect(() => {
        fireEvent.click(screen.getByText('field_0'));
      }).not.toThrow();
    });
  });
});

describe('FieldItem Component', () => {
  const mockField = createMockField('test', {
    field_name: 'test_field',
    field_type: 'text',
    display_order: 1,
    is_required: true,
    help_text: 'Test help text',
  });

  const defaultProps = {
    field: mockField,
    index: 0,
    isSelected: false,
    onSelect: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render field information', () => {
    render(
      <TestWrapper>
        <FieldItem {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('test_field')).toBeInTheDocument();
    expect(screen.getByText(/text.*Order: 1.*Required/)).toBeInTheDocument();
    expect(screen.getByText('Test help text')).toBeInTheDocument();
  });

  it('should handle selected state', () => {
    render(
      <TestWrapper>
        <FieldItem {...defaultProps} isSelected={true} />
      </TestWrapper>
    );

    const listItem = screen.getByRole('listitem');
    expect(listItem).toHaveClass('Mui-selected');
  });

  it('should use custom renderer', () => {
    const customRenderer = jest.fn(() => <div>Custom content</div>);

    render(
      <TestWrapper>
        <FieldItem {...defaultProps} renderCustom={customRenderer} />
      </TestWrapper>
    );

    expect(screen.getByText('Custom content')).toBeInTheDocument();
    expect(customRenderer).toHaveBeenCalledWith(mockField, 0);
  });

  it('should apply custom styles', () => {
    const customStyle = { backgroundColor: 'red' };

    render(
      <TestWrapper>
        <FieldItem {...defaultProps} style={customStyle} />
      </TestWrapper>
    );

    const listItem = screen.getByRole('listitem');
    expect(listItem).toHaveStyle('background-color: red');
  });
});

describe('FieldItemSkeleton Component', () => {
  it('should render skeleton structure', () => {
    render(
      <TestWrapper>
        <FieldItemSkeleton />
      </TestWrapper>
    );

    const listItem = screen.getByRole('listitem');
    expect(listItem).toBeInTheDocument();

    // Should have skeleton elements
    const skeletons = listItem.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should apply custom styles', () => {
    const customStyle = { height: 100 };

    render(
      <TestWrapper>
        <FieldItemSkeleton style={customStyle} />
      </TestWrapper>
    );

    const listItem = screen.getByRole('listitem');
    expect(listItem).toHaveStyle('height: 100px');
  });
});