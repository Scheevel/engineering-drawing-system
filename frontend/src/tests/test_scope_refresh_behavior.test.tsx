/**
 * Test-Driven Development: Search Scope Refresh Behavior Tests
 * 
 * These tests define the expected behavior when users change search scope.
 * Tests should FAIL initially, then we fix the implementation to make them pass.
 * 
 * User Issue: When changing scope, search results are not properly refreshing
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import SearchPage from '../pages/SearchPage';

// Mock the API functions
jest.mock('../services/api', () => ({
  searchComponents: jest.fn(),
  getSearchSuggestions: jest.fn(() => Promise.resolve([])),
  getRecentComponents: jest.fn(() => Promise.resolve({ recent_components: [], total_available: 0 })),
  getComponentTypes: jest.fn(() => Promise.resolve([])),
  getProjects: jest.fn(() => Promise.resolve([])),
  getSavedSearchesForProject: jest.fn(() => Promise.resolve(null)),
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
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

// Mock search results for different scopes
const mockPieceMarkResults = [
  { id: '1', piece_mark: 'A201', component_type: 'generic', description: 'Test component 1' },
  { id: '2', piece_mark: 'A4', component_type: 'generic', description: 'Test component 2' },
];

const mockComponentTypeResults = [
  { id: '3', piece_mark: 'B150', component_type: 'beam', description: 'Beam component 1' },
  { id: '4', piece_mark: 'C75', component_type: 'column', description: 'Column component 1' },
];

describe('Search Scope Refresh Behavior', () => {
  let mockSearchComponents: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const { searchComponents } = require('../services/api');
    mockSearchComponents = searchComponents;
  });

  describe('Scope Change Triggers New Search', () => {
    test('should trigger new API call when scope changes from piece_mark to component_type', async () => {
      // Setup mock to return different results based on scope
      mockSearchComponents.mockImplementation((params: any) => {
        if (params.scope.includes('piece_mark') && !params.scope.includes('component_type')) {
          return Promise.resolve({ results: mockPieceMarkResults, total: 2 });
        }
        if (params.scope.includes('component_type') && !params.scope.includes('piece_mark')) {
          return Promise.resolve({ results: mockComponentTypeResults, total: 2 });
        }
        return Promise.resolve({ results: [], total: 0 });
      });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Enter search query
      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Wait for initial search with default piece_mark scope
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'test',
            scope: ['piece_mark'],
          })
        );
      });

      // Clear previous calls
      mockSearchComponents.mockClear();

      // Change scope to component_type
      const pieceMarkCheckbox = screen.getByLabelText(/piece marks/i);
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);
      
      fireEvent.click(pieceMarkCheckbox); // Uncheck piece_mark
      fireEvent.click(componentTypeCheckbox); // Check component_type

      // Should trigger new search with component_type scope
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'test',
            scope: ['component_type'],
          })
        );
      });

      // Should be called exactly once for the scope change
      expect(mockSearchComponents).toHaveBeenCalledTimes(1);
    });

    test('should reset to page 1 when scope changes', async () => {
      mockSearchComponents.mockResolvedValue({ results: mockPieceMarkResults, total: 50 });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Enter search query and wait for results
      const searchInput = screen.getByPlaceholderText(/search for components/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1 })
        );
      });

      // Simulate being on page 2 (this would normally happen via load more)
      // For this test, we'll change scope and verify page resets to 1
      mockSearchComponents.mockClear();

      // Change scope
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);
      fireEvent.click(componentTypeCheckbox);

      // Should call API with page: 1 after scope change
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1 })
        );
      });
    });
  });

  describe('Results Update When Scope Changes', () => {
    test('should display different results when scope changes', async () => {
      // Setup mock to return different results based on scope
      mockSearchComponents.mockImplementation((params: any) => {
        if (params.scope.includes('piece_mark')) {
          return Promise.resolve({ results: mockPieceMarkResults, total: 2 });
        }
        if (params.scope.includes('component_type')) {
          return Promise.resolve({ results: mockComponentTypeResults, total: 2 });
        }
        return Promise.resolve({ results: [], total: 0 });
      });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Enter search query
      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Wait for piece_mark results to appear
      await waitFor(() => {
        expect(screen.getByText('A201')).toBeInTheDocument();
        expect(screen.getByText('A4')).toBeInTheDocument();
      });

      // Verify component_type results are not displayed
      expect(screen.queryByText('B150')).not.toBeInTheDocument();
      expect(screen.queryByText('C75')).not.toBeInTheDocument();

      // Change scope to component_type only
      const pieceMarkCheckbox = screen.getByLabelText(/piece marks/i);
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);
      
      fireEvent.click(pieceMarkCheckbox); // Uncheck piece_mark
      fireEvent.click(componentTypeCheckbox); // Check component_type

      // Wait for component_type results to appear
      await waitFor(() => {
        expect(screen.getByText('B150')).toBeInTheDocument();
        expect(screen.getByText('C75')).toBeInTheDocument();
      });

      // Verify piece_mark results are no longer displayed
      expect(screen.queryByText('A201')).not.toBeInTheDocument();
      expect(screen.queryByText('A4')).not.toBeInTheDocument();
    });

    test('should clear results immediately when scope changes before new results load', async () => {
      let resolveSearch: (value: any) => void;
      const searchPromise = new Promise(resolve => {
        resolveSearch = resolve;
      });

      mockSearchComponents.mockReturnValue(searchPromise);

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Enter search query and let initial results load
      const searchInput = screen.getByPlaceholderText(/search for components/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Resolve initial search
      resolveSearch!({ results: mockPieceMarkResults, total: 2 });

      await waitFor(() => {
        expect(screen.getByText('A201')).toBeInTheDocument();
      });

      // Setup new promise for scope change
      const newSearchPromise = new Promise(() => {}); // Never resolves
      mockSearchComponents.mockReturnValue(newSearchPromise);

      // Change scope - should immediately clear existing results
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);
      fireEvent.click(componentTypeCheckbox);

      // Results should be cleared immediately (before new search completes)
      await waitFor(() => {
        expect(screen.queryByText('A201')).not.toBeInTheDocument();
        expect(screen.queryByText('A4')).not.toBeInTheDocument();
      });
    });
  });

  describe('Multiple Scope Selection', () => {
    test('should search across multiple scopes when multiple are selected', async () => {
      const multiScopeResults = [
        ...mockPieceMarkResults,
        ...mockComponentTypeResults,
      ];

      mockSearchComponents.mockImplementation((params: any) => {
        if (params.scope.length === 2 && 
            params.scope.includes('piece_mark') && 
            params.scope.includes('component_type')) {
          return Promise.resolve({ results: multiScopeResults, total: 4 });
        }
        return Promise.resolve({ results: [], total: 0 });
      });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Enter search query
      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Enable both piece_mark and component_type
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);
      fireEvent.click(componentTypeCheckbox);

      // Should call API with both scopes
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: expect.arrayContaining(['piece_mark', 'component_type']),
          })
        );
      });

      // Should display results from both scopes
      await waitFor(() => {
        expect(screen.getByText('A201')).toBeInTheDocument(); // From piece_mark
        expect(screen.getByText('B150')).toBeInTheDocument(); // From component_type
      });
    });
  });

  describe('Edge Cases', () => {
    test('should maintain piece_mark scope when user tries to unselect all scopes', async () => {
      mockSearchComponents.mockResolvedValue({ results: mockPieceMarkResults, total: 2 });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Enter search query
      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Try to uncheck piece_mark (the only selected scope)
      const pieceMarkCheckbox = screen.getByLabelText(/piece marks/i) as HTMLInputElement;
      fireEvent.click(pieceMarkCheckbox);

      // piece_mark should remain checked (forced by validation)
      expect(pieceMarkCheckbox.checked).toBe(true);

      // Should still search with piece_mark scope
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({ scope: ['piece_mark'] })
        );
      });
    });

    test('should handle rapid scope changes without race conditions', async () => {
      let callCount = 0;
      mockSearchComponents.mockImplementation((params: any) => {
        callCount++;
        return Promise.resolve({ 
          results: params.scope.includes('piece_mark') ? mockPieceMarkResults : mockComponentTypeResults, 
          total: 2 
        });
      });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Enter search query
      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Rapidly change scopes
      const pieceMarkCheckbox = screen.getByLabelText(/piece marks/i);
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);
      
      fireEvent.click(componentTypeCheckbox); // Add component_type
      fireEvent.click(pieceMarkCheckbox);     // Remove piece_mark
      fireEvent.click(pieceMarkCheckbox);     // Add piece_mark back
      fireEvent.click(componentTypeCheckbox); // Remove component_type

      // Should eventually settle with correct results
      await waitFor(() => {
        expect(screen.getByText('A201')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should have made multiple API calls
      expect(callCount).toBeGreaterThan(1);
    });
  });
});

/**
 * Performance Tests for Scope Changes
 */
describe('Search Scope Refresh Performance', () => {
  test('should debounce scope changes to avoid excessive API calls', async () => {
    const mockSearchComponents = require('../services/api').searchComponents;
    let callCount = 0;
    mockSearchComponents.mockImplementation(() => {
      callCount++;
      return Promise.resolve({ results: [], total: 0 });
    });

    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>
    );

    // Enter search query
    const searchInput = screen.getByPlaceholderText(/search for components/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Rapidly toggle scope multiple times
    const componentTypeCheckbox = screen.getByLabelText(/component types/i);
    for (let i = 0; i < 5; i++) {
      fireEvent.click(componentTypeCheckbox);
    }

    // Wait for debouncing
    await waitFor(() => {
      expect(callCount).toBeLessThan(10); // Should not call API for every single change
    });
  });
});