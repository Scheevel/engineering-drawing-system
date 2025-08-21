/**
 * Test suite for Story 1.2: Scope Effectiveness Metrics Display Component
 * Tests the frontend scope metrics display functionality
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import '@testing-library/jest-dom';

// Mock API response with scope counts
const mockSearchResponseWithScopeCounts = {
  query: 'beam',
  scope: ['piece_mark'],
  query_type: 'simple',
  results: [
    {
      id: '1',
      piece_mark: 'BEAM-W12-101',
      component_type: 'beam',
      description: 'Steel beam structure',
      quantity: 1,
      drawing_file_name: 'test.pdf',
      project_name: 'Test Project',
      confidence_score: 0.95,
      created_at: '2025-08-20T10:00:00Z',
      updated_at: '2025-08-20T10:00:00Z'
    }
  ],
  total: 1,
  page: 1,
  limit: 25,
  has_next: false,
  has_prev: false,
  search_time_ms: 45,
  filters_applied: {},
  scope_counts: {
    piece_mark: 1,
    component_type: 2,
    description: 2
  }
};

// Mock the API service
jest.mock('../services/api.ts', () => ({
  searchComponents: jest.fn(),
  getSearchSuggestions: jest.fn(() => Promise.resolve([])),
  getRecentComponents: jest.fn(() => Promise.resolve({ recent_components: [], total_available: 0 })),
  getComponentTypes: jest.fn(() => Promise.resolve({ component_types: [] })),
  getProjects: jest.fn(() => Promise.resolve([])),
  getSavedSearchesForProject: jest.fn(() => Promise.resolve({ searches: [] })),
  getSavedSearchCount: jest.fn(() => Promise.resolve({ remaining: 5, max_allowed: 10 })),
}));

// Import after mocking
import SearchPage from '../pages/SearchPage';
import { searchComponents } from '../services/api';

describe('Scope Effectiveness Metrics Display', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    // Reset mocks
    jest.clearAllMocks();
  });

  const renderSearchPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SearchPage />
      </QueryClientProvider>
    );
  };

  it('displays scope effectiveness metrics when search returns scope counts', async () => {
    // Mock successful search with scope counts
    (searchComponents as jest.Mock).mockResolvedValue(mockSearchResponseWithScopeCounts);

    renderSearchPage();

    // Type in search box to trigger search
    const searchInput = screen.getByLabelText(/search piece marks/i);
    fireEvent.change(searchInput, { target: { value: 'beam' } });

    // Wait for search results and scope metrics to appear
    await waitFor(() => {
      expect(screen.getByText(/Search Results/)).toBeInTheDocument();
    });

    // Check that scope effectiveness metrics are displayed
    expect(screen.getByText(/Scope Effectiveness/)).toBeInTheDocument();
    expect(screen.getByText(/Piece Marks \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Component Types \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Descriptions \(2\)/)).toBeInTheDocument();
  });

  it('highlights current search scope in metrics display', async () => {
    (searchComponents as jest.Mock).mockResolvedValue(mockSearchResponseWithScopeCounts);

    renderSearchPage();

    const searchInput = screen.getByLabelText(/search piece marks/i);
    fireEvent.change(searchInput, { target: { value: 'beam' } });

    await waitFor(() => {
      expect(screen.getByText(/Search Results/)).toBeInTheDocument();
    });

    // Current scope (piece_mark) should be highlighted/emphasized
    const currentScopeElement = screen.getByText(/Piece Marks \(1\)/);
    expect(currentScopeElement).toHaveClass('current-scope'); // Assuming we add this class
  });

  it('updates scope metrics when scope selection changes', async () => {
    (searchComponents as jest.Mock).mockResolvedValue(mockSearchResponseWithScopeCounts);

    renderSearchPage();

    // Open scope selection
    const scopeButton = screen.getByText(/Search Scope/);
    fireEvent.click(scopeButton);

    // Select component_type scope
    const componentTypeCheckbox = screen.getByLabelText(/Component Types/);
    fireEvent.click(componentTypeCheckbox);

    // Type search query
    const searchInput = screen.getByLabelText(/search piece marks/i);
    fireEvent.change(searchInput, { target: { value: 'beam' } });

    await waitFor(() => {
      expect(screen.getByText(/Search Results/)).toBeInTheDocument();
    });

    // Now component_type should be highlighted as current scope
    const newCurrentScope = screen.getByText(/Component Types \(2\)/);
    expect(newCurrentScope).toHaveClass('current-scope');
  });

  it('shows zero counts when no matches found', async () => {
    const noResultsResponse = {
      ...mockSearchResponseWithScopeCounts,
      results: [],
      total: 0,
      scope_counts: {
        piece_mark: 0,
        component_type: 0,
        description: 0
      }
    };

    (searchComponents as jest.Mock).mockResolvedValue(noResultsResponse);

    renderSearchPage();

    const searchInput = screen.getByLabelText(/search piece marks/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText(/No components found/)).toBeInTheDocument();
    });

    // Scope metrics should still be displayed with zero counts
    expect(screen.getByText(/Piece Marks \(0\)/)).toBeInTheDocument();
    expect(screen.getByText(/Component Types \(0\)/)).toBeInTheDocument();
    expect(screen.getByText(/Descriptions \(0\)/)).toBeInTheDocument();
  });

  it('gracefully handles missing scope_counts in API response', async () => {
    const responseWithoutScopeCounts = {
      ...mockSearchResponseWithScopeCounts,
      scope_counts: undefined
    };

    (searchComponents as jest.Mock).mockResolvedValue(responseWithoutScopeCounts);

    renderSearchPage();

    const searchInput = screen.getByLabelText(/search piece marks/i);
    fireEvent.change(searchInput, { target: { value: 'beam' } });

    await waitFor(() => {
      expect(screen.getByText(/Search Results/)).toBeInTheDocument();
    });

    // Should not crash and should not show scope metrics
    expect(screen.queryByText(/Scope Effectiveness/)).not.toBeInTheDocument();
  });

  it('displays metrics in compact format as specified in story', async () => {
    (searchComponents as jest.Mock).mockResolvedValue(mockSearchResponseWithScopeCounts);

    renderSearchPage();

    const searchInput = screen.getByLabelText(/search piece marks/i);
    fireEvent.change(searchInput, { target: { value: 'beam' } });

    await waitFor(() => {
      expect(screen.getByText(/Search Results/)).toBeInTheDocument();
    });

    // Check for compact format: "Piece Marks (23) | Types (15) | Descriptions (31)"
    const metricsText = screen.getByText(/Piece Marks \(1\) \| Component Types \(2\) \| Descriptions \(2\)/);
    expect(metricsText).toBeInTheDocument();
  });

  it('has proper accessibility attributes', async () => {
    (searchComponents as jest.Mock).mockResolvedValue(mockSearchResponseWithScopeCounts);

    renderSearchPage();

    const searchInput = screen.getByLabelText(/search piece marks/i);
    fireEvent.change(searchInput, { target: { value: 'beam' } });

    await waitFor(() => {
      expect(screen.getByText(/Search Results/)).toBeInTheDocument();
    });

    // Check for proper ARIA labels
    const scopeMetrics = screen.getByRole('region', { name: /scope effectiveness metrics/i });
    expect(scopeMetrics).toBeInTheDocument();
    expect(scopeMetrics).toHaveAttribute('aria-label', 'Scope effectiveness metrics showing result counts per search scope');
  });

  it('displays correctly on mobile and desktop layouts', async () => {
    (searchComponents as jest.Mock).mockResolvedValue(mockSearchResponseWithScopeCounts);

    // Test desktop layout
    renderSearchPage();
    
    const searchInput = screen.getByLabelText(/search piece marks/i);
    fireEvent.change(searchInput, { target: { value: 'beam' } });

    await waitFor(() => {
      expect(screen.getByText(/Search Results/)).toBeInTheDocument();
    });

    const metricsContainer = screen.getByTestId('scope-metrics-container');
    expect(metricsContainer).toHaveClass('desktop-layout');

    // Test mobile layout by changing viewport
    // Note: This would require additional setup for responsive testing
    // Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 600 });
    // window.dispatchEvent(new Event('resize'));
    // expect(metricsContainer).toHaveClass('mobile-layout');
  });
});

// Import fireEvent for user interactions
import { fireEvent } from '@testing-library/react';