/**
 * TDD Test Suite: Search Instance Identifier Integration
 * Story 1.4 Task 4: Search UI Integration for Multiple Piece Mark Instances
 * 
 * User Story: As an engineer searching for components, I want the search functionality 
 * to support finding and filtering by instance_identifier, so that I can locate specific 
 * instances of piece marks (e.g., "G1-A" vs "G1-B") across drawings.
 * 
 * Task 4 Acceptance Criteria:
 * 1. Search forms include instance_identifier filter input
 * 2. Search results display shows instance differentiation (G1-A format)
 * 3. Search result cards/listings include instance_identifier
 * 4. Advanced search supports instance_identifier options
 * 5. UI handles various instance_identifier scenarios
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import SearchPage from '../pages/SearchPage';

// Test data with instance_identifier support
const MOCK_COMPONENTS_WITH_INSTANCES = [
  {
    id: '1',
    piece_mark: 'G1',
    instance_identifier: 'A',
    component_type: 'girder',
    description: 'Main girder instance A',
    confidence: 0.95,
    drawing_id: 'drawing-1',
    drawing_file_name: 'sheet-01.pdf',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2', 
    piece_mark: 'G1',
    instance_identifier: 'B',
    component_type: 'girder',
    description: 'Main girder instance B',
    confidence: 0.94,
    drawing_id: 'drawing-1',
    drawing_file_name: 'sheet-01.pdf',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '3',
    piece_mark: 'G1', 
    instance_identifier: null,
    component_type: 'girder',
    description: 'Legacy girder without instance',
    confidence: 0.93,
    drawing_id: 'drawing-2',
    drawing_file_name: 'sheet-02.pdf', 
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z'
  },
  {
    id: '4',
    piece_mark: 'B2',
    instance_identifier: 'A', 
    component_type: 'brace',
    description: 'Brace instance A',
    confidence: 0.92,
    drawing_id: 'drawing-1',
    drawing_file_name: 'sheet-01.pdf',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  }
];

// Mock API with instance_identifier support
const createInstanceIdentifierMock = () => {
  return jest.fn((params: any) => {
    console.log('🔍 API called with params:', {
      query: params.query,
      instance_identifier: params.instance_identifier,
      scope: params.scope
    });

    let filteredResults = [...MOCK_COMPONENTS_WITH_INSTANCES];

    // Apply instance_identifier filtering if provided
    if (params.instance_identifier && params.instance_identifier.trim() !== '') {
      filteredResults = filteredResults.filter(component => 
        component.instance_identifier === params.instance_identifier
      );
      console.log(`📋 Filtered by instance_identifier '${params.instance_identifier}': ${filteredResults.length} results`);
    }

    return Promise.resolve({
      results: filteredResults,
      total: filteredResults.length,
      search_time_ms: 25,
      filters_applied: {
        query: params.query,
        instance_identifier: params.instance_identifier || null,
        scope: params.scope
      }
    });
  });
};

let mockSearchComponents: jest.Mock;

jest.mock('../services/api', () => ({
  searchComponents: jest.fn(),
  getSearchSuggestions: jest.fn(() => Promise.resolve([])),
  getRecentComponents: jest.fn(() => Promise.resolve({ recent_components: [], total_available: 0 })),
  getComponentTypes: jest.fn(() => Promise.resolve({ component_types: [] })),
  getProjects: jest.fn(() => Promise.resolve([])),
  getSavedSearchesForProject: jest.fn(() => Promise.resolve(null)),
  getSavedSearchCount: jest.fn(() => Promise.resolve({ remaining: 10, max_allowed: 10 })),
  createSavedSearch: jest.fn(() => Promise.resolve({})),
  deleteSavedSearch: jest.fn(() => Promise.resolve({})),
  executeSavedSearch: jest.fn(() => Promise.resolve({})),
}));

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

describe('TDD: Search Instance Identifier Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { searchComponents } = require('../services/api');
    mockSearchComponents = searchComponents;
    mockSearchComponents.mockImplementation(createInstanceIdentifierMock());
  });

  describe('Task 4.1: Instance Identifier Filter Input', () => {
    test('UI-II-001: Should render instance_identifier filter input field', async () => {
      console.log('🧪 TDD TEST: Instance identifier filter input rendering');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Should have an instance_identifier filter input
      const instanceFilterInput = screen.getByLabelText(/instance identifier/i);
      expect(instanceFilterInput).toBeInTheDocument();
      expect(instanceFilterInput).toHaveAttribute('type', 'text');
      expect(instanceFilterInput).toHaveAttribute('maxLength', '10'); // Per story validation

      console.log('✅ Instance identifier filter input rendered');
    });

    test('UI-II-002: Should accept instance_identifier input and trigger search', async () => {
      console.log('🧪 TDD TEST: Instance identifier input triggers search');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      const instanceInput = screen.getByLabelText(/instance identifier/i);

      // Enter search query first
      fireEvent.change(searchInput, { target: { value: 'G1' } });
      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      mockSearchComponents.mockClear();

      // Enter instance identifier
      fireEvent.change(instanceInput, { target: { value: 'A' } });

      // Should trigger new search with instance_identifier parameter
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'G1',
            instance_identifier: 'A'
          })
        );
      });

      console.log('✅ Instance identifier input triggers filtered search');
    });

    test('UI-II-003: Should clear instance_identifier filter when input is cleared', async () => {
      console.log('🧪 TDD TEST: Clear instance identifier filter');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      const instanceInput = screen.getByLabelText(/instance identifier/i);

      // Set up initial search with instance filter
      fireEvent.change(searchInput, { target: { value: 'G1' } });
      fireEvent.change(instanceInput, { target: { value: 'A' } });

      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());
      mockSearchComponents.mockClear();

      // Clear instance identifier
      fireEvent.change(instanceInput, { target: { value: '' } });

      // Should search without instance_identifier filter
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'G1',
            instance_identifier: undefined
          })
        );
      });

      console.log('✅ Clearing instance identifier removes filter');
    });
  });

  describe('Task 4.2: Instance Differentiation Display', () => {
    test('UI-II-004: Should display components with instance identifier in G1-A format', async () => {
      console.log('🧪 TDD TEST: Display format for components with instance identifier');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'G1' } });

      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      // Should display G1-A and G1-B format for components with instance_identifier
      await waitFor(() => {
        expect(screen.getByText('G1-A')).toBeInTheDocument();
        expect(screen.getByText('G1-B')).toBeInTheDocument();
      });

      // Should display just G1 for component without instance_identifier
      await waitFor(() => {
        // Look for G1 without instance (legacy component)
        const g1Elements = screen.getAllByText(/^G1$/);
        expect(g1Elements.length).toBeGreaterThan(0);
      });

      console.log('✅ Components display in correct format: G1-A, G1-B, G1');
    });

    test('UI-II-005: Should differentiate between multiple instances of same piece mark', async () => {
      console.log('🧪 TDD TEST: Visual differentiation of multiple instances');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'G1' } });

      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      // Should show all three G1 variations as distinct entries
      await waitFor(() => {
        const allRows = screen.getAllByRole('row');
        // Should have at least 4 rows: header + 3 G1 variants (A, B, legacy)
        expect(allRows.length).toBeGreaterThanOrEqual(4);

        // Each instance should be clearly differentiated
        expect(screen.getByText('G1-A')).toBeInTheDocument();
        expect(screen.getByText('G1-B')).toBeInTheDocument();
        
        // Verify descriptions are different to show they're distinct components
        expect(screen.getByText(/instance A/)).toBeInTheDocument();
        expect(screen.getByText(/instance B/)).toBeInTheDocument();
        expect(screen.getByText(/Legacy girder/)).toBeInTheDocument();
      });

      console.log('✅ Multiple instances clearly differentiated in UI');
    });
  });

  describe('Task 4.3: Search Result Cards/Listings', () => {
    test('UI-II-006: Should include instance_identifier in search result data', async () => {
      console.log('🧪 TDD TEST: Instance identifier in search results');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'G1' } });

      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      // Search results should include instance_identifier information
      await waitFor(() => {
        // Check that results table includes instance data
        const resultsTable = screen.getByRole('table');
        expect(resultsTable).toBeInTheDocument();

        // Should display instance identifiers where they exist
        expect(screen.getByText('G1-A')).toBeInTheDocument();
        expect(screen.getByText('G1-B')).toBeInTheDocument();
      });

      console.log('✅ Search results display instance identifier information');
    });

    test('UI-II-007: Should handle mixed scenarios (with and without instance_identifier)', async () => {
      console.log('🧪 TDD TEST: Mixed instance identifier scenarios');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'test' } }); // Search for all components

      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      await waitFor(() => {
        // Should display both types correctly:
        // - Components with instance: G1-A, G1-B, B2-A
        expect(screen.getByText('G1-A')).toBeInTheDocument();
        expect(screen.getByText('G1-B')).toBeInTheDocument(); 
        expect(screen.getByText('B2-A')).toBeInTheDocument();

        // - Components without instance: G1
        const g1NoInstance = screen.getByText(/Legacy girder/);
        expect(g1NoInstance).toBeInTheDocument();
      });

      console.log('✅ Mixed scenarios handled correctly');
    });
  });

  describe('Task 4.4: Advanced Search Interface', () => {
    test('UI-II-008: Should include instance_identifier in advanced search options', async () => {
      console.log('🧪 TDD TEST: Advanced search instance identifier support');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Look for advanced search interface (this may need to be triggered)
      // Assuming there's an advanced search button or link
      const advancedSearchButton = screen.queryByText(/advanced search/i);
      
      if (advancedSearchButton) {
        fireEvent.click(advancedSearchButton);

        // Should have instance_identifier field in advanced search
        const advancedInstanceInput = screen.getByLabelText(/instance identifier/i);
        expect(advancedInstanceInput).toBeInTheDocument();
      } else {
        // If advanced search is part of the main form, check for the instance field
        const instanceInput = screen.getByLabelText(/instance identifier/i);
        expect(instanceInput).toBeInTheDocument();
      }

      console.log('✅ Advanced search supports instance identifier');
    });

    test('UI-II-009: Should support combined filters (piece_mark + instance_identifier)', async () => {
      console.log('🧪 TDD TEST: Combined piece mark and instance filtering');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      const instanceInput = screen.getByLabelText(/instance identifier/i);

      // Search for specific piece mark with specific instance
      fireEvent.change(searchInput, { target: { value: 'G1' } });
      fireEvent.change(instanceInput, { target: { value: 'A' } });

      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'G1',
            instance_identifier: 'A'
          })
        );
      });

      // Should return only G1-A
      await waitFor(() => {
        expect(screen.getByText('G1-A')).toBeInTheDocument();
        expect(screen.queryByText('G1-B')).not.toBeInTheDocument();
      });

      console.log('✅ Combined filtering works correctly');
    });
  });

  describe('Task 4.5: Various Instance Identifier Scenarios', () => {
    test('UI-II-010: Should handle search for non-existent instance identifier', async () => {
      console.log('🧪 TDD TEST: Non-existent instance identifier');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      const instanceInput = screen.getByLabelText(/instance identifier/i);

      fireEvent.change(searchInput, { target: { value: 'G1' } });
      fireEvent.change(instanceInput, { target: { value: 'Z' } }); // Non-existent

      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      // Should show no results message
      await waitFor(() => {
        const noResultsMessage = screen.getByText(/no components found/i) || 
                                 screen.getByText(/no results/i) ||
                                 screen.queryByText('0 results');
        expect(noResultsMessage).toBeInTheDocument();
      });

      console.log('✅ Non-existent instance identifier handled gracefully');
    });

    test('UI-II-011: Should validate instance identifier input length', async () => {
      console.log('🧪 TDD TEST: Instance identifier validation');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const instanceInput = screen.getByLabelText(/instance identifier/i);

      // Try to enter more than 10 characters (should be limited)
      const longInstance = 'ABCDEFGHIJK'; // 11 characters
      fireEvent.change(instanceInput, { target: { value: longInstance } });

      // Input should be limited to 10 characters
      expect(instanceInput).toHaveValue(longInstance.substring(0, 10));

      console.log('✅ Instance identifier length validation works');
    });

    test('UI-II-012: Should show appropriate loading states during instance search', async () => {
      console.log('🧪 TDD TEST: Loading states for instance identifier search');

      // Mock slow API response to test loading state
      mockSearchComponents.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            results: MOCK_COMPONENTS_WITH_INSTANCES.slice(0, 1),
            total: 1,
            search_time_ms: 500
          }), 100)
        )
      );

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      const instanceInput = screen.getByLabelText(/instance identifier/i);

      fireEvent.change(searchInput, { target: { value: 'G1' } });
      fireEvent.change(instanceInput, { target: { value: 'A' } });

      // Should show loading indicator
      expect(screen.getByText(/searching/i) || screen.getByRole('progressbar')).toBeInTheDocument();

      // Wait for results
      await waitFor(() => {
        expect(screen.queryByText(/searching/i)).not.toBeInTheDocument();
      });

      console.log('✅ Loading states displayed correctly');
    });

    test('UI-II-013: Should clear results when switching between instance filters', async () => {
      console.log('🧪 TDD TEST: Result updates when switching instance filters');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      const instanceInput = screen.getByLabelText(/instance identifier/i);

      // Initial search
      fireEvent.change(searchInput, { target: { value: 'G1' } });
      fireEvent.change(instanceInput, { target: { value: 'A' } });

      await waitFor(() => {
        expect(screen.getByText('G1-A')).toBeInTheDocument();
      });

      mockSearchComponents.mockClear();

      // Switch to different instance
      fireEvent.change(instanceInput, { target: { value: 'B' } });

      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({
            instance_identifier: 'B'
          })
        );
      });

      // Results should update
      await waitFor(() => {
        expect(screen.getByText('G1-B')).toBeInTheDocument();
        expect(screen.queryByText('G1-A')).not.toBeInTheDocument();
      });

      console.log('✅ Results update correctly when switching instance filters');
    });

    test('UI-II-014: Should display filters applied including instance_identifier', async () => {
      console.log('🧪 TDD TEST: Display applied filters including instance identifier');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      const instanceInput = screen.getByLabelText(/instance identifier/i);

      fireEvent.change(searchInput, { target: { value: 'G1' } });
      fireEvent.change(instanceInput, { target: { value: 'A' } });

      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      // Should show applied filters including instance_identifier
      await waitFor(() => {
        const filtersSection = screen.getByText(/filters applied/i) || 
                             screen.getByText(/active filters/i) ||
                             screen.getByText(/Instance: A/i);
        expect(filtersSection).toBeInTheDocument();
      });

      console.log('✅ Applied filters display includes instance identifier');
    });
  });
});

/**
 * TDD Development Notes for Implementation
 * 
 * To make these tests pass, the following UI changes are needed:
 * 
 * 1. Add instance_identifier input field to SearchPage
 * 2. Update search form to include instance_identifier in API calls
 * 3. Modify SearchResultRow component to display G1-A format
 * 4. Update search results table to show instance differentiation
 * 5. Add instance_identifier to advanced search options
 * 6. Implement proper validation and error handling
 * 7. Add loading states for instance identifier searches
 * 8. Show applied filters including instance_identifier
 * 
 * Implementation Priority:
 * 1. Add instance_identifier input to search form
 * 2. Update API integration to pass instance_identifier parameter
 * 3. Modify result display formatting for G1-A style
 * 4. Add validation and edge case handling
 */