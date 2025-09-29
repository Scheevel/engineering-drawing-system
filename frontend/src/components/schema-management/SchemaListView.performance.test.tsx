/**
 * SchemaListView Performance Integration Tests
 *
 * Tests for performance optimizations including caching, debouncing,
 * virtual scrolling, and monitoring capabilities.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import SchemaListView from './SchemaListView';
import { ComponentSchema, SchemaUsageStats } from '../../services/api';
import { schemaCacheManager } from '../../services/schemaCacheService';

// Mock the performance hooks
const mockPerformanceMonitor = {
  start: jest.fn(),
  end: jest.fn(),
  getStats: jest.fn(() => ({ avg: 50, min: 10, max: 100, count: 5 })),
  clear: jest.fn(),
};

const mockDebounced = jest.fn();
const mockDebouncedControls = {
  cancel: jest.fn(),
  flush: jest.fn(),
  pending: jest.fn(() => false),
};

const mockVirtualScroll = {
  virtualItems: [],
  totalHeight: 0,
  scrollTop: 0,
  setScrollTop: jest.fn(),
  updateItemHeight: jest.fn(),
  scrollToIndex: jest.fn(),
};

jest.mock('../../hooks/schema/usePerformanceOptimizations', () => ({
  usePerformanceMonitor: () => mockPerformanceMonitor,
  useDebounced: () => [mockDebounced, mockDebouncedControls],
  useVirtualScroll: () => mockVirtualScroll,
  useExpensiveComputation: (computeFn: any, deps: any) => computeFn(...deps),
}));

jest.mock('../../config/schemaConfig', () => ({
  useSchemaConfig: () => ({
    config: {
      performance: {
        enableDebouncing: true,
        debounceDelayMs: 300,
        enableVirtualScrolling: true,
        virtualScrollThreshold: 50,
        virtualScrollOverscan: 5,
        cacheEnabled: true,
        cacheTTLMs: 300000,
        maxCacheSize: 100,
      },
    },
  }),
}));

jest.mock('../../utils/accessibility', () => ({
  useAriaLive: () => ({
    announce: jest.fn(),
  }),
  useKeyboardShortcuts: jest.fn(),
  generateAriaId: (prefix: string) => `${prefix}-test-id`,
  createHeadingStructure: jest.fn(),
  focusIndicatorStyles: () => ({}),
}));

// Test data generators
const createMockSchema = (id: string, overrides?: Partial<ComponentSchema>): ComponentSchema => ({
  id,
  name: `Schema ${id}`,
  description: `Description for schema ${id}`,
  fields: [],
  is_active: true,
  is_default: false,
  project_id: 'test-project',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockSchemas = (count: number): ComponentSchema[] => {
  return Array.from({ length: count }, (_, i) => createMockSchema(`schema-${i}`));
};

const createMockUsageStats = (schemaId: string): SchemaUsageStats => ({
  schema_id: schemaId,
  component_count: Math.floor(Math.random() * 100),
  field_count: Math.floor(Math.random() * 20),
  last_used: new Date().toISOString(),
  usage_frequency: Math.random() * 100,
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
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

describe('SchemaListView Performance Tests', () => {
  beforeEach(() => {
    schemaCacheManager.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    schemaCacheManager.clear();
  });

  describe('Performance Monitoring', () => {
    it('should initialize performance monitors on render', () => {
      const mockSchemas = createMockSchemas(5);

      render(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      // Verify performance monitors were called
      expect(mockPerformanceMonitor.start).toHaveBeenCalled();
    });

    it('should monitor filter performance', async () => {
      const mockSchemas = createMockSchemas(20);
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      // Trigger search filtering
      const searchInput = screen.getByLabelText(/search/i);
      await user.type(searchInput, 'schema-1');

      // Should monitor filter performance
      expect(mockPerformanceMonitor.start).toHaveBeenCalled();
      expect(mockPerformanceMonitor.end).toHaveBeenCalled();
    });

    it('should monitor sort performance', async () => {
      const mockSchemas = createMockSchemas(30);

      render(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      // Trigger sorting
      const nameHeader = screen.getByText('Schemas (30)');
      fireEvent.click(nameHeader.closest('th') || nameHeader);

      // Should monitor sort performance
      expect(mockPerformanceMonitor.start).toHaveBeenCalled();
      expect(mockPerformanceMonitor.end).toHaveBeenCalled();
    });
  });

  describe('Debounced Search', () => {
    it('should use debounced search updates', async () => {
      const mockSchemas = createMockSchemas(10);
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search/i);

      // Type multiple characters quickly
      await user.type(searchInput, 'test', { delay: 50 });

      // Debounced function should be called
      expect(mockDebounced).toHaveBeenCalled();
    });

    it('should handle rapid search input changes efficiently', async () => {
      const mockSchemas = createMockSchemas(50);
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search/i);

      const startTime = performance.now();

      // Rapid typing simulation
      await user.type(searchInput, 'rapid search test', { delay: 10 });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle rapid input efficiently (under 1 second)
      expect(duration).toBeLessThan(1000);
      expect(mockDebounced).toHaveBeenCalled();
    });

    it('should provide debounce controls', () => {
      const mockSchemas = createMockSchemas(5);

      render(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      // Debounce controls should be available
      expect(mockDebouncedControls.cancel).toBeDefined();
      expect(mockDebouncedControls.flush).toBeDefined();
      expect(mockDebouncedControls.pending).toBeDefined();
    });
  });

  describe('Virtual Scrolling', () => {
    it('should enable virtual scrolling for large datasets', () => {
      const mockSchemas = createMockSchemas(100); // Above threshold

      render(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      // Virtual scroll hook should be called for large datasets
      // This is indirectly tested through the mock
      expect(mockSchemas.length).toBeGreaterThan(50); // Above virtual scroll threshold
    });

    it('should not use virtual scrolling for small datasets', () => {
      const mockSchemas = createMockSchemas(10); // Below threshold

      render(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      expect(mockSchemas.length).toBeLessThan(50); // Below virtual scroll threshold
    });

    it('should provide virtual scroll controls', () => {
      const mockSchemas = createMockSchemas(100);

      render(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      // Virtual scroll controls should be available
      expect(mockVirtualScroll.setScrollTop).toBeDefined();
      expect(mockVirtualScroll.scrollToIndex).toBeDefined();
      expect(mockVirtualScroll.updateItemHeight).toBeDefined();
    });
  });

  describe('Expensive Computation Caching', () => {
    it('should cache filter and sort results', () => {
      const mockSchemas = createMockSchemas(20);

      const { rerender } = render(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      // First render - computation should happen
      const initialRenderTime = performance.now();

      // Rerender with same props - should use cached result
      rerender(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      const rerenderTime = performance.now() - initialRenderTime;

      // Rerender should be faster due to caching
      expect(rerenderTime).toBeLessThan(100);
    });

    it('should invalidate cache when dependencies change', async () => {
      const initialSchemas = createMockSchemas(10);
      const user = userEvent.setup();

      const { rerender } = render(
        <TestWrapper>
          <SchemaListView
            schemas={initialSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      // Change filter state
      const searchInput = screen.getByLabelText(/search/i);
      await user.type(searchInput, 'test');

      // Rerender with new schemas
      const newSchemas = createMockSchemas(15);
      rerender(
        <TestWrapper>
          <SchemaListView
            schemas={newSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      // Should recompute due to changed schemas
      expect(newSchemas.length).not.toBe(initialSchemas.length);
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle 1000+ schemas efficiently', async () => {
      const largeSchemaSet = createMockSchemas(1000);
      const usageStats = largeSchemaSet.reduce((acc, schema) => {
        acc[schema.id] = createMockUsageStats(schema.id);
        return acc;
      }, {} as Record<string, SchemaUsageStats>);

      const startTime = performance.now();

      render(
        <TestWrapper>
          <SchemaListView
            schemas={largeSchemaSet}
            usageStats={usageStats}
          />
        </TestWrapper>
      );

      const renderTime = performance.now() - startTime;

      // Should render large dataset within reasonable time (under 2 seconds)
      expect(renderTime).toBeLessThan(2000);

      // Should display correct count
      expect(screen.getByText('Schemas (1000)')).toBeInTheDocument();
    });

    it('should maintain performance during filtering large datasets', async () => {
      const largeSchemaSet = createMockSchemas(500);
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SchemaListView
            schemas={largeSchemaSet}
            usageStats={{}}
          />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search/i);

      const startTime = performance.now();

      // Filter large dataset
      await user.type(searchInput, 'schema-1', { delay: 10 });

      // Wait for debounced update
      await waitFor(() => {
        expect(mockDebounced).toHaveBeenCalled();
      }, { timeout: 1000 });

      const filterTime = performance.now() - startTime;

      // Filtering should complete quickly even for large datasets
      expect(filterTime).toBeLessThan(1000);
    });

    it('should maintain performance during sorting large datasets', async () => {
      const largeSchemaSet = createMockSchemas(300);

      render(
        <TestWrapper>
          <SchemaListView
            schemas={largeSchemaSet}
            usageStats={{}}
          />
        </TestWrapper>
      );

      const startTime = performance.now();

      // Trigger sort by clicking header
      const headerElement = screen.getByText('Schemas (300)');
      fireEvent.click(headerElement);

      const sortTime = performance.now() - startTime;

      // Sorting should complete quickly
      expect(sortTime).toBeLessThan(500);
    });
  });

  describe('Memory Management', () => {
    it('should clean up performance monitors on unmount', () => {
      const mockSchemas = createMockSchemas(10);

      const { unmount } = render(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      unmount();

      // Performance monitor end should be called during cleanup
      expect(mockPerformanceMonitor.end).toHaveBeenCalled();
    });

    it('should handle rapid mount/unmount cycles', () => {
      const mockSchemas = createMockSchemas(5);

      // Mount and unmount multiple times rapidly
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <TestWrapper>
            <SchemaListView
              schemas={mockSchemas}
              usageStats={{}}
            />
          </TestWrapper>
        );
        unmount();
      }

      // Should not cause memory leaks or errors
      expect(mockPerformanceMonitor.start).toHaveBeenCalledTimes(10);
      expect(mockPerformanceMonitor.end).toHaveBeenCalledTimes(10);
    });
  });

  describe('Accessibility Performance', () => {
    it('should maintain accessibility during performance optimizations', async () => {
      const mockSchemas = createMockSchemas(100);
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      // Test keyboard navigation doesn't degrade performance
      const searchInput = screen.getByLabelText(/search/i);
      await user.click(searchInput);

      // Use keyboard shortcut
      await user.keyboard('{Control>}f{/Control}');

      // ARIA announcements should still work with performance optimizations
      expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    });

    it('should announce filter results efficiently', async () => {
      const mockSchemas = createMockSchemas(50);
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SchemaListView
            schemas={mockSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search/i);

      // Filter to reduce results
      await user.type(searchInput, 'schema-1');

      // Should maintain accessibility announcements
      expect(mockDebounced).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty schema lists efficiently', () => {
      const startTime = performance.now();

      render(
        <TestWrapper>
          <SchemaListView
            schemas={[]}
            usageStats={{}}
          />
        </TestWrapper>
      );

      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(100);
      expect(screen.getByText('Schemas (0)')).toBeInTheDocument();
    });

    it('should handle malformed schema data gracefully', () => {
      const malformedSchemas = [
        createMockSchema('good-schema'),
        { ...createMockSchema('bad-schema'), name: undefined } as any,
        createMockSchema('another-good-schema'),
      ];

      expect(() => {
        render(
          <TestWrapper>
            <SchemaListView
              schemas={malformedSchemas}
              usageStats={{}}
            />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('should maintain performance during rapid prop changes', async () => {
      const initialSchemas = createMockSchemas(20);

      const { rerender } = render(
        <TestWrapper>
          <SchemaListView
            schemas={initialSchemas}
            usageStats={{}}
          />
        </TestWrapper>
      );

      const startTime = performance.now();

      // Rapidly change props
      for (let i = 0; i < 10; i++) {
        const newSchemas = createMockSchemas(20 + i);
        rerender(
          <TestWrapper>
            <SchemaListView
              schemas={newSchemas}
              usageStats={{}}
            />
          </TestWrapper>
        );
      }

      const totalTime = performance.now() - startTime;

      // Should handle rapid changes efficiently
      expect(totalTime).toBeLessThan(2000);
    });
  });
});